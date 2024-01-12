// This is a script for deployment and automatically verification of the `contracts/StakeManager.sol`.

import { deployStakeManager } from "./exported-functions/deployStakeManager";

async function main() {
    await deployStakeManager();
}

// This pattern is recommended to be able to use async/await everywhere and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
