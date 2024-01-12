/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import type { SnapshotRestorer } from "@nomicfoundation/hardhat-network-helpers";
import { takeSnapshot, mine, mineUpTo, time } from "@nomicfoundation/hardhat-network-helpers";
let latestBlock: any = time.latestBlock;

import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import type { StakeManager } from "../typechain-types";
import { ether } from "./helpers";
const { formatEther } = ethers.utils;

describe("StakeManager Contract", function () {
    let snapshotA: SnapshotRestorer;

    // Signers.
    let users: any = [];
    let deployer: SignerWithAddress, owner: SignerWithAddress, user: SignerWithAddress;
    let user1: SignerWithAddress, user2: SignerWithAddress, user3: SignerWithAddress;
    let keeper: SignerWithAddress;

    let staking: StakeManager;

    // variables
    const ONE_DAY = 86400;

    before(async () => {
        // Getting of signers.
        users = await ethers.getSigners();
        owner = users[0];
        deployer = owner;

        user = users[1];
        user1 = users[2];
        user2 = users[3];
        user3 = users[4];
        keeper = users[5];

        // # 1. Deployment of StakeManager.
        const StakeManager = await ethers.getContractFactory("StakeManager", deployer);
        staking = <StakeManager>await upgrades.deployProxy(StakeManager, [], { initializer: "initialize" });
        await staking.deployed();

        // # 2. Settings.
        // grantRole

        const role = await staking.CONFIG_KEEPER_ROLE();
        await staking.connect(deployer).grantRole(role, keeper.address);

        const registrationDepositAmount = ether(1);
        const registrationWaitTime = ONE_DAY * 7;

        // contract balance before
        const contractBalanceBefore = await ethers.provider.getBalance(staking.address);
        expect(contractBalanceBefore).to.equal(0);

        await staking.connect(keeper).setConfiguration(registrationDepositAmount, registrationWaitTime);

        snapshotA = await takeSnapshot();
    });

    afterEach(async () => await snapshotA.restore());

    describe("# setConfiguration ", function () {
        it("Should emit event 'ConfigurationUpdated' and change storage data", async () => {
            const registrationDepositAmount = ether(1);
            const registrationWaitTime = ONE_DAY * 7;

            // contract balance before
            const contractBalanceBefore = await ethers.provider.getBalance(staking.address);
            expect(contractBalanceBefore).to.equal(0);
            const now = await ethers.provider.getBlock(latestBlock());
            await expect(staking.connect(keeper).setConfiguration(registrationDepositAmount, registrationWaitTime))
                .to.emit(staking, "ConfigurationUpdated")
                .withArgs(registrationDepositAmount, registrationWaitTime);

            expect((await staking.nextRoleId()).sub(1)).to.equal(1);

            const data = await staking.existingRoles(0);

            expect(data.registrationDepositAmount).to.equal(registrationDepositAmount);
            expect(data.deadline).to.equal(now.timestamp + registrationWaitTime);
            expect(data.isActive).to.equal(true);

            // contract balance after
            const contractBalanceAfter = await ethers.provider.getBalance(staking.address);
            expect(contractBalanceAfter).to.equal(0);
        });
    });

    describe("# register ", function () {
        it("Should emit event 'Registered' and change storage data", async () => {
            const res = await staking.existingRoles((await staking.nextRoleId()).sub(1));
            const registrationDepositAmount = res.registrationDepositAmount;

            // contract balance before
            const contractBalanceBefore = await ethers.provider.getBalance(staking.address);
            expect(contractBalanceBefore).to.equal(0);

            await expect(staking.connect(user).register({ value: registrationDepositAmount }))
                .to.emit(staking, "Registered")
                .withArgs(user.address, registrationDepositAmount);

            const now = await ethers.provider.getBlock(latestBlock());
            const data = await staking.participants(user.address, (await staking.nextRoleId()).sub(1));
            expect(data.registrationDepositAmount).to.equal(registrationDepositAmount);
            expect(data.registrationTimestamp).to.equal(now.timestamp);
            expect(data.isActive).to.equal(true);

            const participantRoleIds = await staking.getParticipantRoleIds(user.address);
            expect(participantRoleIds[0]).to.equal((await staking.nextRoleId()).sub(1));

            // contract balance after
            const contractBalanceAfter = await ethers.provider.getBalance(staking.address);
            expect(contractBalanceAfter).to.equal(registrationDepositAmount);
        });
    });

    describe("# unregister ", function () {
        it("Should emit event 'Unregistered' and change storage data", async () => {
            const res = await staking.existingRoles((await staking.nextRoleId()).sub(1));
            const registrationDepositAmount = res.registrationDepositAmount;
            await staking.connect(user).register({ value: registrationDepositAmount });

            // time travel
            await mineUpTo(ONE_DAY * 10);

            // unregister
            const now = await ethers.provider.getBlock(latestBlock());

            // contract balance before
            const contractBalanceBefore = await ethers.provider.getBalance(staking.address);
            expect(contractBalanceBefore).to.equal(registrationDepositAmount);

            await expect(staking.connect(user).unregister())
                .to.emit(staking, "Unregistered")
                .withArgs(user.address, registrationDepositAmount);

            // contract balance after
            const contractBalanceAfter = await ethers.provider.getBalance(staking.address);
            expect(contractBalanceAfter).to.equal(0);
        });
    });

    describe("# stake ", function () {
        it("Should emit event 'Staked' and change storage data", async () => {
            const res = await staking.existingRoles((await staking.nextRoleId()).sub(1));
            const registrationDepositAmount = res.registrationDepositAmount;
            await staking.connect(user).register({ value: registrationDepositAmount });

            //contract balance before
            const contractBalanceBefore = await ethers.provider.getBalance(staking.address);
            expect(contractBalanceBefore).to.equal(registrationDepositAmount);

            // staking
            const stakingAmount = ether(1);
            await expect(staking.connect(user).stake({ value: stakingAmount }))
                .to.emit(staking, "Staked")
                .withArgs(user.address, stakingAmount);

            // contract balance after

            const contractBalanceAfter = await ethers.provider.getBalance(staking.address);
            expect(contractBalanceAfter).to.equal(registrationDepositAmount.add(stakingAmount));
        });
    });

    describe("# unstake ", function () {
        it("Should emit event 'Unstaked' and change storage data", async () => {
            const res = await staking.existingRoles((await staking.nextRoleId()).sub(1));
            const registrationDepositAmount = res.registrationDepositAmount;
            await staking.connect(user).register({ value: registrationDepositAmount });

            // staking
            const stakingAmount = ether(1);
            await staking.connect(user).stake({ value: stakingAmount });

            // contract balance before
            const contractBalanceBefore = await ethers.provider.getBalance(staking.address);

            // unstaking

            await expect(staking.connect(user).unstake())
                .to.emit(staking, "Unstaked")
                .withArgs(user.address, stakingAmount);

            // contract balance after
            const contractBalanceAfter = await ethers.provider.getBalance(staking.address);
            expect(contractBalanceAfter).to.equal(registrationDepositAmount);
        });
    });

    describe("# slash ", function () {
        it("Should emit event 'Slashed' and change storage data", async () => {
            const res = await staking.existingRoles((await staking.nextRoleId()).sub(1));
            const registrationDepositAmount = res.registrationDepositAmount;
            await staking.connect(user).register({ value: registrationDepositAmount });

            // staking
            const stakingAmount = ether(1);
            await staking.connect(user).stake({ value: stakingAmount });

            // contract balance before
            const contractBalanceBefore = await ethers.provider.getBalance(staking.address);

            // slash
            const slashAmount = ether(1).div(2);
            await expect(staking.connect(deployer).slash(user.address, slashAmount))
                .to.emit(staking, "Slashed")
                .withArgs(user.address, slashAmount);

            // contract balance after
            const contractBalanceAfter = await ethers.provider.getBalance(staking.address);
            expect(contractBalanceAfter).to.equal(contractBalanceBefore.sub(slashAmount));

            // stakerBalances[staker] -= amount;
            const stakerBalance = await staking.stakerBalances(user.address);
            expect(stakerBalance).to.equal(stakingAmount.sub(slashAmount));
        });
    });

    describe("# deactivateRole ", function () {
        it("Should emit event 'RoleDeactivated' and change storage data", async () => {
            const roleId = (await staking.nextRoleId()).sub(1);

            // deactivateRole
            await expect(staking.connect(keeper).deactivateRole(roleId))
                .to.emit(staking, "RoleDeactivated")
                .withArgs(roleId);

            const data = await staking.existingRoles(roleId);
            expect(data.isActive).to.equal(false);
        });
    });
});
