import { constants } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { unitFixtureFarmingRange, unitFixtureFarmingRangeL2Arbitrum, unitFixtureSmardexPairTest } from "../fixtures";
import { shouldBehaveLikeRemoveLastRewardInfo } from "./specs/removeLastRewardInfo.spec";
import { shouldBehaveLikeUpdateRewardMultiple } from "./specs/updateRewardMultiple.spec";
import { shouldBehaveLikeUpdateRewardInfo } from "./specs/updateRewardInfo.spec";
import { shouldBehaveLikeDepositWithPermit } from "./specs/depositWithPermit.spec";
import { shouldBehaveLikeAddCampaignInfo } from "./specs/addCampaignInfo.spec";
import { shouldBehaveLikeAddRewardInfo } from "./specs/addRewardInfo.spec";
import { shouldBehaveLikeCurrentEndBlock } from "./specs/currentEndBlock.spec";
import { shouldBehaveLikeCurrentRewardPerBlock } from "./specs/currentRewardPerBlock.spec";
import { shouldBehaveLikeDeposit } from "./specs/deposit.spec";
import { shouldBehaveLikeEmergencyWithdraw } from "./specs/emergencyWithdraw.spec";
import { shouldBehaveLikeHarvest } from "./specs/harvest.spec";
import { shouldBehaveLikeWithdraw } from "./specs/withdraw.spec";
import { shouldBehaveLikeFarmingConstructor } from "./specs/farmingConstructor.spec";
import { shouldBehaveLikeUpdateCampaign } from "./specs/updateCampaign.spec";
import { shouldRefundRewardManager } from "./specs/rewardManagerRefund.spec";
import { shouldRevertAtMaxRewardLimit } from "./specs/maxRewardInfoLimit.spec";
import { shouldRevertAtMaxRewardLimitArbitrum } from "./specs/maxRewardInfoLimitArbitrum.spec";
import { shouldBehaveLikeRemoveLastRewardInfoMultiple } from "./specs/removeLastRewardInfoMultiple.spec";

export function unitTestsFarmingRange(): void {
  describe("FarmingRange", function () {
    describe("FarmingRange L1", function () {
      beforeEach(async function () {
        const fixture = await loadFixture(unitFixtureFarmingRange);

        this.farming = {
          ...this.farming,
          ...fixture,
        };
      });

      farmingRangeTests();
      shouldRevertAtMaxRewardLimit();
    });

    describe("FarmingRange L2 Arbitrum", function () {
      beforeEach(async function () {
        const fixture = await loadFixture(unitFixtureFarmingRangeL2Arbitrum);

        this.farming = {
          ...this.farming,
          ...fixture,
        };
      });

      farmingRangeTests();
      shouldRevertAtMaxRewardLimitArbitrum();
    });
  });

  describe("Farming ethereum update", function () {
    beforeEach(async function () {
      const { factory, smardexPairTest, token0, token1, smardexRouterTest, WETH } = await loadFixture(
        unitFixtureSmardexPairTest,
      );

      this.contracts.smardexFactoryTest = factory;
      this.contracts.smardexPairTest = smardexPairTest;
      this.contracts.token0 = token0;
      this.contracts.token1 = token1;
      this.contracts.routerForPairTest = smardexRouterTest;
      this.contracts.WETH = WETH;

      await this.contracts.token0.approve(this.contracts.routerForPairTest.address, constants.MaxUint256);
      await this.contracts.token1.approve(this.contracts.routerForPairTest.address, constants.MaxUint256);
    });
  });
}

function farmingRangeTests(): void {
  shouldBehaveLikeFarmingConstructor();
  shouldBehaveLikeAddCampaignInfo();
  shouldBehaveLikeAddRewardInfo();
  shouldBehaveLikeCurrentEndBlock();
  shouldBehaveLikeCurrentRewardPerBlock();
  shouldBehaveLikeDeposit();
  shouldBehaveLikeDepositWithPermit();
  shouldBehaveLikeEmergencyWithdraw();
  shouldBehaveLikeHarvest();
  shouldBehaveLikeRemoveLastRewardInfo();
  shouldBehaveLikeRemoveLastRewardInfoMultiple();
  shouldBehaveLikeUpdateCampaign();
  shouldBehaveLikeUpdateRewardInfo();
  shouldBehaveLikeUpdateRewardMultiple();
  shouldBehaveLikeWithdraw();
  shouldRefundRewardManager();
}
