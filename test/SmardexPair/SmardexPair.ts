import {
  unitFixtureSmardexPairTest,
  unitFixtureSmardexPairTestV1,
  unitFixtureSmardexRouterTest,
  unitFixtureSmardexRouterTestV1,
  unitFixtureSmardexPairTwoTokenInBefore,
  unitFixtureSmardexPairOneTokenInBefore,
  unitFixtureSmardexRouterFluid,
} from "../fixtures";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { shouldBehaveLikeSmardexPairPriceAverage } from "./specs/pairPriceAverage.spec";
import { shouldBehaveLikeMint } from "./specs/mint.spec";
import { shouldBehaveLikeOneTokenInPairBefore } from "./specs/oneTokenInPairBeforeCreation.spec";
import { shouldBehaveLikeTwoTokenInPairBefore } from "./specs/twoTokensInPairBeforeCreation.spec";
import { shouldBehaveLikeBurn } from "./specs/burn.spec";
import { constants } from "ethers";
import { shouldBehaveLikeSwap } from "./specs/swap.spec";
import { shouldBehaveLikeSwapWithValues } from "./specs/swapWithValues.spec";
import { shouldBehaveLikeSwapFluid } from "./specs/swapFluid.spec";
import { shouldBehaveLikeInitialize } from "./specs/initialize.spec";
import { shouldBehaveLikeInitializeV1 } from "./specs/initializeV1.spec";
import { shouldSetFeesUnderLimits } from "./specs/setFees.spec";
import { SmardexPairTest } from "../../typechain";
import { shouldBehaveLikeSkim } from "./specs/skim.spec";

export function unitTestsSmardexPair(): void {
  describe("SmarDexPair", function () {
    describe("SmarDexPairV2", function () {
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

        describe("Skim", function () {
          shouldBehaveLikeSkim();
        });

        describe("SmarDexPair Price Average", function () {
          shouldBehaveLikeSmardexPairPriceAverage();
        });
      });

      describe("Pair tests two tokens sent before creation", function () {
        beforeEach(async function () {
          const { factory, smardexRouterTest, pair, token0, token1, smardexRouterCallbackTest } = await loadFixture(
            unitFixtureSmardexPairTwoTokenInBefore,
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

        describe("Mint Burn with two tokens in pair", function () {
          shouldBehaveLikeTwoTokenInPairBefore();
        });

        describe("Swap with two tokens in pair", function () {
          shouldBehaveLikeSwap();
        });
      });

      describe("Pair tests one token sent before creation", function () {
        beforeEach(async function () {
          const { factory, smardexRouterTest, pair, token0, token1, smardexRouterCallbackTest } = await loadFixture(
            unitFixtureSmardexPairOneTokenInBefore,
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

        describe("Mint Burn with one token in pair", function () {
          shouldBehaveLikeOneTokenInPairBefore();
        });

        describe("Swap with one token in pair", function () {
          shouldBehaveLikeSwap();
        });
      });

      describe("swap value tests", function () {
        beforeEach(async function () {
          const { factory, smardexPairTest, token0, token1, routerForPairTest } = await loadFixture(
            unitFixtureSmardexPairTest,
          );
          this.contracts.smardexFactory = factory;
          this.contracts.smardexPairTest = smardexPairTest as SmardexPairTest;
          this.contracts.token0 = token0;
          this.contracts.token1 = token1;
          this.contracts.routerForPairTest = routerForPairTest;

          await this.contracts.token0.approve(this.contracts.routerForPairTest.address, constants.MaxUint256);
          await this.contracts.token1.approve(this.contracts.routerForPairTest.address, constants.MaxUint256);
        });
        describe("", function () {
          shouldBehaveLikeSwapWithValues(false);
        });
      });

      describe("set fees tests", function () {
        beforeEach(async function () {
          const { factory, smardexPairTest, token0, token1, smardexRouterTest } = await loadFixture(
            unitFixtureSmardexPairTest,
          );

          this.contracts.smardexFactory = factory;
          this.contracts.smardexPairTest = smardexPairTest;
          this.contracts.token0 = token0;
          this.contracts.token1 = token1;
          this.contracts.routerForPairTest = smardexRouterTest;
        });

        describe("change pair fees", function () {
          shouldSetFeesUnderLimits();
        });
      });
    });

    describe("SmarDexPairV1", function () {
      describe("pair functions", function () {
        beforeEach(async function () {
          const { factory, smardexRouterTest, pair, token0, token1, smardexRouterCallbackTest } = await loadFixture(
            unitFixtureSmardexRouterTestV1,
          );
          this.contracts.smardexFactoryV1 = factory;
          this.contracts.smardexRouterTest = smardexRouterTest;
          this.contracts.smardexPair = pair;
          this.contracts.token0 = token0;
          this.contracts.token1 = token1;
          this.contracts.smardexRouterCallbackTest = smardexRouterCallbackTest;

          await this.contracts.token0.approve(this.contracts.smardexRouterTest.address, constants.MaxUint256);
          await this.contracts.token1.approve(this.contracts.smardexRouterTest.address, constants.MaxUint256);
        });

        describe("Initialize", function () {
          shouldBehaveLikeInitializeV1();
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
            unitFixtureSmardexPairTestV1,
          );
          this.contracts.smardexFactoryV1 = factory;
          this.contracts.smardexPairTest = smardexPairTest;
          this.contracts.token0 = token0;
          this.contracts.token1 = token1;
          this.contracts.routerForPairTest = routerForPairTest;

          await this.contracts.token0.approve(this.contracts.routerForPairTest.address, constants.MaxUint256);
          await this.contracts.token1.approve(this.contracts.routerForPairTest.address, constants.MaxUint256);
        });
        describe("", function () {
          shouldBehaveLikeSwapWithValues(true);
        });
      });
    });

    describe("SmarDexPairV2 with fluid balances", function () {
      beforeEach(async function () {
        const { factoryTest, smardexRouterTest, pairTest, fluidToken0, fluidToken1 } = await loadFixture(
          unitFixtureSmardexRouterFluid,
        );
        this.contracts.smardexFactoryTest = factoryTest;
        this.contracts.smardexRouterTest = smardexRouterTest;
        this.contracts.smardexPairTest = pairTest;
        this.contracts.fluidToken0 = fluidToken0;
        this.contracts.fluidToken1 = fluidToken1;

        await this.contracts.fluidToken0.approve(this.contracts.smardexRouterTest.address, constants.MaxUint256);
        await this.contracts.fluidToken1.approve(this.contracts.smardexRouterTest.address, constants.MaxUint256);
      });

      describe("Swap", function () {
        shouldBehaveLikeSwapFluid();
      });
    });
  });
}
