// This is a script for deployment and automatically verification of all the contracts (`contracts/`).

import { deployStakeManager } from "./separately/exported-functions/deployStakeManager";

async function main() {
    // Deployment and verification of the `contracts/PositiveEvenSetter.sol`.
    await deployStakeManager();
}

// This pattern is recommended to be able to use async/await everywhere and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
