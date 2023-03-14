import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { unitFixtureSmardexFactory } from "../fixtures";
import { shouldBehaveLikeUniswapV2ERC20 } from "./specs/UniswapV2ERC20.spec";

export function unitTestsSmardexERC20(): void {
  describe("SmarDex ERC20", function () {
    beforeEach(async function () {
      const { smardexToken, factory } = await loadFixture(unitFixtureSmardexFactory);
      this.contracts.smardexToken = smardexToken;
      this.contracts.smardexFactory = factory;
    });
    describe("UniswapV2ERC20", function () {
      shouldBehaveLikeUniswapV2ERC20();
    });
  });
}
