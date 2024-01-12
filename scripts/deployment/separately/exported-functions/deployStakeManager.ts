// This script contains the function for deployment and verification of the `contracts/StakeManager.sol`.

import hre from "hardhat";
const ethers = hre.ethers;
const upgrades = hre.upgrades;

import type { StakeManager } from "../../../../typechain-types";

async function deployStakeManager(): Promise<StakeManager> {
    /*
     * Hardhat always runs the compile task when running scripts with its command line interface.
     *
     * If this script is run directly using `node`, then it should be called compile manually
     * to make sure everything is compiled.
     */
    // await hre.run("compile");

    const [deployer] = await ethers.getSigners();

    // # 1. Deployment of StakeManager.
    const StakeManager = await ethers.getContractFactory("StakeManager", deployer);
    const staking = <StakeManager>await upgrades.deployProxy(StakeManager, [], { initializer: "initialize" });
    await staking.deployed();

    console.log(`\`staking\` is deployed to ${staking.address}.`);

    // Verification of the deployed contract.
    if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
        console.log("Sleeping before verification...");
        await new Promise((resolve) => setTimeout(resolve, 60000)); // 60 seconds.

        await hre.run("verify:verify", { address: staking.address, constructorArguments: [] });
    }

    return staking;
}

export { deployStakeManager };
