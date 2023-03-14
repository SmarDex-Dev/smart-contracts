import { unitFixtureFarmingRange } from "../fixtures";
import { shouldBehaveLikeFarmingRange } from "./specs/farmingRange.spec";
import { shouldBehaveLikeRemoveRewardInfo } from "./specs/farmingRangeRemoveReward.spec";
import { shouldBehaveLikeUpdateRewardMultiple } from "./specs/farmingRangeUpdateMultiple.spec";
import { shouldBehaveLikeUpdateRewardInfo } from "./specs/farmingRangeUpdateReward.spec";
import { shouldBehaveLikeDepositWithPermit } from "./specs/depositWithPermit.spec";
import { shouldBehaveLikeUpgradePrecision } from "./specs/upgradePrecision.spec";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

export function unitTestsFarmingRange(): void {
  describe("FarmingRange", function () {
    beforeEach(async function () {
      const fixture = await loadFixture(unitFixtureFarmingRange);
      this.farming = {
        ...this.farming,
        ...fixture,
      };
    });

    shouldBehaveLikeFarmingRange();
    shouldBehaveLikeUpdateRewardInfo();
    shouldBehaveLikeUpdateRewardMultiple();
    shouldBehaveLikeRemoveRewardInfo();
    shouldBehaveLikeDepositWithPermit();
    shouldBehaveLikeUpgradePrecision();
  });
}
