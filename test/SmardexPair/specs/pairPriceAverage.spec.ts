import { expect } from "chai";
import { parseEther } from "ethers/lib/utils";
import { MAX_BLOCK_DIFF_SECONDS, FEES_LP, FEES_POOL } from "../../constants";
import hre from "hardhat";
import { BigNumber, constants } from "ethers";
import { SmardexPair } from "../../../typechain";

const getCalculatedAveragePrice = (timeDiff: BigNumber, oldPriceAverage: BigNumber, newPrice: BigNumber) =>
  MAX_BLOCK_DIFF_SECONDS.sub(timeDiff).mul(oldPriceAverage).add(timeDiff.mul(newPrice)).div(MAX_BLOCK_DIFF_SECONDS);
//   (oldPriceAverage * (600 - TIME_DIFF) + newPrice * TIME_DIFF) / 600;

export function shouldBehaveLikeSmardexPairPriceAverage(): void {
  context("Price average after add Liquidity", function () {
    it("initial price", async function () {
      const pAv = await this.contracts.smardexPair.getPriceAverage();
      expect(pAv.priceAverage0_).to.be.eq(0);
      expect(pAv.priceAverage1_).to.be.eq(0);
      expect(pAv.priceAverageLastTimestamp_).to.be.eq(0);
    });
    it("Price after addLiquidity, same block", async function () {
      //add liquidity to pair
      await this.contracts.token0.approve(this.contracts.smardexRouterTest.address, parseEther("100000"));
      await this.contracts.token1.approve(this.contracts.smardexRouterTest.address, parseEther("100000"));

      await this.contracts.smardexRouterTest.addLiquidity(
        {
          tokenA: this.contracts.token0.address,
          tokenB: this.contracts.token1.address,
          amountADesired: parseEther("100000"),
          amountBDesired: parseEther("100000"), // price is 1:1
          amountAMin: 0,
          amountBMin: 0,
          fictiveReserveB: 0,
          fictiveReserveAMin: 0,
          fictiveReserveAMax: 0,
        },
        this.signers.admin.address,
        constants.MaxUint256,
      );
      const pAv = await this.contracts.smardexPair.getPriceAverage();
      expect(pAv.priceAverage0_).to.be.eq(0);
      expect(pAv.priceAverage1_).to.be.eq(0);
      expect(pAv.priceAverageLastTimestamp_).to.be.eq(0);
    });
    it("Price after 1 big swap", async function () {
      //add liquidity to pair
      await this.contracts.token0.approve(this.contracts.smardexRouterTest.address, parseEther("100000"));
      await this.contracts.token1.approve(this.contracts.smardexRouterTest.address, parseEther("100000"));

      // get block
      let block = await hre.ethers.provider.getBlock("latest");
      await hre.network.provider.request({
        method: "evm_setNextBlockTimestamp",
        params: [block.timestamp + 12],
      });
      await this.contracts.smardexRouterTest.addLiquidity(
        {
          tokenA: this.contracts.token0.address,
          tokenB: this.contracts.token1.address,
          amountADesired: parseEther("1000"),
          amountBDesired: parseEther("1000"), // price is 1:1
          amountAMin: 0,
          amountBMin: 0,
          fictiveReserveB: 0,
          fictiveReserveAMin: 0,
          fictiveReserveAMax: 0,
        },
        this.signers.admin.address,
        constants.MaxUint256,
      );
      //swap big
      await this.contracts.smardexRouterTest.swapExactTokensForTokens(
        parseEther("500"),
        0,
        [this.contracts.token0.address, this.contracts.token1.address],
        this.signers.admin.address,
        constants.MaxUint256,
      );

      let pAv = await this.contracts.smardexPair.getPriceAverage();
      expect(pAv.priceAverage0_).to.be.eq(parseEther("500"));
      expect(pAv.priceAverage1_).to.be.eq(parseEther("500"));
      expect(pAv.priceAverageLastTimestamp_).to.be.approximately(block.timestamp + 12, 1);

      let fictiveReserves = await this.contracts.smardexPair.getFictiveReserves();
      expect(fictiveReserves.fictiveReserve0_).to.be.eq(parseEther("999.9"));
      expect(fictiveReserves.fictiveReserve1_).to.be.eq(parseEther("250.087530635722502877"));

      const priceAvg = await this.contracts.smardexPair.getUpdatedPriceAverage(
        fictiveReserves.fictiveReserve0_,
        fictiveReserves.fictiveReserve1_,
        pAv.priceAverageLastTimestamp_,
        pAv.priceAverage0_,
        pAv.priceAverage1_,
        pAv.priceAverageLastTimestamp_,
      );
      expect(priceAvg.priceAverageIn_).to.be.eq(parseEther("500"));
      expect(priceAvg.priceAverageOut_).to.be.eq(parseEther("500"));
      // advance 10 minutes
      // mine blocks
      await hre.network.provider.request({
        method: "evm_setNextBlockTimestamp",
        params: [block.timestamp + 1000],
      });
      await hre.network.provider.request({ method: "hardhat_mine", params: ["0x1"] });
      const timestampAfter10mn = (await hre.ethers.provider.getBlock("latest")).timestamp;
      expect(timestampAfter10mn).to.be.eq(block.timestamp + 1000);
      pAv = await this.contracts.smardexPair.getPriceAverage();
      const priceAvgAfter10min = await this.contracts.smardexPair.getUpdatedPriceAverage(
        fictiveReserves.fictiveReserve0_,
        fictiveReserves.fictiveReserve1_,
        pAv.priceAverageLastTimestamp_,
        pAv.priceAverage0_,
        pAv.priceAverage1_,
        timestampAfter10mn + 24, // be sure to be far after 10 minutes
      );
      expect(priceAvgAfter10min).to.be.deep.eq([fictiveReserves.fictiveReserve0_, fictiveReserves.fictiveReserve1_]);
      // swap 1 wei just to update price, timestamp, and fictiveReserves
      await this.contracts.smardexRouterTest.swapExactTokensForTokens(
        1,
        0,
        [this.contracts.token0.address, this.contracts.token1.address],
        this.signers.admin.address,
        constants.MaxUint256,
      );
      pAv = await this.contracts.smardexPair.getPriceAverage();
      expect(pAv.priceAverageLastTimestamp_).to.be.approximately(block.timestamp + 1000, 1); //hardhat timestamp is not accurate
      const priceAvgAfter10minAndSwap = await this.contracts.smardexPair.getUpdatedPriceAverage(
        fictiveReserves.fictiveReserve0_,
        fictiveReserves.fictiveReserve1_,
        pAv.priceAverageLastTimestamp_,
        pAv.priceAverage0_,
        pAv.priceAverage1_,
        (await hre.ethers.provider.getBlock("latest")).timestamp + 24, // be sure to be far after 10 minutes
      );
      block = await hre.ethers.provider.getBlock("latest");
      const timeDiff = BigNumber.from(block.timestamp).sub(pAv.priceAverageLastTimestamp_);
      fictiveReserves = await this.contracts.smardexPair.getFictiveReserves();
      const calculatedPrice = getCalculatedAveragePrice(
        timeDiff,
        priceAvgAfter10min.priceAverageOut_.mul(constants.WeiPerEther).div(priceAvgAfter10min.priceAverageIn_),
        fictiveReserves.fictiveReserve0_.mul(constants.WeiPerEther).div(fictiveReserves.fictiveReserve1_),
      );
      expect(
        priceAvgAfter10minAndSwap.priceAverageOut_
          .mul(constants.WeiPerEther)
          .div(priceAvgAfter10minAndSwap.priceAverageIn_),
      ).to.be.approximately(
        calculatedPrice, // parseEther("0.250112542"),
        1_000_000,
      );
      expect(pAv.priceAverage0_).to.be.eq(priceAvgAfter10minAndSwap.priceAverageIn_);
      expect(pAv.priceAverage1_).to.be.eq(priceAvgAfter10minAndSwap.priceAverageOut_);
    });
    it("Price after 1 swap half reserve", async function () {
      try {
        await (this.contracts.smardexPair as SmardexPair).setFees(FEES_LP, FEES_POOL);
      } catch {
        // do nothing
      }
      //add liquidity to pair
      await this.contracts.token0.approve(this.contracts.smardexRouterTest.address, parseEther("100000"));
      await this.contracts.token1.approve(this.contracts.smardexRouterTest.address, parseEther("100000"));

      // get block
      const block = await hre.ethers.provider.getBlock("latest");
      await hre.network.provider.request({
        method: "evm_setNextBlockTimestamp",
        params: [block.timestamp + 12],
      });
      await this.contracts.smardexRouterTest.addLiquidity(
        {
          tokenA: this.contracts.token0.address,
          tokenB: this.contracts.token1.address,
          amountADesired: parseEther("1000"),
          amountBDesired: parseEther("1000"), // price is 1:1
          amountAMin: 0,
          amountBMin: 0,
          fictiveReserveB: 0,
          fictiveReserveAMin: 0,
          fictiveReserveAMax: 0,
        },
        this.signers.admin.address,
        constants.MaxUint256,
      );
      //swap big to move price half
      await this.contracts.smardexRouterTest.swapExactTokensForTokens(
        parseEther("250"),
        0,
        [this.contracts.token0.address, this.contracts.token1.address],
        this.signers.admin.address,
        constants.MaxUint256,
      );
      let pAv = await this.contracts.smardexPair.getPriceAverage();
      expect(pAv.priceAverageLastTimestamp_).to.be.approximately(block.timestamp + 12, 1); //hardhat timestamp is not accurate
      expect(pAv.priceAverage0_).to.be.eq(parseEther("500"));
      expect(pAv.priceAverage1_).to.be.eq(parseEther("500"));
      // advance 10 minutes
      await hre.network.provider.request({
        method: "evm_setNextBlockTimestamp",
        params: [block.timestamp + 1000],
      });

      // mine block with 1 wei swap to update price
      await this.contracts.smardexRouterTest.swapExactTokensForTokens(
        1,
        0,
        [this.contracts.token0.address, this.contracts.token1.address],
        this.signers.admin.address,
        constants.MaxUint256,
      );
      pAv = await this.contracts.smardexPair.getPriceAverage();
      expect(pAv.priceAverageLastTimestamp_).to.be.approximately(block.timestamp + 1000, 1); //hardhat timestamp is not accurate
      expect(pAv.priceAverage1_.mul(constants.WeiPerEther).div(pAv.priceAverage0_)).to.be.approximately(
        parseEther("0.444577810872051"), //Excel value
        1_000, //Excel precision is not enough for Solidity
      );
    });
    it("Price after 2 swaps, both sides, few blocks later", async function () {
      //add liquidity to pair
      await this.contracts.token0.approve(this.contracts.smardexRouterTest.address, parseEther("100000"));
      await this.contracts.token1.approve(this.contracts.smardexRouterTest.address, parseEther("100000"));

      // get block
      let block = await hre.ethers.provider.getBlock("latest");
      await this.contracts.smardexRouterTest.addLiquidity(
        {
          tokenA: this.contracts.token0.address,
          tokenB: this.contracts.token1.address,
          amountADesired: parseEther("1000"),
          amountBDesired: parseEther("1000"), // price is 1:1
          amountAMin: 0,
          amountBMin: 0,
          fictiveReserveB: 0,
          fictiveReserveAMin: 0,
          fictiveReserveAMax: 0,
        },
        this.signers.admin.address,
        constants.MaxUint256,
      );
      //swap big to move price
      await this.contracts.smardexRouterTest.swapExactTokensForTokens(
        parseEther("500"),
        0,
        [this.contracts.token0.address, this.contracts.token1.address],
        this.signers.admin.address,
        constants.MaxUint256,
      );
      // advance more than 10 minutes
      await hre.network.provider.request({
        method: "evm_setNextBlockTimestamp",
        params: [block.timestamp + 1000],
      });

      // mine block with 1 wei swap to update price
      await this.contracts.smardexRouterTest.swapExactTokensForTokens(
        1,
        0,
        [this.contracts.token0.address, this.contracts.token1.address],
        this.signers.admin.address,
        constants.MaxUint256,
      );
      let pAv = await this.contracts.smardexPair.getPriceAverage();
      expect(pAv.priceAverageLastTimestamp_).to.be.approximately(block.timestamp + 1000, 1); //hardhat timestamp is not accurate
      let fictiveReserves = await this.contracts.smardexPair.getFictiveReserves();
      let calculatedPrice = fictiveReserves.fictiveReserve1_
        .mul(constants.WeiPerEther)
        .div(fictiveReserves.fictiveReserve0_);
      expect(pAv.priceAverage1_.mul(constants.WeiPerEther).div(pAv.priceAverage0_)).to.be.approximately(
        calculatedPrice,
        1_000_000,
      );
      // Now we swap other side

      await this.contracts.smardexRouterTest.swapExactTokensForTokens(
        parseEther("500"),
        0,
        [this.contracts.token1.address, this.contracts.token0.address],
        this.signers.admin.address,
        constants.MaxUint256,
      );

      fictiveReserves = await this.contracts.smardexPair.getFictiveReserves();
      block = await hre.ethers.provider.getBlock("latest");
      // advance more than 10 minutes
      await hre.network.provider.request({
        method: "evm_setNextBlockTimestamp",
        params: [block.timestamp + 601],
      });
      //mine block and update prices
      await this.contracts.smardexRouterTest.swapExactTokensForTokens(
        1,
        0,
        [this.contracts.token0.address, this.contracts.token1.address],
        this.signers.admin.address,
        constants.MaxUint256,
      );

      pAv = await this.contracts.smardexPair.getPriceAverage();
      fictiveReserves = await this.contracts.smardexPair.getFictiveReserves();

      calculatedPrice = fictiveReserves.fictiveReserve1_
        .mul(constants.WeiPerEther)
        .div(fictiveReserves.fictiveReserve0_);
      expect(pAv.priceAverage1_.mul(constants.WeiPerEther).div(pAv.priceAverage0_)).to.be.approximately(
        calculatedPrice,
        1_000,
      );
    });
  });
}
