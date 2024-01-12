# For deploy

```
create .env from .env.example
```
and run command 
```
npx hardhat run --network <your-network> scripts/deployment/deploy.ts
```

## deploy locally

```
npx hardhat node
and
npx hardhat run --network localhost scripts/deployment/deploy.ts
```

# For tests

run 

```
npx hardhat test
```

# Explanation

### register

```
function register() external payable
```

_Registers a participant in the stake manager contract.
Participants must provide a registration deposit amount equal to the specified role's deposit amount.
The participant's registration is only valid if the role is active, the deposit amount is correct,
and the registration deadline has not been reached.
Once registered, the participant is marked as active and their registration details are stored.
Emits a `Registered` event upon successful registration._

### unregister

```
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

```
function stake() external payable
```

The user must send a non-zero value with the transaction.
The staked amount will be added to the user's balance.
The stake information will be stored in the stakerStakeInfo mapping.
Emits a Staked event with the user's address and the staked amount.

_Allows a user to stake their funds._

### unstake

```
function unstake() external
```

_Allows a staker to unstake their tokens and receive the staked amount back.
Only stakers with a non-zero balance can unstake.
The staker's balance is set to zero after unstaking.
The staked amount is transferred back to the staker's address.
Emits an `Unstaked` event upon successful unstaking.
Reverts if the staker has no stake or if the transaction fails._

### slash

```
function slash(address staker, uint256 amount) external
```

_Slash a specific amount from a staker's balance.
Only the DEFAULT_ADMIN_ROLE can call this function.
If the staker's balance is less than the specified amount, it reverts with a CannotSlashMoreThanStake error.
The specified amount is subtracted from the staker's balance.
The amount is transferred to the caller's address.
If the transaction fails, it reverts with a TransactionFailed error.
Emits a Slashed event with the staker's address and the slashed amount._
