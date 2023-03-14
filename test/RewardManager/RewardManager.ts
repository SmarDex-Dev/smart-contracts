import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { unitFixtureRewardManager } from "../fixtures";
import { shouldBehaveLikeRewardManager } from "./specs/rewardManager.spec";

export function unitTestsRewardManager(): void {
  describe("Reward Manager", function () {
    beforeEach(async function () {
      const farmingData = await loadFixture(unitFixtureRewardManager);
      this.contracts.rewardManager = farmingData.rewardManager;
      this.contracts.smardexToken = farmingData.stakingToken;
      this.misc.startBlock = farmingData.mockedBlock;
    });
    shouldBehaveLikeRewardManager();
  });
}
