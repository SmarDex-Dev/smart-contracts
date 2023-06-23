import { expect } from "chai";

export function shouldBehaveLikeUnwrapWETH(): void {
  it("should revert when insufficient WETH in balance", async function () {
    await expect(this.contracts.smardexRouterTest.unwrapWETHTest(1, this.signers.admin.address)).to.be.revertedWith(
      "Insufficient WETH",
    );
  });

  it("should not transfer any weth if balance is zero", async function () {
    const wethBalance = await this.signers.admin.getBalance();
    await expect(this.contracts.smardexRouterTest.unwrapWETHTest(0, this.signers.admin.address)).to.not.be.reverted;
    const wethBalanceAfter = await this.signers.admin.getBalance();
    expect(wethBalance).to.be.gt(wethBalanceAfter);
  });
}
