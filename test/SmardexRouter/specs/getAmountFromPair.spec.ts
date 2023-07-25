import { expect } from "chai";
import { getAmount2TradesTestData } from "../../SmardexLibrary/utils";
import { ethers } from "hardhat";

export function shouldBehaveLikeSmardexRouterGetAmountFromPair(): void {
  getAmount2TradesTestData.forEach((getAmountTestCase, i) => {
    it(`getAmountOut simple check : ${i + 1}`, async function () {
      await this.contracts.token0.transfer(this.contracts.smardexPairTest.address, getAmountTestCase.reserveToken0);
      await this.contracts.token1.transfer(this.contracts.smardexPairTest.address, getAmountTestCase.reserveToken1);

      await this.contracts.smardexPairTest.setFictivePoolValues(
        getAmountTestCase.fictiveReserveToken0,
        getAmountTestCase.fictiveReserveToken1,
      );

      // use last block timestamp due to github ci/cd
      const timestamp = (await ethers.provider.getBlock("latest")).timestamp;
      await this.contracts.smardexPairTest.setPriceAverage(
        getAmountTestCase.priceAverageToken0,
        getAmountTestCase.priceAverageToken1,
        timestamp,
      );

      const result = await this.contracts.smardexRouterTest.getAmountOutFromPair(
        getAmountTestCase.amountInToken0,
        await this.contracts.token0.address,
        await this.contracts.token1.address,
      );

      const PRECISON = 10;

      // big imprecision due to timestamp change
      expect(result.amountOut_).to.be.approximately(
        getAmountTestCase.amountOutToken1,
        getAmountTestCase.amountOutToken1.div(PRECISON),
      );
      expect(result.newReserveIn_).to.be.approximately(
        getAmountTestCase.expectedReserveToken0,
        getAmountTestCase.expectedReserveToken0.div(PRECISON),
      );
      expect(result.newReserveOut_).to.be.approximately(
        getAmountTestCase.expectedReserveToken1,
        getAmountTestCase.expectedReserveToken1.div(PRECISON),
      );
      expect(result.newFictiveReserveIn_).to.be.approximately(
        getAmountTestCase.expectedFictiveReserveToken0,
        getAmountTestCase.expectedFictiveReserveToken0.div(PRECISON),
      );
      expect(result.newFictiveReserveOut_).to.be.approximately(
        getAmountTestCase.expectedFictiveReserveToken1,
        getAmountTestCase.expectedFictiveReserveToken1.div(PRECISON),
      );
    });
  });

  getAmount2TradesTestData.forEach((getAmountTestCase, i) => {
    it(`getAmountOut simple check : ${i + 1}`, async function () {
      await this.contracts.token0.transfer(this.contracts.smardexPairTest.address, getAmountTestCase.reserveToken0);
      await this.contracts.token1.transfer(this.contracts.smardexPairTest.address, getAmountTestCase.reserveToken1);

      await this.contracts.smardexPairTest.setFictivePoolValues(
        getAmountTestCase.fictiveReserveToken0,
        getAmountTestCase.fictiveReserveToken1,
      );

      // use last block timestamp due to github ci/cd
      const timestamp = (await ethers.provider.getBlock("latest")).timestamp;

      await this.contracts.smardexPairTest.setPriceAverage(
        getAmountTestCase.priceAverageToken0,
        getAmountTestCase.priceAverageToken1,
        timestamp,
      );

      const result = await this.contracts.smardexRouterTest.getAmountInFromPair(
        getAmountTestCase.amountOutToken1,
        await this.contracts.token0.address,
        await this.contracts.token1.address,
      );

      // big imprecision due to timestamp change
      const PRECISON = 10;

      expect(result.amountIn_).to.be.approximately(
        getAmountTestCase.amountInToken0,
        getAmountTestCase.amountInToken0.div(PRECISON),
      );
      expect(result.newReserveIn_).to.be.approximately(
        getAmountTestCase.expectedReserveToken0,
        getAmountTestCase.expectedReserveToken0.div(PRECISON),
      );
      expect(result.newReserveOut_).to.be.approximately(
        getAmountTestCase.expectedReserveToken1,
        getAmountTestCase.expectedReserveToken1.div(PRECISON),
      );
      expect(result.newFictiveReserveIn_).to.be.approximately(
        getAmountTestCase.expectedFictiveReserveToken0,
        getAmountTestCase.expectedFictiveReserveToken0.div(PRECISON),
      );
      expect(result.newFictiveReserveOut_).to.be.approximately(
        getAmountTestCase.expectedFictiveReserveToken1,
        getAmountTestCase.expectedFictiveReserveToken1.div(PRECISON),
      );
    });
  });
}
