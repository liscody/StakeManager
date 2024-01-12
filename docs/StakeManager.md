# Solidity API

## StakeManager

### CONFIG_KEEPER_ROLE

```solidity
bytes32 CONFIG_KEEPER_ROLE
```

### STAKE_DURATION

```solidity
uint256 STAKE_DURATION
```

### RoleConfiguration

```solidity
struct RoleConfiguration {
  uint256 registrationDepositAmount;
  uint256 deadline;
  bool isActive;
}
```

### Participant

```solidity
struct Participant {
  uint256 registrationTimestamp;
  uint256 registrationDepositAmount;
  bool isActive;
}
```

### StakeInfo

```solidity
struct StakeInfo {
  uint256 amount;
  uint256 timestamp;
  uint256 duration;
}
```

### nextRoleId

```solidity
uint256 nextRoleId
```

### existingRoles

```solidity
mapping(uint256 => struct StakeManager.RoleConfiguration) existingRoles
```

_roleId => RoleConfiguration_

### stakerStakeInfo

```solidity
mapping(address => mapping(uint256 => struct StakeManager.StakeInfo)) stakerStakeInfo
```

_staker =>  stakeInfoId => StakeInfo_

### nextUserStakeInfoId

```solidity
mapping(address => uint256) nextUserStakeInfoId
```

### stakerBalances

```solidity
mapping(address => uint256) stakerBalances
```

_staker => balance_

### participants

```solidity
mapping(address => mapping(uint256 => struct StakeManager.Participant)) participants
```

_staker => roleId => Participant_

### roleIds

```solidity
mapping(uint256 => uint256) roleIds
```

_depositAmount => roleId_

### participantRoleIds

```solidity
mapping(address => uint256[]) participantRoleIds
```

_staker => roleId[]_

### ConfigurationUpdated

```solidity
event ConfigurationUpdated(uint256 registrationDepositAmount, uint256 registrationWaitTime)
```

### Registered

```solidity
event Registered(address staker, uint256 amount)
```

### RoleDeactivated

```solidity
event RoleDeactivated(uint256 roleId)
```

### Slashed

```solidity
event Slashed(address staker, uint256 amount)
```

### Staked

```solidity
event Staked(address staker, uint256 amount)
```

### Unregistered

```solidity
event Unregistered(address staker, uint256 amount)
```

### Unstaked

```solidity
event Unstaked(address staker, uint256 amount)
```

### AlreadyParticipateInThisRole

```solidity
error AlreadyParticipateInThisRole()
```

### CannotSlashMoreThanStake

```solidity
error CannotSlashMoreThanStake()
```

### CannotStakeZeroValue

```solidity
error CannotStakeZeroValue()
```

### DoseNotParticipateInAnyRole

```solidity
error DoseNotParticipateInAnyRole()
```

### HasNoStake

```solidity
error HasNoStake()
```

### InvalidDepositAmount

```solidity
error InvalidDepositAmount()
```

### ReachedDeadline

```solidity
error ReachedDeadline()
```

### TransactionFailed

```solidity
error TransactionFailed()
```

### UnknowCaller

```solidity
error UnknowCaller()
```

### UnknownRole

```solidity
error UnknownRole()
```

### onlyPrpt

```solidity
modifier onlyPrpt()
```

### initialize

```solidity
function initialize() public
```

### setConfiguration

```solidity
function setConfiguration(uint256 registrationDepositAmount, uint256 registrationWaitTime) external
```

_Sets the configuration for a new role in the StakeManager contract._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| registrationDepositAmount | uint256 | The amount of deposit required for role registration. |
| registrationWaitTime | uint256 | The wait time in seconds for role registration. Requirements: - Caller must have the CONFIG_KEEPER_ROLE. |

### register

```solidity
function register() external payable
```

_Registers a participant in the stake manager contract.
Participants must provide a registration deposit amount equal to the specified role's deposit amount.
The participant's registration is only valid if the role is active, the deposit amount is correct,
and the registration deadline has not been reached.
Once registered, the participant is marked as active and their registration details are stored.
Emits a `Registered` event upon successful registration._

### unregister

```solidity
function unregister() external
```

_Allows a participant to unregister from all roles they are currently participating in.
If the participant is not participating in any role, the function reverts.
The function returns the total amount of registration deposit that is refunded to the participant.
The participant's registration deposit amount for each role is set to 0 and their active status is set to false.
If the deadline for a role has passed, the participant's registration deposit amount is added to the total refund amount.
The participant's role IDs for which the deadline has not passed are stored in an array and updated in the participantRoleIds mapping.
The refund amount is transferred to the participant's address.
Emits an Unregistered event with the participant's address and the refund amount._

### stake

```solidity
function stake() external payable
```

The user must send a non-zero value with the transaction.
The staked amount will be added to the user's balance.
The stake information will be stored in the stakerStakeInfo mapping.
Emits a Staked event with the user's address and the staked amount.

_Allows a user to stake their funds._

### unstake

```solidity
function unstake() external
```

_Allows a staker to unstake their tokens and receive the staked amount back.
Only stakers with a non-zero balance can unstake.
The staker's balance is set to zero after unstaking.
The staked amount is transferred back to the staker's address.
Emits an `Unstaked` event upon successful unstaking.
Reverts if the staker has no stake or if the transaction fails._

### slash

```solidity
function slash(address staker, uint256 amount) external
```

_Slash a specific amount from a staker's balance.
Only the DEFAULT_ADMIN_ROLE can call this function.
If the staker's balance is less than the specified amount, it reverts with a CannotSlashMoreThanStake error.
The specified amount is subtracted from the staker's balance.
The amount is transferred to the caller's address.
If the transaction fails, it reverts with a TransactionFailed error.
Emits a Slashed event with the staker's address and the slashed amount._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| staker | address | The address of the staker. |
| amount | uint256 | The amount to be slashed. |

### deactivateRole

```solidity
function deactivateRole(uint256 roleId) external
```

_Deactivates a role by setting its isActive flag to false.
Only the address with the CONFIG_KEEPER_ROLE can call this function.
Emits a RoleDeactivated event._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| roleId | uint256 | The ID of the role to be deactivated. |

### getParticipantRoleIds

```solidity
function getParticipantRoleIds(address staker) external view returns (uint256[])
```

_Retrieves the role IDs of a participant._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| staker | address | The address of the participant. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256[] | An array of role IDs associated with the participant. |

