import { unitFixtureSmardexLibraryTest } from "../fixtures";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { shouldBehaveLikeComputeFictiveReserves } from "./specs/computeFictiveReserves.spec";
import { shouldBehaveLikeApplyKConstRuleOut } from "./specs/applyKConstRuleOut.spec";
import { shouldBehaveLikeApplyKConstRuleIn } from "./specs/applyKConstRuleIn.spec";
import { shouldBehaveLikeComputeFirstTradeQtyIn } from "./specs/computeFirstTradeQtyIn.spec";
import { shouldBehaveLikeComputeFirstTradeQtyOut } from "./specs/computeFirstTradeQtyOut.spec";
import { shouldBehaveLikeGetAmountIn } from "./specs/getAmountIn.spec";
import { shouldBehaveLikeGetAmountOut } from "./specs/getAmountOut.spec";
import { shouldBehaveLikeGetUpdatedPriceAverage } from "./specs/getUpdatedPriceAverage.spec";

export function unitTestsSmardexLibrary(): void {
  describe("SmardexLibraryTest", function () {
    beforeEach(async function () {
      const { smardexLibraryTest, smardexRouter, smardexPair, token0, token1 } = await loadFixture(
        unitFixtureSmardexLibraryTest,
      );

      this.contracts.smardexLibraryTest = smardexLibraryTest;
      this.contracts.smardexRouter = smardexRouter;
      this.contracts.smardexPair = smardexPair;
      this.token0 = token0;
      this.token1 = token1;
    });

    describe("Get Updated Price Average", function () {
      shouldBehaveLikeGetUpdatedPriceAverage();
    });

    describe("Compute Reserve Fic", function () {
      shouldBehaveLikeComputeFictiveReserves();
    });

    describe("Apply K Const Rule Out", function () {
      shouldBehaveLikeApplyKConstRuleOut();
    });

    describe("Apply K Const Rule In", function () {
      shouldBehaveLikeApplyKConstRuleIn();
    });

    describe("Compute First Trade Qty In", function () {
      shouldBehaveLikeComputeFirstTradeQtyIn();
    });

    describe("Compute First Trade Qty Out", function () {
      shouldBehaveLikeComputeFirstTradeQtyOut();
    });

    describe("Get Amount In", function () {
      shouldBehaveLikeGetAmountIn();
    });

    describe("Get Amount Out", function () {
      shouldBehaveLikeGetAmountOut();
    });
  });
}
