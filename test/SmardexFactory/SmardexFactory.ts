import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { unitFixtureSmardexFactory } from "../fixtures";
import { shouldBehaveLikeConstructor } from "./deployment/constructor";
import { shouldBehaveLikeUniswapV2Factory } from "./specs/SmardexFactory.spec";

export function unitTestSmardexFactory(): void {
  describe("SmarDexFactory", function () {
    beforeEach(async function () {
      const { smardexToken, factory } = await loadFixture(unitFixtureSmardexFactory);
      this.contracts.smardexToken = smardexToken;
      this.contracts.smardexFactory = factory;
    });

    describe("Effects Functions", function () {
      describe("Deployment", function () {
        shouldBehaveLikeConstructor();
      });
    });

    describe("UniswapV2Factory Spec", function () {
      shouldBehaveLikeUniswapV2Factory();
    });
  });
}
