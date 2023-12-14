import { expect } from "chai";
import { SmardexFactory } from "../../../typechain";

export function shouldBehaveLikeWhitelist(): void {
  it("populate whitelist", async function () {
    // Check return value (state is not mutated)
    const returnValue = await this.contracts.smardexRouterTest.callStatic.addPairToWhitelist(
      this.contracts.token0.address,
      this.contracts.token1.address,
    );

    expect(returnValue).to.equal(this.contracts.smardexPair.address);

    // Add pair to router whitelist
    await expect(
      this.contracts.smardexRouterTest.addPairToWhitelist(this.contracts.token0.address, this.contracts.token1.address),
    )
      .to.emit(this.contracts.smardexRouterTest, "PairWhitelisted")
      .withArgs(this.contracts.token0.address, this.contracts.token1.address, this.contracts.smardexPair.address);
  });

  it("populate whitelist with reverse token order", async function () {
    // Add pair to router whitelist
    await expect(
      this.contracts.smardexRouterTest.addPairToWhitelist(this.contracts.token1.address, this.contracts.token0.address),
    )
      .to.emit(this.contracts.smardexRouterTest, "PairWhitelisted")
      .withArgs(this.contracts.token1.address, this.contracts.token0.address, this.contracts.smardexPair.address);
  });

  it("populate whitelist as regular user", async function () {
    await expect(
      this.contracts.smardexRouterTest
        .connect(this.signers.user)
        .addPairToWhitelist(this.contracts.token1.address, this.contracts.token0.address),
    ).to.not.be.reverted;
  });

  it("won't whitelist a pair that's not registered with the factory", async function () {
    // Create old pair with token0 and WETH
    await this.contracts.smardexFactoryV1.createPair(this.contracts.token0.address, this.contracts.WETH.address);

    // Try to whitelist pair
    await expect(
      this.contracts.smardexRouterTest.addPairToWhitelist(this.contracts.token0.address, this.contracts.WETH.address),
    ).to.be.revertedWith("SmardexRouter: PAIR_MISSING");

    await expect(
      this.contracts.smardexRouterTest.addPairToWhitelist(this.contracts.WETH.address, this.contracts.token0.address),
    ).to.be.revertedWith("SmardexRouter: PAIR_MISSING");
  });

  it("won't whitelist a pair that's native to the new factory", async function () {
    // Create new pair with token0 and WETH
    await (this.contracts.smardexFactory as SmardexFactory).closeWhitelist();
    await this.contracts.smardexFactory.createPair(this.contracts.token0.address, this.contracts.WETH.address);

    // Try to whitelist pair
    await expect(
      this.contracts.smardexRouterTest.addPairToWhitelist(this.contracts.token0.address, this.contracts.WETH.address),
    ).to.be.revertedWith("SmardexRouter: NOT_WHITELISTABLE");

    await expect(
      this.contracts.smardexRouterTest.addPairToWhitelist(this.contracts.WETH.address, this.contracts.token0.address),
    ).to.be.revertedWith("SmardexRouter: NOT_WHITELISTABLE");
  });
}
