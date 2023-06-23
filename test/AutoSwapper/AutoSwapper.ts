import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { unitFixtureAutoSwapper } from "../fixtures";
import { shouldBehaveLikeAutoSwapper } from "./specs/autoSwapper.spec";

export function unitTestsAutoSwapper(): void {
  describe("AutoSwapper", function () {
    beforeEach(async function () {
      const fixture = await loadFixture(unitFixtureAutoSwapper);
      this.contracts = {
        ...this.contracts,
        ...fixture,
        smardexFactory: fixture.factory,
        smardexPair: fixture.pair,
      };
    });

    shouldBehaveLikeAutoSwapper();
  });
}
