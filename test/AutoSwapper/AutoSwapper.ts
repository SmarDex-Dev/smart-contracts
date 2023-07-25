import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { unitFixtureAutoSwapperL1, unitFixtureAutoSwapperL2 } from "../fixtures";
import { shouldBehaveLikeAutoSwapper } from "./specs/autoSwapper.spec";
import { ADDRESS_DEAD } from "../constants";

export function unitTestsAutoSwapper(): void {
  describe("AutoSwapper", function () {
    describe("AutoSwapper L1", async function () {
      beforeEach(async function () {
        const fixture = await loadFixture(unitFixtureAutoSwapperL1);
        this.contracts = {
          ...this.contracts,
          ...fixture,
          smardexFactory: fixture.factory,
          smardexPair: fixture.pair,
        };
        this.misc.targetAddress = this.contracts.smardexFactory.address;
      });

      shouldBehaveLikeAutoSwapper();
    });

    describe("AutoSwapper L2", async function () {
      beforeEach(async function () {
        const fixture = await loadFixture(unitFixtureAutoSwapperL2);
        this.contracts = {
          ...this.contracts,
          ...fixture,
          smardexFactory: fixture.factory,
          smardexPair: fixture.pair,
        };
        this.misc.targetAddress = ADDRESS_DEAD;
      });

      shouldBehaveLikeAutoSwapper();
    });
  });
}
