import { expect } from "chai";
import { BigNumber } from "ethers";
import { parseEther } from "ethers/lib/utils";
import { FEES_POOL, FEES_LP, PCT, BASE } from "../../constants";

import {
  getAmount2TradesTestData,
  getAmountSimpleTestData,
  getAmountsParams,
  GetAmountParametersStruct,
  isInRange,
  SIDE_AMOUNT_IN,
} from "../utils";

import values_fees from "../values_fees.json";
import { SmardexLibraryTest } from "../../../typechain";

// array of params for getAmountIn
const amountsInParams: GetAmountParametersStruct[] = getAmountsParams(SIDE_AMOUNT_IN);

export function shouldBehaveLikeGetAmountIn(): void {
  it("should revert when INSUFFICIENT_LIQUIDITY", async function () {
    await expect(this.contracts.smardexRouter.getAmountIn(amountsInParams[0])).to.be.revertedWith(
      "SmarDexLibrary: INSUFFICIENT_LIQUIDITY",
    );

    await expect(this.contracts.smardexRouter.getAmountIn(amountsInParams[1])).to.be.revertedWith(
      "SmarDexLibrary: INSUFFICIENT_LIQUIDITY",
    );
  });

  it(`should revert when INSUFFICIENT_OUTPUT_AMOUNT`, async function () {
    await expect(this.contracts.smardexRouter.getAmountIn(amountsInParams[2])).to.be.revertedWith(
      "SmarDexLibrary: INSUFFICIENT_OUTPUT_AMOUNT",
    );
  });

  it(`execute with low parameters `, async function () {
    expect((await this.contracts.smardexRouter.getAmountIn(amountsInParams[3])).amountIn_).to.eq(2);
  });

  getAmountSimpleTestData.concat(getAmount2TradesTestData).forEach((getAmountTestCase, i) => {
    it(`getAmountIn simple check : ${i + 1}`, async function () {
      const args: GetAmountParametersStruct = {
        amount: getAmountTestCase.amountOutToken1,
        reserveIn: getAmountTestCase.reserveToken0,
        reserveOut: getAmountTestCase.reserveToken1,
        fictiveReserveIn: getAmountTestCase.fictiveReserveToken0,
        fictiveReserveOut: getAmountTestCase.fictiveReserveToken1,
        priceAverageIn: getAmountTestCase.priceAverageToken0,
        priceAverageOut: getAmountTestCase.priceAverageToken1,
        feesLP: FEES_LP,
        feesPool: FEES_POOL,
      };

      const result = await (this.contracts.smardexLibraryTest as SmardexLibraryTest).getAmountIn(args);

      await isInRange(result.amountIn_, getAmountTestCase.amountInToken0, PCT, BASE);
      await isInRange(result.newReserveIn_, getAmountTestCase.expectedReserveToken0, PCT, BASE);
      await isInRange(result.newReserveOut_, getAmountTestCase.expectedReserveToken1, PCT, BASE);
      await isInRange(result.newFictiveReserveIn_, getAmountTestCase.expectedFictiveReserveToken0, PCT, BASE);
      await isInRange(result.newFictiveReserveOut_, getAmountTestCase.expectedFictiveReserveToken1, PCT, BASE);
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
        FEES_LP,
        FEES_POOL,
      );
      expect(paramFirstAmount).to.be.lt(paramAmount);

      const resultApplyK = await this.contracts.smardexLibraryTest.applyKConstRuleIn(
        paramFirstAmount,
        getAmountTestCase.reserveToken0,
        getAmountTestCase.reserveToken1,
        getAmountTestCase.fictiveReserveToken0,
        getAmountTestCase.fictiveReserveToken1,
        FEES_LP,
        FEES_POOL,
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
        FEES_LP,
        FEES_POOL,
      );
      const amountIn = resultApplyK.amountIn_.add(secondResultApplyK.amountIn_);

      await isInRange(amountIn, getAmountTestCase.amountInToken0, PCT, BASE);
      await isInRange(secondResultApplyK.newReserveIn_, getAmountTestCase.expectedReserveToken0, PCT, BASE);
      await isInRange(secondResultApplyK.newReserveOut_, getAmountTestCase.expectedReserveToken1, PCT, BASE);
      await isInRange(secondResultApplyK.newReserveOut_, getAmountTestCase.expectedReserveToken1, PCT, BASE);
      await isInRange(
        secondResultApplyK.newFictiveReserveIn_,
        getAmountTestCase.expectedFictiveReserveToken0,
        PCT,
        BASE,
      );
      await isInRange(
        secondResultApplyK.newFictiveReserveOut_,
        getAmountTestCase.expectedFictiveReserveToken1,
        PCT,
        BASE,
      );
    });
  });

  values_fees.forEach((getAmountTestCase, i) => {
    it(`getAmountIn simple check editable fees: ${i + 1}`, async function () {
      const args: GetAmountParametersStruct = {
        amount: parseEther(getAmountTestCase.amountOutToken1),
        reserveIn: parseEther(getAmountTestCase.reserveToken0),
        reserveOut: parseEther(getAmountTestCase.reserveToken1),
        fictiveReserveIn: parseEther(getAmountTestCase.fictiveReserveToken0),
        fictiveReserveOut: parseEther(getAmountTestCase.fictiveReserveToken1),
        priceAverageIn: parseEther(getAmountTestCase.priceAverageToken0),
        priceAverageOut: parseEther(getAmountTestCase.priceAverageToken1),
        feesLP: BigNumber.from(getAmountTestCase.feesLP),
        feesPool: BigNumber.from(getAmountTestCase.feesPool),
      };

      const result = await (this.contracts.smardexLibraryTest as SmardexLibraryTest).getAmountIn(args);

      await isInRange(result.amountIn_, parseEther(getAmountTestCase.amountInToken0), PCT, BASE);
      await isInRange(result.newReserveIn_, parseEther(getAmountTestCase.expectedReserveToken0), PCT, BASE);
      await isInRange(result.newReserveOut_, parseEther(getAmountTestCase.expectedReserveToken1), PCT, BASE);
      await isInRange(
        result.newFictiveReserveIn_,
        parseEther(getAmountTestCase.expectedFictiveReserveToken0),
        PCT,
        BASE,
      );
      await isInRange(
        result.newFictiveReserveOut_,
        parseEther(getAmountTestCase.expectedFictiveReserveToken1),
        PCT,
        BASE,
      );
    });
  });

  // to apply only elements like getAmount2TradesTestData
  const filtered = [5, 6, 7, 8, 14, 15, 16, 17, 23, 24, 25, 26, 32, 33, 35];

  values_fees
    .filter((el, index) => {
      if (filtered.includes(index)) return el;
    })
    .forEach((getAmountTestCase, i) => {
      it(`getAmountIn check 2 trades editable fees: ${i + 1}`, async function () {
        const paramAmount = parseEther(getAmountTestCase.amountOutToken1);
        const paramFirstAmount = await this.contracts.smardexLibraryTest.computeFirstTradeQtyOut(
          paramAmount,
          parseEther(getAmountTestCase.fictiveReserveToken0),
          parseEther(getAmountTestCase.fictiveReserveToken1),
          parseEther(getAmountTestCase.priceAverageToken0),
          parseEther(getAmountTestCase.priceAverageToken1),
          BigNumber.from(getAmountTestCase.feesLP),
          BigNumber.from(getAmountTestCase.feesPool),
        );
        expect(paramFirstAmount).to.be.lt(paramAmount);

        const resultApplyK = await this.contracts.smardexLibraryTest.applyKConstRuleIn(
          paramFirstAmount,
          parseEther(getAmountTestCase.reserveToken0),
          parseEther(getAmountTestCase.reserveToken1),
          parseEther(getAmountTestCase.fictiveReserveToken0),
          parseEther(getAmountTestCase.fictiveReserveToken1),
          BigNumber.from(getAmountTestCase.feesLP),
          BigNumber.from(getAmountTestCase.feesPool),
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
          getAmountTestCase.feesLP,
          getAmountTestCase.feesPool,
        );

        const amountIn = resultApplyK.amountIn_.add(secondResultApplyK.amountIn_);

        await isInRange(amountIn, parseEther(getAmountTestCase.amountInToken0), PCT, BASE);
        await isInRange(
          secondResultApplyK.newReserveIn_,
          parseEther(getAmountTestCase.expectedReserveToken0),
          PCT,
          BASE,
        );
        await isInRange(
          secondResultApplyK.newReserveOut_,
          parseEther(getAmountTestCase.expectedReserveToken1),
          PCT,
          BASE,
        );
        await isInRange(
          secondResultApplyK.newFictiveReserveIn_,
          parseEther(getAmountTestCase.expectedFictiveReserveToken0),
          PCT,
          BASE,
        );
        await isInRange(
          secondResultApplyK.newFictiveReserveOut_,
          parseEther(getAmountTestCase.expectedFictiveReserveToken1),
          PCT,
          BASE,
        );
      });
    });
}
