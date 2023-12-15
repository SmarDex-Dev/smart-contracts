import { expect } from "chai";
import { SmardexPairV1 } from "../../../typechain";

export function shouldBehaveLikeInitializeV1(): void {
  it("initialize should revert when not called by factory", async function () {
    await expect(
      (this.contracts.smardexPair as SmardexPairV1).initialize(
        this.contracts.token0.address,
        this.contracts.token1.address,
      ),
    ).to.be.revertedWith("SmarDex: FORBIDDEN");
  });
}
