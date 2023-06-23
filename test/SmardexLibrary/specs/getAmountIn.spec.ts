import { expect } from "chai";
import { getAmountSimpleTestData, getAmount2TradesTestData } from "../utils";

export function shouldBehaveLikeGetAmountIn(): void {
  it("should revert when INSUFFICIENT_LIQUIDITY", async function () {
    await expect(this.contracts.smardexRouter.getAmountIn(1, 0, 100, 0, 50, 1, 1)).to.be.revertedWith(
      "SmarDexLibrary: INSUFFICIENT_LIQUIDITY",
    );
    await expect(this.contracts.smardexRouter.getAmountIn(1, 100, 0, 50, 0, 1, 1)).to.be.revertedWith(
      "SmarDexLibrary: INSUFFICIENT_LIQUIDITY",
    );
  });

  it(`should revert when INSUFFICIENT_OUTPUT_AMOUNT`, async function () {
    await expect(this.contracts.smardexRouter.getAmountIn(0, 100, 100, 10, 10, 1, 1)).to.be.revertedWith(
      "SmarDexLibrary: INSUFFICIENT_OUTPUT_AMOUNT",
    );
  });

  it(`execute with low parameters `, async function () {
    expect((await this.contracts.smardexRouter.getAmountIn(1, 100, 100, 10, 10, 1, 1)).amountIn_).to.eq(2);
  });

  getAmountSimpleTestData.concat(getAmount2TradesTestData).forEach((getAmountTestCase, i) => {
    it(`getAmountIn simple check : ${i + 1}`, async function () {
      const result = await this.contracts.smardexLibraryTest.getAmountIn(
        getAmountTestCase.amountOutToken1,
        getAmountTestCase.reserveToken0,
        getAmountTestCase.reserveToken1,
        getAmountTestCase.fictiveReserveToken0,
        getAmountTestCase.fictiveReserveToken1,
        getAmountTestCase.priceAverageToken0,
        getAmountTestCase.priceAverageToken1,
      );

      expect(result.amountIn_).to.be.approximately(getAmountTestCase.amountInToken0, 1_000_000_000);
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
    it(`getAmountIn check 2 trades : ${i + 1}`, async function () {
      const paramAmount = getAmountTestCase.amountOutToken1;
      const paramFirstAmount = await this.contracts.smardexLibraryTest.computeFirstTradeQtyOut(
        paramAmount,
        getAmountTestCase.fictiveReserveToken0,
        getAmountTestCase.fictiveReserveToken1,
        getAmountTestCase.priceAverageToken0,
        getAmountTestCase.priceAverageToken1,
      );
      expect(paramFirstAmount).to.be.lt(paramAmount);

      const resultApplyK = await this.contracts.smardexLibraryTest.applyKConstRuleIn(
        paramFirstAmount,
        getAmountTestCase.reserveToken0,
        getAmountTestCase.reserveToken1,
        getAmountTestCase.fictiveReserveToken0,
        getAmountTestCase.fictiveReserveToken1,
      );

      const computeFictiveReservesResult = await this.contracts.smardexLibraryTest.computeFictiveReserves(
        resultApplyK.newReserveIn_,
        resultApplyK.newReserveOut_,
        resultApplyK.newFictiveReserveIn_,
        resultApplyK.newFictiveReserveOut_,
      );

      const paramSecondAmount = paramAmount.sub(paramFirstAmount);
      const secondResultApplyK = await this.contracts.smardexLibraryTest.applyKConstRuleIn(
        paramSecondAmount,
        resultApplyK.newReserveIn_,
        resultApplyK.newReserveOut_,
        computeFictiveReservesResult.newFictiveReserveIn_,
        computeFictiveReservesResult.newFictiveReserveOut_,
      );
      const amountIn = resultApplyK.amountIn_.add(secondResultApplyK.amountIn_);

      expect(amountIn).to.be.approximately(getAmountTestCase.amountInToken0, 1_000_000_000);
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
