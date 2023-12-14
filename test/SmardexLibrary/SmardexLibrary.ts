import { unitFixtureSmardexLibraryTestV2, unitFixtureSmardexLibraryTestV1 } from "../fixtures";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { shouldBehaveLikeComputeFictiveReserves } from "./specs/computeFictiveReserves.spec";
import { shouldBehaveLikeApplyKConstRuleOut } from "./specs/applyKConstRuleOut.spec";
import { shouldBehaveLikeApplyKConstRuleOutV1 } from "./specs/applyKConstRuleOutV1.spec";
import { shouldBehaveLikeApplyKConstRuleIn } from "./specs/applyKConstRuleIn.spec";
import { shouldBehaveLikeApplyKConstRuleInV1 } from "./specs/applyKConstRuleInV1.spec";
import { shouldBehaveLikeComputeFirstTradeQtyIn } from "./specs/computeFirstTradeQtyIn.spec";
import { shouldBehaveLikeComputeFirstTradeQtyInV1 } from "./specs/computeFirstTradeQtyInV1.spec";
import { shouldBehaveLikeComputeFirstTradeQtyOut } from "./specs/computeFirstTradeQtyOut.spec";
import { shouldBehaveLikeComputeFirstTradeQtyOutV1 } from "./specs/computeFirstTradeQtyOutV1.spec";
import { shouldBehaveLikeGetAmountIn } from "./specs/getAmountIn.spec";
import { shouldBehaveLikeGetAmountInV1 } from "./specs/getAmountInV1.spec";
import { shouldBehaveLikeGetAmountOut } from "./specs/getAmountOut.spec";
import { shouldBehaveLikeGetAmountOutV1 } from "./specs/getAmountOutV1.spec";
import { shouldBehaveLikeGetUpdatedPriceAverage } from "./specs/getUpdatedPriceAverage.spec";
import { shouldBehaveLikeApproxEq } from "./specs/approxEq.spec";

export function unitTestsSmardexLibrary(): void {
  describe("SmardexLibraryTest", function () {
    describe("SmardexLibraryTestV2", function () {
      beforeEach(async function () {
        const { smardexLibraryTest, smardexRouter, smardexPair, token0, token1 } = await loadFixture(
          unitFixtureSmardexLibraryTestV2,
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

      describe("Check Approx Eq", function () {
        shouldBehaveLikeApproxEq();
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

    describe("SmardexLibraryTestV1", function () {
      beforeEach(async function () {
        const { smardexLibraryTest, smardexRouter, smardexPair, token0, token1 } = await loadFixture(
          unitFixtureSmardexLibraryTestV1,
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
        shouldBehaveLikeApplyKConstRuleOutV1();
      });

      describe("Apply K Const Rule In", function () {
        shouldBehaveLikeApplyKConstRuleInV1();
      });

      describe("Compute First Trade Qty In", function () {
        shouldBehaveLikeComputeFirstTradeQtyInV1();
      });

      describe("Compute First Trade Qty Out", function () {
        shouldBehaveLikeComputeFirstTradeQtyOutV1();
      });

      describe("Get Amount In", function () {
        shouldBehaveLikeGetAmountInV1();
      });

      describe("Get Amount Out", function () {
        shouldBehaveLikeGetAmountOutV1();
      });
    });
  });
}
