import { shouldBehaveLikeDeposit } from "./specs/deposit.spec";
import { unitFixtureStaking } from "../fixtures";
import { constants } from "ethers";
import { shouldBehaveLikeWithdraw } from "./specs/withdraw.spec";
import { SMARDEX_USER_BALANCE } from "./utils";
import { shouldBehaveLikeInitializeFarming } from "./specs/initializeFarming.spec";
import { shouldBehaveLikeCheckUserBlock } from "./specs/checkUserBlock.spec";
import { shouldBehaveLikeHarvestFarming } from "./specs/harvestFarming.spec";
import { shouldBehaveLikeSharesToTokens } from "./specs/sharesToTokens.spec";
import { shouldBehaveLikeTokensToShares } from "./specs/tokensToShares.spec";
import { shouldBehaveLikeDepositWithPermit } from "./specs/depositWithPermit.spec";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

export function unitTestsStaking(): void {
  describe("Staking", function () {
    beforeEach(async function () {
      const fixture = await loadFixture(unitFixtureStaking);
      this.contracts = {
        ...this.contracts,
        ...fixture,
      };

      this.misc.startBlock = fixture.startBlockFarming;

      await this.contracts.smardexTokenTest.transfer(this.signers.user.address, SMARDEX_USER_BALANCE);
      await this.contracts.smardexTokenTest
        .connect(this.signers.user)
        .approve(this.contracts.staking.address, constants.MaxUint256);
    });
    describe("deposit", function () {
      shouldBehaveLikeDeposit();
    });

    describe("depositWithPermit", function () {
      shouldBehaveLikeDepositWithPermit();
    });

    describe("withdraw", function () {
      shouldBehaveLikeWithdraw();
    });

    describe("harvestFarming", function () {
      shouldBehaveLikeHarvestFarming();
    });

    describe("initializeFarming", function () {
      shouldBehaveLikeInitializeFarming();
    });

    describe("checkUserBlock", function () {
      shouldBehaveLikeCheckUserBlock();
    });

    describe("sharesToTokens", function () {
      shouldBehaveLikeSharesToTokens();
    });

    describe("tokensToShares", function () {
      shouldBehaveLikeTokensToShares();
    });
  });
}
