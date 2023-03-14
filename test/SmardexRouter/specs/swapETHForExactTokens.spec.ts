import { parseEther } from "ethers/lib/utils";
import { constants } from "ethers";
import { WETHPairInitialize } from "../utils";
import { expect } from "chai";

export function shouldBehaveLikeSwapETHForExactTokens(): void {
  const WETHPartnerAmount = parseEther("10");
  const ETHAmount = parseEther("5");
  const expectedSwapAmount = parseEther("0.625437806464525168");
  const outputAmount = parseEther("1");

  beforeEach(async function () {
    await WETHPairInitialize.call(this, WETHPartnerAmount, ETHAmount);
  });

  it("happy path", async function () {
    const WETHPairToken0 = await this.contracts.WETHPair.token0();
    await expect(
      this.contracts.smardexRouter.swapETHForExactTokens(
        outputAmount,
        [this.contracts.WETH.address, this.contracts.WETHPartner.address],
        this.signers.admin.address,
        constants.MaxUint256,
        {
          value: expectedSwapAmount,
        },
      ),
    )
      .to.emit(this.contracts.WETH, "Transfer")
      .withArgs(this.contracts.smardexRouter.address, this.contracts.WETHPair.address, expectedSwapAmount)
      .to.emit(this.contracts.WETHPartner, "Transfer")
      .withArgs(this.contracts.WETHPair.address, this.signers.admin.address, outputAmount)
      .to.emit(this.contracts.WETHPair, "Sync")
      .to.emit(this.contracts.WETHPair, "Swap")
      .withArgs(
        this.contracts.smardexRouter.address,
        this.signers.admin.address,
        WETHPairToken0 === this.contracts.WETHPartner.address
          ? -outputAmount.toBigInt()
          : expectedSwapAmount.toBigInt(),
        WETHPairToken0 === this.contracts.WETHPartner.address
          ? expectedSwapAmount.toBigInt()
          : -outputAmount.toBigInt(),
      );
  });

  it("amounts", async function () {
    await expect(
      this.contracts.routerEventEmitter.swapETHForExactTokens(
        this.contracts.smardexRouter.address,
        outputAmount,
        [this.contracts.WETH.address, this.contracts.WETHPartner.address],
        this.signers.admin.address,
        constants.MaxUint256,
        {
          value: expectedSwapAmount,
        },
      ),
    )
      .to.emit(this.contracts.routerEventEmitter, "Amount")
      .withArgs(expectedSwapAmount);
  });

  it("should revert when first token of the path is not WETH", async function () {
    await expect(
      this.contracts.smardexRouter.swapETHForExactTokens(
        outputAmount,
        [this.contracts.WETHPartner.address, this.contracts.WETH.address],
        this.signers.admin.address,
        constants.MaxUint256,
        {
          value: expectedSwapAmount,
        },
      ),
    ).to.be.revertedWith("SmarDexRouter: INVALID_PATH");
  });
}
