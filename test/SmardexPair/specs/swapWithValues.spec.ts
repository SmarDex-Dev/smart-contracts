import { expect } from "chai";
import { getAmount2TradesTestData, getAmountSimpleTestData, GetAmountTrade } from "../../SmardexLibrary/utils";
import { hexConcat } from "ethers/lib/utils";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { FEES_BASE, FEES_POOL } from "../../constants";
import { Contracts, Signers } from "../../types";
import { BigNumber } from "ethers/lib/ethers";
import { getSwapEncodedData } from "../../utils";

export function shouldBehaveLikeSwapWithValues(): void {
  let PATH_ZERO_TO_ONE: string;
  let PATH_ONE_TO_ZERO: string;

  beforeEach(async function () {
    PATH_ZERO_TO_ONE = hexConcat([this.contracts.token0.address, this.contracts.token1.address]);
    PATH_ONE_TO_ZERO = hexConcat([this.contracts.token1.address, this.contracts.token0.address]);
  });

  getAmountSimpleTestData.concat(getAmount2TradesTestData).forEach((getAmountTestCase, i) => {
    it(`swap, exact tokenIn, token0 to token1, feeTo empty : ${i + 1}`, async function () {
      await swapTest(this.contracts, this.signers, getAmountTestCase, true, true, false);
    });

    it(`swap, exact tokenIn, token0 to token1, feeTo set : ${i + 1}`, async function () {
      await swapTest(this.contracts, this.signers, getAmountTestCase, true, true, true);
    });

    it(`swap, exact tokenIn, token1 to token0, feeTo empty : ${i + 1}`, async function () {
      await swapTest(this.contracts, this.signers, getAmountTestCase, true, false, false);
    });

    it(`swap, exact tokenIn, token1 to token0, feeTo set : ${i + 1}`, async function () {
      await swapTest(this.contracts, this.signers, getAmountTestCase, true, false, true);
    });

    it(`swap, exact tokenOut, token0 to token1, feeTo empty : ${i + 1}`, async function () {
      await swapTest(this.contracts, this.signers, getAmountTestCase, false, true, false);
    });

    it(`swap, exact tokenOut, token0 to token1, feeTo set : ${i + 1}`, async function () {
      await swapTest(this.contracts, this.signers, getAmountTestCase, false, true, true);
    });

    it(`swap, exact tokenOut, token1 to token0, feeTo empty : ${i + 1}`, async function () {
      await swapTest(this.contracts, this.signers, getAmountTestCase, false, false, false);
    });

    it(`swap, exact tokenOut, token1 to token0, feeTo set : ${i + 1}`, async function () {
      await swapTest(this.contracts, this.signers, getAmountTestCase, false, false, true);
    });
  });

  async function swapTest(
    contracts: Contracts,
    signers: Signers,
    getAmountTestCase: GetAmountTrade,
    isExactTokenIn: boolean,
    isToken0ToToken1: boolean,
    isFeeToSet: boolean,
  ) {
    if (isFeeToSet) {
      await contracts.smardexFactory.setFeeTo(signers.feeTo.address);
    }
    await setupPair(contracts, signers, getAmountTestCase, isToken0ToToken1);

    const balanceTokenInAdminBefore = isToken0ToToken1
      ? await contracts.token0.balanceOf(signers.admin.address)
      : await contracts.token1.balanceOf(signers.admin.address);
    await swap(
      contracts,
      signers,
      isToken0ToToken1,
      isExactTokenIn ? getAmountTestCase.amountInToken0.toString() : "-" + getAmountTestCase.amountOutToken1,
    );

    await checkResults(contracts, signers, getAmountTestCase, isToken0ToToken1, balanceTokenInAdminBefore);
    await checkFees(contracts, getAmountTestCase.amountInToken0, getAmountTestCase, isFeeToSet, isToken0ToToken1);
  }

  async function setupPair(
    contracts: Contracts,
    signers: Signers,
    getAmountTestCase: GetAmountTrade,
    isSwapToken0ToToken1: boolean,
  ) {
    await contracts.routerForPairTest.mint(
      contracts.smardexPairTest.address,
      signers.admin.address,
      isSwapToken0ToToken1 ? getAmountTestCase.reserveToken0 : getAmountTestCase.reserveToken1,
      isSwapToken0ToToken1 ? getAmountTestCase.reserveToken1 : getAmountTestCase.reserveToken0,
      signers.admin.address,
    );

    const reserves = await contracts.smardexPairTest.getReserves();
    await expect(reserves.reserve0_).to.be.eq(
      isSwapToken0ToToken1 ? getAmountTestCase.reserveToken0 : getAmountTestCase.reserveToken1,
    );
    await expect(reserves.reserve1_).to.be.eq(
      isSwapToken0ToToken1 ? getAmountTestCase.reserveToken1 : getAmountTestCase.reserveToken0,
    );

    await contracts.smardexPairTest.setFictivePoolValues(
      isSwapToken0ToToken1 ? getAmountTestCase.fictiveReserveToken0 : getAmountTestCase.fictiveReserveToken1,
      isSwapToken0ToToken1 ? getAmountTestCase.fictiveReserveToken1 : getAmountTestCase.fictiveReserveToken0,
    );
    const currentTimestamp = await time.latest();
    await contracts.smardexPairTest.setPriceAverage(
      isSwapToken0ToToken1 ? getAmountTestCase.priceAverageToken0 : getAmountTestCase.priceAverageToken1,
      isSwapToken0ToToken1 ? getAmountTestCase.priceAverageToken1 : getAmountTestCase.priceAverageToken0,
      currentTimestamp + 2, //add 2, so in the next block it will be the same timestamp
    );
  }

  async function swap(contracts: Contracts, signers: Signers, isSwapToken0ToToken1: boolean, amountSpecified: string) {
    await expect(
      contracts.routerForPairTest.swap(
        contracts.smardexPairTest.address,
        signers.user.address,
        isSwapToken0ToToken1,
        amountSpecified,
        getSwapEncodedData(signers.admin.address, isSwapToken0ToToken1 ? PATH_ZERO_TO_ONE : PATH_ONE_TO_ZERO),
      ),
    ).to.emit(contracts.smardexPairTest, "Swap");
  }

  async function checkResults(
    contracts: Contracts,
    signers: Signers,
    getAmountTestCase: GetAmountTrade,
    isSwapToken0ToToken1: boolean,
    balanceTokenInAdminBefore: BigNumber,
  ) {
    const priceAverageAfter = await contracts.smardexPairTest.getPriceAverage();
    await expect(priceAverageAfter.priceAverage0_).to.be.eq(
      isSwapToken0ToToken1 ? getAmountTestCase.priceAverageToken0 : getAmountTestCase.priceAverageToken1,
    );
    await expect(priceAverageAfter.priceAverage1_).to.be.eq(
      isSwapToken0ToToken1 ? getAmountTestCase.priceAverageToken1 : getAmountTestCase.priceAverageToken0,
    );

    if (isSwapToken0ToToken1) {
      await expect(await contracts.token0.balanceOf(signers.admin.address)).to.be.approximately(
        balanceTokenInAdminBefore.sub(getAmountTestCase.amountInToken0),
        1_000_000_000,
      );
      await expect(await contracts.token1.balanceOf(signers.user.address)).to.be.approximately(
        getAmountTestCase.amountOutToken1,
        1_000_000_000,
      );
    } else {
      await expect(await contracts.token0.balanceOf(signers.user.address)).to.be.approximately(
        getAmountTestCase.amountOutToken1,
        1_000_000_000,
      );
      await expect(await contracts.token1.balanceOf(signers.admin.address)).to.be.approximately(
        balanceTokenInAdminBefore.sub(getAmountTestCase.amountInToken0),
        1_000_000_000,
      );
    }

    const fictiveReservesAfter = await contracts.smardexPairTest.getFictiveReserves();
    await expect(fictiveReservesAfter.fictiveReserve0_).to.be.approximately(
      isSwapToken0ToToken1
        ? getAmountTestCase.expectedFictiveReserveToken0
        : getAmountTestCase.expectedFictiveReserveToken1,
      1_000_000_000,
    );
    await expect(fictiveReservesAfter.fictiveReserve1_).to.be.approximately(
      isSwapToken0ToToken1
        ? getAmountTestCase.expectedFictiveReserveToken1
        : getAmountTestCase.expectedFictiveReserveToken0,
      1_000_000_000,
    );
  }

  async function checkFees(
    contracts: Contracts,
    amountIn: BigNumber,
    getAmountTestCase: GetAmountTrade,
    isFeeToSet: boolean,
    isSwapToken0ToToken1: boolean,
  ) {
    const fees = await contracts.smardexPairTest.getFees();
    const reserves = await contracts.smardexPairTest.getReserves();
    const balancePairToken0 = await contracts.token0.balanceOf(contracts.smardexPairTest.address);
    const balancePairToken1 = await contracts.token1.balanceOf(contracts.smardexPairTest.address);

    const feesAmount = amountIn.mul(FEES_POOL).div(FEES_BASE);
    if (isFeeToSet) {
      if (isSwapToken0ToToken1) {
        await expect(fees.fees0_).to.be.approximately(feesAmount, 10_000);
        await expect(fees.fees1_).to.be.eq(0);

        await expect(balancePairToken0).to.be.eq(fees.fees0_.add(reserves.reserve0_));
        await expect(balancePairToken1).to.be.eq(reserves.reserve1_);

        await expect(reserves.reserve0_).to.be.approximately(getAmountTestCase.expectedReserveToken0, 1_000_000_000);
        await expect(reserves.reserve1_).to.be.approximately(getAmountTestCase.expectedReserveToken1, 1_000_000_000);
      } else {
        await expect(fees.fees0_).to.be.eq(0);
        await expect(fees.fees1_).to.be.approximately(feesAmount, 10_000);

        await expect(balancePairToken0).to.be.eq(reserves.reserve0_);
        await expect(balancePairToken1).to.be.eq(fees.fees1_.add(reserves.reserve1_));

        await expect(reserves.reserve0_).to.be.approximately(getAmountTestCase.expectedReserveToken1, 1_000_000_000);
        await expect(reserves.reserve1_).to.be.approximately(getAmountTestCase.expectedReserveToken0, 1_000_000_000);
      }
    } else {
      await expect(fees.fees0_).to.be.eq(0);
      await expect(fees.fees1_).to.be.eq(0);

      await expect(balancePairToken0).to.be.eq(reserves.reserve0_);
      await expect(balancePairToken1).to.be.eq(reserves.reserve1_);

      if (isSwapToken0ToToken1) {
        await expect(reserves.reserve0_).to.be.approximately(
          getAmountTestCase.expectedReserveToken0.add(feesAmount),
          1_000_000_000,
        );
        await expect(reserves.reserve1_).to.be.approximately(getAmountTestCase.expectedReserveToken1, 1_000_000_000);
      } else {
        await expect(reserves.reserve0_).to.be.approximately(getAmountTestCase.expectedReserveToken1, 1_000_000_000);
        await expect(reserves.reserve1_).to.be.approximately(
          getAmountTestCase.expectedReserveToken0.add(feesAmount),
          1_000_000_000,
        );
      }
    }
  }
}
