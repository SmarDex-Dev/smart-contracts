import { expect } from "chai";
import { BigNumber } from "ethers";
import { parseEther } from "ethers/lib/utils";
import { FEES_BASE, FEES_TOTAL_REVERSED, FEES_POOL, FEES_LP, PCT, BASE } from "../../constants";

import {
  getAmount2TradesTestData,
  getAmountSimpleTestData,
  getAmountsParams,
  GetAmountParametersStruct,
  SIDE_AMOUNT_OUT,
  isInRange,
} from "../utils";

import values_fees from "../values_fees.json";
import { SmardexLibraryTest } from "../../../typechain";

// array of params for getAmountOut
const amountsOutParams: GetAmountParametersStruct[] = getAmountsParams(SIDE_AMOUNT_OUT);

export function shouldBehaveLikeGetAmountOut(): void {
  it(`should revert when INSUFFICIENT_LIQUIDITY`, async function () {
    await expect(this.contracts.smardexRouter.getAmountOut(amountsOutParams[0])).to.be.revertedWith(
      "SmarDexLibrary: INSUFFICIENT_LIQUIDITY",
    );
    await expect(this.contracts.smardexRouter.getAmountOut(amountsOutParams[0])).to.be.revertedWith(
      "SmarDexLibrary: INSUFFICIENT_LIQUIDITY",
    );
    await expect(this.contracts.smardexRouter.getAmountOut(amountsOutParams[1])).to.be.revertedWith(
      "SmarDexLibrary: INSUFFICIENT_LIQUIDITY",
    );
  });

  it(`should revert when INSUFFICIENT_INPUT_AMOUNT`, async function () {
    await expect(this.contracts.smardexRouter.getAmountOut(amountsOutParams[2])).to.be.revertedWith(
      "SmarDexLibrary: INSUFFICIENT_INPUT_AMOUNT",
    );
  });

  it(`should return zero amount out with low parameters `, async function () {
    expect((await this.contracts.smardexRouter.getAmountOut(amountsOutParams[3])).amountOut_).to.eq(0);
  });

  getAmountSimpleTestData.concat(getAmount2TradesTestData).forEach((getAmountTestCase, i) => {
    it(`getAmountOut simple check : ${i + 1}`, async function () {
      const args: GetAmountParametersStruct = {
        amount: getAmountTestCase.amountInToken0,
        reserveIn: getAmountTestCase.reserveToken0,
        reserveOut: getAmountTestCase.reserveToken1,
        fictiveReserveIn: getAmountTestCase.fictiveReserveToken0,
        fictiveReserveOut: getAmountTestCase.fictiveReserveToken1,
        priceAverageIn: getAmountTestCase.priceAverageToken0,
        priceAverageOut: getAmountTestCase.priceAverageToken1,
        feesLP: FEES_LP,
        feesPool: FEES_POOL,
      };

      const result = await (this.contracts.smardexLibraryTest as SmardexLibraryTest).getAmountOut(args);

      await isInRange(result.amountOut_, getAmountTestCase.amountOutToken1, PCT, BASE);
      await isInRange(result.newReserveIn_, getAmountTestCase.expectedReserveToken0, PCT, BASE);
      await isInRange(result.newReserveOut_, getAmountTestCase.expectedReserveToken1, PCT, BASE);
      await isInRange(result.newFictiveReserveIn_, getAmountTestCase.expectedFictiveReserveToken0, PCT, BASE);
      await isInRange(result.newFictiveReserveOut_, getAmountTestCase.expectedFictiveReserveToken1, PCT, BASE);
    });
  });

  getAmount2TradesTestData.forEach((getAmountTestCase, i) => {
    it(`getAmountOut check 2 trades : ${i + 1}`, async function () {
      const paramAmount = getAmountTestCase.amountInToken0.mul(FEES_TOTAL_REVERSED).div(FEES_BASE);
      const paramFirstAmount = await this.contracts.smardexLibraryTest.computeFirstTradeQtyIn(
        paramAmount,
        getAmountTestCase.fictiveReserveToken0,
        getAmountTestCase.fictiveReserveToken1,
        getAmountTestCase.priceAverageToken0,
        getAmountTestCase.priceAverageToken1,
        FEES_LP,
        FEES_POOL,
      );
      const paramFirstAmountNoFees = paramFirstAmount.mul(FEES_BASE).div(FEES_TOTAL_REVERSED);

      const resultApplyK = await this.contracts.smardexLibraryTest.applyKConstRuleOut(
        paramFirstAmountNoFees,
        getAmountTestCase.reserveToken0,
        getAmountTestCase.reserveToken1,
        getAmountTestCase.fictiveReserveToken0,
        getAmountTestCase.fictiveReserveToken1,
        FEES_LP,
        FEES_POOL,
      );
      expect(paramFirstAmount).to.be.lt(paramAmount);

      const computeFictiveReservesResult = await this.contracts.smardexLibraryTest.computeFictiveReserves(
        resultApplyK.newReserveIn_,
        resultApplyK.newReserveOut_,
        resultApplyK.newFictiveReserveIn_,
        resultApplyK.newFictiveReserveOut_,
      );

      const secondResultApplyK = await this.contracts.smardexLibraryTest.applyKConstRuleOut(
        getAmountTestCase.amountInToken0.sub(paramFirstAmountNoFees),
        resultApplyK.newReserveIn_,
        resultApplyK.newReserveOut_,
        computeFictiveReservesResult.newFictiveReserveIn_,
        computeFictiveReservesResult.newFictiveReserveOut_,
        FEES_LP,
        FEES_POOL,
      );
      const amountOut = resultApplyK.amountOut_.add(secondResultApplyK.amountOut_);

      await isInRange(amountOut, getAmountTestCase.amountOutToken1, PCT, BASE);
      await isInRange(secondResultApplyK.newReserveIn_, getAmountTestCase.expectedReserveToken0, PCT, BASE);
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
    it(`getAmountOut simple check editable fees: ${i + 1}`, async function () {
      const args: GetAmountParametersStruct = {
        amount: parseEther(getAmountTestCase.amountInToken0),
        reserveIn: parseEther(getAmountTestCase.reserveToken0),
        reserveOut: parseEther(getAmountTestCase.reserveToken1),
        fictiveReserveIn: parseEther(getAmountTestCase.fictiveReserveToken0),
        fictiveReserveOut: parseEther(getAmountTestCase.fictiveReserveToken1),
        priceAverageIn: parseEther(getAmountTestCase.priceAverageToken0),
        priceAverageOut: parseEther(getAmountTestCase.priceAverageToken1),
        feesLP: BigNumber.from(getAmountTestCase.feesLP),
        feesPool: BigNumber.from(getAmountTestCase.feesPool),
      };

      const result = await (this.contracts.smardexLibraryTest as SmardexLibraryTest).getAmountOut(args);

      await isInRange(result.amountOut_, parseEther(getAmountTestCase.amountOutToken1), PCT, BASE);
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

  // to apply some elements
  const filtered = [5, 6, 7, 8, 14, 15, 16, 17, 23, 24, 25, 26, 32, 33, 35];

  values_fees
    .filter((el, index) => {
      if (filtered.includes(index)) return el;
    })
    .forEach((getAmountTestCase, i) => {
      it(`getAmountOut check 2 trades editable fees: ${i + 1}`, async function () {
        const FEES = BigNumber.from(getAmountTestCase.feesLP).add(BigNumber.from(getAmountTestCase.feesPool));
        const paramAmount = parseEther(getAmountTestCase.amountInToken0).mul(FEES_BASE.sub(FEES)).div(FEES_BASE);

        const paramFirstAmount = await this.contracts.smardexLibraryTest.computeFirstTradeQtyIn(
          paramAmount,
          parseEther(getAmountTestCase.fictiveReserveToken0),
          parseEther(getAmountTestCase.fictiveReserveToken1),
          parseEther(getAmountTestCase.priceAverageToken0),
          parseEther(getAmountTestCase.priceAverageToken1),
          getAmountTestCase.feesLP,
          getAmountTestCase.feesPool,
        );

        const paramFirstAmountNoFees = paramFirstAmount.mul(FEES_BASE).div(FEES_BASE.sub(FEES));

        const resultApplyK = await this.contracts.smardexLibraryTest.applyKConstRuleOut(
          paramFirstAmountNoFees,
          parseEther(getAmountTestCase.reserveToken0),
          parseEther(getAmountTestCase.reserveToken1),
          parseEther(getAmountTestCase.fictiveReserveToken0),
          parseEther(getAmountTestCase.fictiveReserveToken1),
          getAmountTestCase.feesLP,
          getAmountTestCase.feesPool,
        );

        expect(paramFirstAmount).to.be.lt(paramAmount);

        const computeFictiveReservesResult = await this.contracts.smardexLibraryTest.computeFictiveReserves(
          resultApplyK.newReserveIn_,
          resultApplyK.newReserveOut_,
          resultApplyK.newFictiveReserveIn_,
          resultApplyK.newFictiveReserveOut_,
        );

        const secondResultApplyK = await this.contracts.smardexLibraryTest.applyKConstRuleOut(
          parseEther(getAmountTestCase.amountInToken0).sub(paramFirstAmountNoFees),
          resultApplyK.newReserveIn_,
          resultApplyK.newReserveOut_,
          computeFictiveReservesResult.newFictiveReserveIn_,
          computeFictiveReservesResult.newFictiveReserveOut_,
          BigNumber.from(getAmountTestCase.feesLP),
          BigNumber.from(getAmountTestCase.feesPool),
        );

        const amountOut = resultApplyK.amountOut_.add(secondResultApplyK.amountOut_);

        await isInRange(amountOut, parseEther(getAmountTestCase.amountOutToken1), PCT, BASE);
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
