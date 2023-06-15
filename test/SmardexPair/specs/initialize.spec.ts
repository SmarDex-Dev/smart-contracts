import { expect } from "chai";

export function shouldBehaveLikeInitialize(): void {
  it("initialize should revert when not called by factory", async function () {
    await expect(
      this.contracts.smardexPair.initialize(this.contracts.token0.address, this.contracts.token1.address),
    ).to.be.revertedWith("SmarDex: FORBIDDEN");
  });
}
