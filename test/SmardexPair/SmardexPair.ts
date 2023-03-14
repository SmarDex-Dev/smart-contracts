import { unitFixtureSmardexPairTest, unitFixtureSmardexRouterTest } from "../fixtures";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { shouldBehaveLikeSmardexPairPriceAverage } from "./specs/pairPriceAverage.spec";
import { shouldBehaveLikeMint } from "./specs/mint.spec";
import { shouldBehaveLikeBurn } from "./specs/burn.spec";
import { constants } from "ethers";
import { shouldBehaveLikeSwap } from "./specs/swap.spec";
import { shouldBehaveLikeSwapWithValues } from "./specs/swapWithValues.spec";
import { shouldBehaveLikeInitialize } from "./specs/initialize.spec";

export function unitTestsSmardexPair(): void {
  describe("SmarDexPair", function () {
    describe("pair functions", function () {
      beforeEach(async function () {
        const { factory, smardexRouterTest, pair, token0, token1, smardexRouterCallbackTest } = await loadFixture(
          unitFixtureSmardexRouterTest,
        );
        this.contracts.smardexFactory = factory;
        this.contracts.smardexRouterTest = smardexRouterTest;
        this.contracts.smardexPair = pair;
        this.contracts.token0 = token0;
        this.contracts.token1 = token1;
        this.contracts.smardexRouterCallbackTest = smardexRouterCallbackTest;

        await this.contracts.token0.approve(this.contracts.smardexRouterTest.address, constants.MaxUint256);
        await this.contracts.token1.approve(this.contracts.smardexRouterTest.address, constants.MaxUint256);
      });

      describe("Initialize", function () {
        shouldBehaveLikeInitialize();
      });

      describe("Mint", function () {
        shouldBehaveLikeMint();
      });

      describe("Burn", function () {
        shouldBehaveLikeBurn();
      });

      describe("Swap", function () {
        shouldBehaveLikeSwap();
      });

      describe("SmarDexPair Price Average", function () {
        shouldBehaveLikeSmardexPairPriceAverage();
      });
    });
    describe("swap value tests", function () {
      beforeEach(async function () {
        const { factory, smardexPairTest, token0, token1, routerForPairTest } = await loadFixture(
          unitFixtureSmardexPairTest,
        );
        this.contracts.smardexFactory = factory;
        this.contracts.smardexPairTest = smardexPairTest;
        this.contracts.token0 = token0;
        this.contracts.token1 = token1;
        this.contracts.routerForPairTest = routerForPairTest;

        await this.contracts.token0.approve(this.contracts.routerForPairTest.address, constants.MaxUint256);
        await this.contracts.token1.approve(this.contracts.routerForPairTest.address, constants.MaxUint256);
      });
      describe("", function () {
        shouldBehaveLikeSwapWithValues();
      });
    });
  });
}
