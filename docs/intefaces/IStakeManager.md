# Solidity API

## IStakeManager

### setConfiguration

```solidity
function setConfiguration(uint256 registrationDepositAmount, uint256 registrationWaitTime) external
```

_Allows an admin to set the configuration of the staking contract._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| registrationDepositAmount | uint256 | Initial registration deposit amount in wei. |
| registrationWaitTime | uint256 | The duration a staker must wait after initiating registration. |

### register

```solidity
function register() external payable
```

_Allows an account to register as a staker._

### unregister

```solidity
function unregister() external
```

_Allows a registered staker to unregister and exit the staking system._

### stake

```solidity
function stake() external payable
```

_Allows registered stakers to stake ether into the contract._

### unstake

```solidity
function unstake() external
```

_Allows registered stakers to unstake their ether from the contract._

### slash

```solidity
function slash(address staker, uint256 amount) external
```

_Allows an admin to slash a portion of the staked ether of a given staker._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| staker | address | The address of the staker to be slashed. |
| amount | uint256 | The amount of ether to be slashed from the staker. |

