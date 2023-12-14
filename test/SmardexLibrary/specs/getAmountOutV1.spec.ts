import { expect } from "chai";
import { FEES_BASE, FEES_TOTAL_REVERSED } from "../../constants";
import { getAmount2TradesTestData, getAmountSimpleTestData } from "../utils";
import { SmardexLibraryTestV1 } from "../../../typechain";

export function shouldBehaveLikeGetAmountOutV1(): void {
  getAmountSimpleTestData.concat(getAmount2TradesTestData).forEach((getAmountTestCase, i) => {
    it(`getAmountOut simple check : ${i + 1}`, async function () {
      const result = await (this.contracts.smardexLibraryTest as SmardexLibraryTestV1).getAmountOut(
        getAmountTestCase.amountInToken0,
        getAmountTestCase.reserveToken0,
        getAmountTestCase.reserveToken1,
        getAmountTestCase.fictiveReserveToken0,
        getAmountTestCase.fictiveReserveToken1,
        getAmountTestCase.priceAverageToken0,
        getAmountTestCase.priceAverageToken1,
      );

      expect(result.amountOut_).to.be.approximately(getAmountTestCase.amountOutToken1, 1_000_000_000);
      expect(result.newReserveIn_).to.be.approximately(getAmountTestCase.expectedReserveToken0, 1_000_000_000);
      expect(result.newReserveOut_).to.be.approximately(getAmountTestCase.expectedReserveToken1, 1_000_000_000);
      expect(result.newFictiveReserveIn_).to.be.approximately(
        getAmountTestCase.expectedFictiveReserveToken0,
        1_000_000_000,
      );
      expect(result.newFictiveReserveOut_).to.be.approximately(
        getAmountTestCase.expectedFictiveReserveToken1,
        1_000_000_000,
      );
    });
  });

  getAmount2TradesTestData.forEach((getAmountTestCase, i) => {
    it(`getAmountOut check 2 trades : ${i + 1}`, async function () {
      const paramAmount = getAmountTestCase.amountInToken0.mul(FEES_TOTAL_REVERSED).div(FEES_BASE);
      const paramFirstAmount = await (this.contracts.smardexLibraryTest as SmardexLibraryTestV1).computeFirstTradeQtyIn(
        paramAmount,
        getAmountTestCase.fictiveReserveToken0,
        getAmountTestCase.fictiveReserveToken1,
        getAmountTestCase.priceAverageToken0,
        getAmountTestCase.priceAverageToken1,
      );
      const paramFirstAmountNoFees = paramFirstAmount.mul(FEES_BASE).div(FEES_TOTAL_REVERSED);

      const resultApplyK = await (this.contracts.smardexLibraryTest as SmardexLibraryTestV1).applyKConstRuleOut(
        paramFirstAmountNoFees,
        getAmountTestCase.reserveToken0,
        getAmountTestCase.reserveToken1,
        getAmountTestCase.fictiveReserveToken0,
        getAmountTestCase.fictiveReserveToken1,
      );
      expect(paramFirstAmount).to.be.lt(paramAmount);

      const computeFictiveReservesResult = await this.contracts.smardexLibraryTest.computeFictiveReserves(
        resultApplyK.newReserveIn_,
        resultApplyK.newReserveOut_,
        resultApplyK.newFictiveReserveIn_,
        resultApplyK.newFictiveReserveOut_,
      );

      const secondResultApplyK = await (this.contracts.smardexLibraryTest as SmardexLibraryTestV1).applyKConstRuleOut(
        getAmountTestCase.amountInToken0.sub(paramFirstAmountNoFees),
        resultApplyK.newReserveIn_,
        resultApplyK.newReserveOut_,
        computeFictiveReservesResult.newFictiveReserveIn_,
        computeFictiveReservesResult.newFictiveReserveOut_,
      );
      const amountOut = resultApplyK.amountOut_.add(secondResultApplyK.amountOut_);

      expect(amountOut).to.be.approximately(getAmountTestCase.amountOutToken1, 1_000_000_000);
      expect(secondResultApplyK.newReserveIn_).to.be.approximately(
        getAmountTestCase.expectedReserveToken0,
        1_000_000_000,
      );
      expect(secondResultApplyK.newReserveOut_).to.be.approximately(
        getAmountTestCase.expectedReserveToken1,
        1_000_000_000,
      );
      expect(secondResultApplyK.newFictiveReserveIn_).to.be.approximately(
        getAmountTestCase.expectedFictiveReserveToken0,
        1_000_000_000,
      );
      expect(secondResultApplyK.newFictiveReserveOut_).to.be.approximately(
        getAmountTestCase.expectedFictiveReserveToken1,
        1_000_000_000,
      );
    });
  });
}
