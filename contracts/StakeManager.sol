/**
 * @title StakeManager
 * @dev A contract that manages staking functionality for participants in a staking protocol.
 */
// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";

import "./intefaces/IStakeManager.sol";

contract StakeManager is IStakeManager, AccessControlUpgradeable, ReentrancyGuardUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    //  ___ Constants ___

    bytes32 public constant CONFIG_KEEPER_ROLE = keccak256("CONFIG_KEEPER_ROLE");

    uint256 public constant STAKE_DURATION = 1 days;

    struct RoleConfiguration {
        uint256 registrationDepositAmount;
        uint256 deadline;
        bool isActive;
    }

    struct Participant {
        uint256 registrationTimestamp;
        uint256 registrationDepositAmount;
        bool isActive;
    }

    struct StakeInfo {
        uint256 amount;
        uint256 timestamp;
        uint256 duration;
    }

    // ___ Variables ___

    uint256 public nextRoleId;

    // ___ Mapping ___

    /// @dev roleId => RoleConfiguration
    mapping(uint256 => RoleConfiguration) public existingRoles;

    /// @dev staker =>  stakeInfoId => StakeInfo
    mapping(address => mapping(uint256 => StakeInfo)) public stakerStakeInfo;

    mapping(address => uint256) public nextUserStakeInfoId;

    /// @dev staker => balance
    mapping(address => uint256) public stakerBalances;

    /// @dev staker => roleId => Participant
    mapping(address => mapping(uint256 => Participant)) public participants;

    /// @dev depositAmount => roleId
    mapping(uint256 => uint256) public roleIds;

    /// @dev staker => roleId[]
    mapping(address => uint256[]) public participantRoleIds;

    // ___ Events ___
    event ConfigurationUpdated(uint256 indexed registrationDepositAmount, uint256 indexed registrationWaitTime);
    event Registered(address indexed staker, uint256 indexed amount);
    event RoleDeactivated(uint256 indexed roleId);
    event Slashed(address indexed staker, uint256 indexed amount);
    event Staked(address indexed staker, uint256 indexed amount);
    event Unregistered(address indexed staker, uint256 indexed amount);
    event Unstaked(address indexed staker, uint256 indexed amount);

    // ___ Errors ___
    error AlreadyParticipateInThisRole();
    error CannotSlashMoreThanStake();
    error CannotStakeZeroValue();
    error DoseNotParticipateInAnyRole();
    error HasNoStake();
    error InvalidDepositAmount();
    error ReachedDeadline();
    error TransactionFailed();
    error UnknowCaller();
    error UnknownRole();

    // ___ Modifiers ___
    modifier onlyPrpt() {
        if (participantRoleIds[msg.sender].length == 0) revert UnknowCaller();
        _;
    }

    function initialize() public initializer {
        __AccessControl_init();
        __ReentrancyGuard_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /**
     * @dev Sets the configuration for a new role in the StakeManager contract.
     * @param registrationDepositAmount The amount of deposit required for role registration.
     * @param registrationWaitTime The wait time in seconds for role registration.
     * Requirements:
     * - Caller must have the CONFIG_KEEPER_ROLE.
     */
    function setConfiguration(uint256 registrationDepositAmount, uint256 registrationWaitTime)
        external
        onlyRole(CONFIG_KEEPER_ROLE)
    {
        uint256 roleId = nextRoleId++;

        RoleConfiguration storage role = existingRoles[roleId];

        role.registrationDepositAmount = registrationDepositAmount;
        role.deadline = block.timestamp + registrationWaitTime;
        role.isActive = true;

        roleIds[registrationDepositAmount] = roleId;

        emit ConfigurationUpdated(registrationDepositAmount, registrationWaitTime);
    }

    /**
     * @dev Registers a participant in the stake manager contract.
     * Participants must provide a registration deposit amount equal to the specified role's deposit amount.
     * The participant's registration is only valid if the role is active, the deposit amount is correct,
     * and the registration deadline has not been reached.
     * Once registered, the participant is marked as active and their registration details are stored.
     * Emits a `Registered` event upon successful registration.
     */

    function register() external payable {
        uint256 roleId = roleIds[msg.value];
        RoleConfiguration memory role = existingRoles[roleId];

        if (!role.isActive) revert UnknownRole();
        if (role.registrationDepositAmount != msg.value) revert InvalidDepositAmount();
        if (role.deadline < block.timestamp) revert ReachedDeadline();

        Participant storage prpt = participants[msg.sender][roleId];

        if (prpt.isActive) revert AlreadyParticipateInThisRole();

        prpt.registrationDepositAmount = msg.value;
        prpt.registrationTimestamp = block.timestamp;
        prpt.isActive = true;

        participantRoleIds[msg.sender].push(roleId);

        emit Registered(msg.sender, msg.value);
    }

    /**
     * @dev Allows a participant to unregister from all roles they are currently participating in.
     * If the participant is not participating in any role, the function reverts.
     * The function returns the total amount of registration deposit that is refunded to the participant.
     * The participant's registration deposit amount for each role is set to 0 and their active status is set to false.
     * If the deadline for a role has passed, the participant's registration deposit amount is added to the total refund amount.
     * The participant's role IDs for which the deadline has not passed are stored in an array and updated in the participantRoleIds mapping.
     * The refund amount is transferred to the participant's address.
     * Emits an Unregistered event with the participant's address and the refund amount.
     */
    function unregister() external {
        uint256[] memory prptRoleIds = participantRoleIds[msg.sender];
        if (prptRoleIds.length == 0) revert DoseNotParticipateInAnyRole();
        uint256 amount;

        uint256[] memory arr = new uint256[](prptRoleIds.length);
        uint256 count;

        for (uint256 i = 0; i < prptRoleIds.length; i++) {
            uint256 roleId = prptRoleIds[i];

            if (existingRoles[roleId].deadline < block.timestamp) {
                Participant storage prpt = participants[msg.sender][roleId];

                amount += prpt.registrationDepositAmount;

                prpt.registrationDepositAmount = 0;
                prpt.isActive = false;
            } else {
                arr[count++] = roleId;
            }
        }

        participantRoleIds[msg.sender] = arr;

        (bool os, ) = payable(msg.sender).call{value: amount}("");
        if (!os) revert TransactionFailed();

        emit Unregistered(msg.sender, amount);
    }

    /**
     * @dev Allows a user to stake their funds.
     * @notice The user must send a non-zero value with the transaction.
     * @notice The staked amount will be added to the user's balance.
     * @notice The stake information will be stored in the stakerStakeInfo mapping.
     * @notice Emits a Staked event with the user's address and the staked amount.
     */

    function stake() external payable onlyPrpt {
        if (msg.value == 0) revert CannotStakeZeroValue();

        stakerBalances[msg.sender] += msg.value;

        // other logic depending on the business strategy
        uint256 stakeInfoId = nextUserStakeInfoId[msg.sender]++;
        stakerStakeInfo[msg.sender][stakeInfoId] = StakeInfo(msg.value, block.timestamp, STAKE_DURATION);

        emit Staked(msg.sender, msg.value);
    }

    /**
     * @dev Allows a staker to unstake their tokens and receive the staked amount back.
     * Only stakers with a non-zero balance can unstake.
     * The staker's balance is set to zero after unstaking.
     * The staked amount is transferred back to the staker's address.
     * Emits an `Unstaked` event upon successful unstaking.
     * Reverts if the staker has no stake or if the transaction fails.
     */
    function unstake() external onlyPrpt nonReentrant {
        if (stakerBalances[msg.sender] == 0) revert HasNoStake();
        uint256 amount = stakerBalances[msg.sender];
        stakerBalances[msg.sender] = 0;

        // other logic depending on the business strategy

        (bool os, ) = payable(msg.sender).call{value: amount}("");
        if (!os) revert TransactionFailed();

        emit Unstaked(msg.sender, amount);
    }

    /**
     * @dev Slash a specific amount from a staker's balance.
     * Only the DEFAULT_ADMIN_ROLE can call this function.
     * If the staker's balance is less than the specified amount, it reverts with a CannotSlashMoreThanStake error.
     * The specified amount is subtracted from the staker's balance.
     * The amount is transferred to the caller's address.
     * If the transaction fails, it reverts with a TransactionFailed error.
     * Emits a Slashed event with the staker's address and the slashed amount.
     * @param staker The address of the staker.
     * @param amount The amount to be slashed.
     */
    function slash(address staker, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (stakerBalances[staker] < amount) revert CannotSlashMoreThanStake();

        stakerBalances[staker] -= amount;

        (bool os, ) = payable(msg.sender).call{value: amount}("");
        if (!os) revert TransactionFailed();

        emit Slashed(staker, amount);
    }

    /**
     * @dev Deactivates a role by setting its isActive flag to false.
     * Only the address with the CONFIG_KEEPER_ROLE can call this function.
     * Emits a RoleDeactivated event.
     * @param roleId The ID of the role to be deactivated.
     */
    function deactivateRole(uint256 roleId) external onlyRole(CONFIG_KEEPER_ROLE) {
        existingRoles[roleId].isActive = false;

        emit RoleDeactivated(roleId);
    }

    // ___ View ___
    /**
     * @dev Retrieves the role IDs of a participant.
     * @param staker The address of the participant.
     * @return An array of role IDs associated with the participant.
     */
    function getParticipantRoleIds(address staker) external view returns (uint256[] memory) {
        return participantRoleIds[staker];
    }
}
