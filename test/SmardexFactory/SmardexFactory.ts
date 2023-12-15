import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { unitFixtureSmardexFactory } from "../fixtures";
import { shouldBehaveLikeConstructor } from "./deployment/constructor";
import { shouldBehaveLikeSmardexFactoryV2 } from "./specs/SmardexFactoryV2.spec";
import { shouldBehaveLikeSmardexFactory } from "./specs/SmardexFactory";

export function unitTestSmardexFactory(): void {
  describe("SmarDexFactory", function () {
    beforeEach(async function () {
      const { smardexToken, factory, token0, token1, WETH } = await loadFixture(unitFixtureSmardexFactory);

      this.contracts.smardexToken = smardexToken;
      this.contracts.smardexFactory = factory;
      this.contracts.token0 = token0;
      this.contracts.token1 = token1;
      this.contracts.WETH = WETH;
    });

    describe("Effects Functions", function () {
      describe("Deployment", function () {
        shouldBehaveLikeConstructor();
      });
    });

    describe("UniswapV2Factory Spec", function () {
      shouldBehaveLikeSmardexFactory();
      shouldBehaveLikeSmardexFactoryV2();
    });
  });
}
