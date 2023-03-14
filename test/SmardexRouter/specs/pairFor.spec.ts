import { expect } from "chai";
import { keccak256 } from "ethers/lib/utils";
import { SmardexPair__factory } from "../../../typechain";

export function shouldBehaveLikeSmardexRouterPairFor(): void {
  it("should return same pair address than the factory", async function () {
    const pair = this.contracts.smardexPair.address;
    const pair_factory = await this.contracts.smardexFactory.getPair(
      this.contracts.token0.address,
      this.contracts.token1.address,
    );
    const pair_pure = await this.contracts.smardexRouterTest.pairFor_pure(
      this.contracts.smardexFactory.address,
      this.contracts.token0.address,
      this.contracts.token1.address,
    );

    const init_hash = ' hex"' + keccak256(SmardexPair__factory.bytecode).slice(2) + '"';

    expect(pair).to.be.eq(pair_factory);
    expect(pair).to.be.eq(
      pair_pure,
      "The init permit hash of the periphery in SmardexLibrary.sol is probably wrong. Try using this one:" +
        init_hash +
        "\n\n",
    );
  });
}
