import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import {
  unitFixtureRewardManagerTestL1,
  unitFixtureRewardManagerTestL2,
  unitFixtureRewardManagerTestL2Arbitrum,
} from "../fixtures";
import { shouldBehaveLikeRewardManager } from "./specs/rewardManager.spec";
import { shouldHaveStakingFunction } from "./specs/rewardManagerL1.spec";

export function unitTestsRewardManager(): void {
  describe("Reward Manager", function () {
    describe("Reward Manager L1", function () {
      beforeEach(async function () {
        const farmingData = await loadFixture(unitFixtureRewardManagerTestL1);
        this.contracts.smardexToken = farmingData.stakingToken;
        this.contracts.tether = farmingData.tether;
        this.contracts.rewardManagerTest = farmingData.rewardManagerTest;
        this.misc.startBlock = farmingData.mockedBlock;
      });

      shouldHaveStakingFunction();
      shouldBehaveLikeRewardManager();
    });

    describe("Reward Manager L2", function () {
      beforeEach(async function () {
        const farmingData = await loadFixture(unitFixtureRewardManagerTestL2);
        this.contracts.smardexToken = farmingData.stakingToken;
        this.contracts.tether = farmingData.tether;
        this.contracts.rewardManagerTest = farmingData.rewardManagerTest;
        this.misc.startBlock = farmingData.mockedBlock;
      });

      shouldBehaveLikeRewardManager();
    });

    describe("Reward Manager L2 Arbitrum", function () {
      beforeEach(async function () {
        const farmingData = await loadFixture(unitFixtureRewardManagerTestL2Arbitrum);
        this.contracts.smardexToken = farmingData.stakingToken;
        this.contracts.tether = farmingData.tether;
        this.contracts.rewardManagerTest = farmingData.rewardManagerTest;
        this.misc.startBlock = farmingData.mockedBlock;
      });

      shouldBehaveLikeRewardManager();
    });
  });
}
