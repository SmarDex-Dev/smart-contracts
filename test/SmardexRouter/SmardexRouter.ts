import { constants } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import {
  unitFixtureCallbackTest,
  unitFixtureSmardexPairTest,
  unitFixtureSmardexRouter,
  unitFixtureSmardexRouterTest,
} from "../fixtures";
import { shouldBehaveLikeSmardexRouterQuote } from "./specs/quote.spec";
import { testExploit, testHack, testHack4, testNewSmardex } from "./specs/BestTrade.spec";
import { shouldBehaveLikeSmardexRouterPairFor } from "./specs/pairFor.spec";
import { shouldBehaveLikeRouterScenarios } from "./specs/RouterScenarios.spec";
import { shouldBehaveLikeMintCallback } from "./specs/mintCallback.spec";
import { shouldBehaveLikeAddLiquidity } from "./specs/addLiquidity.spec";
import { shouldBehaveLikeAddLiquidityETH } from "./specs/addLiquidityETH.spec";
import { shouldBehaveLikeRemoveLiquidity } from "./specs/removeLiquidity.spec";
import { shouldBehaveLikeRemoveLiquidityETH } from "./specs/removeLiquidityETH.spec";
import { shouldBehaveLikeRemoveLiquidityWithPermit } from "./specs/removeLiquidityWithPermit.spec";
import { shouldBehaveLikeRemoveLiquidityETHWithPermit } from "./specs/removeLiquidityETHWithPermit.spec";
import { shouldBehaveLikeSwapExactTokensForTokens } from "./specs/swapExactTokensForTokens.spec";
import { shouldBehaveLikeSwapTokensForExactTokens } from "./specs/swapTokensForExactTokens.spec";
import { shouldBehaveLikeSwapExactETHForTokens } from "./specs/swapExactETHForTokens.spec";
import { shouldBehaveLikeSwapTokensForExactETH } from "./specs/swapTokensForExactETH.spec";
import { shouldBehaveLikeSwapExactTokensForETH } from "./specs/swapExactTokensForETH.spec";
import { shouldBehaveLikeSwapETHForExactTokens } from "./specs/swapETHForExactTokens.spec";
import { shouldBehaveLikeSwapCallback } from "./specs/swapCallback.spec";
import { shouldBehaveLikeUnwrapWETH } from "./specs/unwrapWETH.spec";
import { shouldBehaveLikeCheckFailedTest } from "./specs/testnetCheckFailedTest";

export function unitTestsSmardexRouter(): void {
  describe("SmarDexRouter", function () {
    describe("Router Test", function () {
      beforeEach(async function () {
        const { token0, token1, factory, pair, smardexRouterTest, WETH } = await loadFixture(
          unitFixtureSmardexRouterTest,
        );

        this.contracts.token0 = token0;
        this.contracts.token1 = token1;
        this.contracts.smardexFactory = factory;
        this.contracts.smardexPair = pair;
        this.contracts.smardexRouterTest = smardexRouterTest;
        this.contracts.WETH = WETH;
      });

      describe("SmarDex Router pairFor", function () {
        shouldBehaveLikeSmardexRouterPairFor();
      });
      describe("SmarDex Router unwrapWETHTest", function () {
        shouldBehaveLikeUnwrapWETH();
      });
    });

    describe("SmarDexRouter user functions", function () {
      beforeEach(async function () {
        const { token0, token1, WETH, WETHPartner, factory, smardexRouter, pair, WETHPair, routerEventEmitter } =
          await loadFixture(unitFixtureSmardexRouter);
        this.contracts.token0 = token0;
        this.contracts.token1 = token1;
        this.contracts.WETH = WETH;
        this.contracts.WETHPartner = WETHPartner;
        this.contracts.smardexFactory = factory;
        this.contracts.smardexRouter = smardexRouter;
        this.contracts.smardexPair = pair;
        this.contracts.WETHPair = WETHPair;
        this.contracts.routerEventEmitter = routerEventEmitter;
        await this.contracts.token0.approve(this.contracts.smardexRouter.address, constants.MaxUint256);
        await this.contracts.token1.approve(this.contracts.smardexRouter.address, constants.MaxUint256);
        await this.contracts.WETHPartner.approve(this.contracts.smardexRouter.address, constants.MaxUint256);
        await this.contracts.WETH.approve(this.contracts.smardexRouter.address, constants.MaxUint256);
      });
      shouldBehaveLikeRouterScenarios();

      describe("Add Liquidity", function () {
        shouldBehaveLikeAddLiquidity();
      });
      describe("Add Liquidity ETH", function () {
        shouldBehaveLikeAddLiquidityETH();
      });
      describe("Remove Liquidity", function () {
        shouldBehaveLikeRemoveLiquidity();
      });
      describe("Remove Liquidity ETH", function () {
        shouldBehaveLikeRemoveLiquidityETH();
      });
      describe("Remove Liquidity With Permit", function () {
        shouldBehaveLikeRemoveLiquidityWithPermit();
      });
      describe("Remove Liquidity ETH With Permit", function () {
        shouldBehaveLikeRemoveLiquidityETHWithPermit();
      });
      describe("swapExactTokensForTokens", () => {
        shouldBehaveLikeSwapExactTokensForTokens();
      });
      describe("swapTokensForExactTokens", () => {
        shouldBehaveLikeSwapTokensForExactTokens();
      });
      describe("swapExactETHForTokens", () => {
        shouldBehaveLikeSwapExactETHForTokens();
      });
      describe("swapTokensForExactETH", () => {
        shouldBehaveLikeSwapTokensForExactETH();
      });
      describe("swapExactTokensForETH", () => {
        shouldBehaveLikeSwapExactTokensForETH();
      });
      describe("swapETHForExactTokens", () => {
        shouldBehaveLikeSwapETHForExactTokens();
      });

      describe("Router Quote", function () {
        shouldBehaveLikeSmardexRouterQuote();
      });
    });

    describe("check callback", function () {
      beforeEach(async function () {
        const { token0, token1, factory, smardexRouterCallbackTest, fakeERC20reentrancy, smardexRouter, pair, WETH } =
          await loadFixture(unitFixtureCallbackTest);
        this.contracts.token0 = token0;
        this.contracts.token1 = token1;
        this.contracts.WETH = WETH;

        this.contracts.smardexFactory = factory;
        this.contracts.smardexRouterCallbackTest = smardexRouterCallbackTest;
        this.contracts.fakeERC20reentrancy = fakeERC20reentrancy;
        this.contracts.smardexRouter = smardexRouter;
        this.contracts.smardexPair = pair;
        //set feeto
        await this.contracts.smardexFactory.setFeeTo(this.signers.feeTo.address);
        await this.contracts.token0.approve(this.contracts.smardexRouter.address, constants.MaxUint256);
        await this.contracts.token1.approve(this.contracts.smardexRouter.address, constants.MaxUint256);
        await this.contracts.token0.approve(this.contracts.smardexRouterCallbackTest.address, constants.MaxUint256);
        await this.contracts.token1.approve(this.contracts.smardexRouterCallbackTest.address, constants.MaxUint256);
      });
      describe("Mint callback", function () {
        shouldBehaveLikeMintCallback();
      });
      describe("Swap callback", function () {
        shouldBehaveLikeSwapCallback();
      });
    });

    describe("Failed Test", function () {
      beforeEach(async function () {
        const { factory, smardexPairTest, token0, token1, routerForPairTest, WETH } = await loadFixture(
          unitFixtureSmardexPairTest,
        );

        this.contracts.smardexFactoryTest = factory;
        this.contracts.smardexPairTest = smardexPairTest;
        this.contracts.token0 = token0;
        this.contracts.token1 = token1;
        this.contracts.routerForPairTest = routerForPairTest;
        this.contracts.WETH = WETH;

        await this.contracts.token0.approve(this.contracts.routerForPairTest.address, constants.MaxUint256);
        await this.contracts.token1.approve(this.contracts.routerForPairTest.address, constants.MaxUint256);
      });

      describe("check", function () {
        shouldBehaveLikeCheckFailedTest();
      });
    });

    describe("Checking scenario", function () {
      // As swap loops will be quite long we need to increase test timeout
      // 120s should be enough for now
      this.timeout(120000);
      describe("Exploit test case 1", function () {
        testExploit();
      });
      describe("Exploit test case 2", function () {
        testNewSmardex();
      });
      describe("Exploit test case 3", function () {
        testHack();
      });
      describe("Exploit test case 4", function () {
        testHack4();
      });
    });
  });
}
