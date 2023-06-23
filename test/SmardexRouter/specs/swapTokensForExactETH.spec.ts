import { parseEther } from "ethers/lib/utils";
import { WETHPairInitialize } from "../utils";
import { constants } from "ethers";
import { expect } from "chai";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";

export function shouldBehaveLikeSwapTokensForExactETH(): void {
  const WETHPartnerAmount = parseEther("5");
  const ETHAmount = parseEther("10");
  const expectedSwapAmount = parseEther("0.625437806464525168");
  const outputAmount = parseEther("1");

  beforeEach(async function () {
    await WETHPairInitialize.call(this, WETHPartnerAmount, ETHAmount);
  });

  it("happy path", async function () {
    await this.contracts.WETHPartner.approve(this.contracts.smardexRouter.address, constants.MaxUint256);
    const WETHPairToken0 = await this.contracts.WETHPair.token0();
    const orderedTokens = WETHPairToken0 === this.contracts.WETHPartner.address;
    await expect(
      this.contracts.smardexRouter.swapTokensForExactETH(
        outputAmount,
        constants.MaxUint256,
        [this.contracts.WETHPartner.address, this.contracts.WETH.address],
        this.signers.admin.address,
        constants.MaxUint256,
      ),
    )
      .to.emit(this.contracts.WETHPartner, "Transfer")
      .withArgs(this.signers.admin.address, this.contracts.WETHPair.address, expectedSwapAmount)
      .to.emit(this.contracts.WETH, "Transfer")
      .withArgs(this.contracts.WETHPair.address, this.contracts.smardexRouter.address, outputAmount)
      .to.emit(this.contracts.WETHPair, "Sync")
      .withArgs(
        orderedTokens ? WETHPartnerAmount.add(expectedSwapAmount) : ETHAmount.sub(outputAmount),
        orderedTokens ? ETHAmount.sub(outputAmount) : WETHPartnerAmount.add(expectedSwapAmount),
        anyValue,
        anyValue,
        orderedTokens ? WETHPartnerAmount.div(2) : ETHAmount.div(2),
        orderedTokens ? ETHAmount.div(2) : WETHPartnerAmount.div(2),
      )
      .to.emit(this.contracts.WETHPair, "Swap")
      .withArgs(
        this.contracts.smardexRouter.address,
        this.contracts.smardexRouter.address,
        orderedTokens ? expectedSwapAmount.toBigInt() : -outputAmount.toBigInt(),
        orderedTokens ? -outputAmount.toBigInt() : expectedSwapAmount.toBigInt(),
      );
  });

  it("amounts", async function () {
    await this.contracts.WETHPartner.approve(this.contracts.routerEventEmitter.address, constants.MaxUint256);
    await expect(
      this.contracts.routerEventEmitter.swapTokensForExactTokens(
        this.contracts.smardexRouter.address,
        outputAmount,
        expectedSwapAmount,
        [this.contracts.WETHPartner.address, this.contracts.WETH.address],
        this.signers.admin.address,
        constants.MaxUint256,
      ),
    )
      .to.emit(this.contracts.routerEventEmitter, "Amount")
      .withArgs(expectedSwapAmount);
  });

  it("should revert when last token of the path is not WETH", async function () {
    await expect(
      this.contracts.smardexRouter.swapTokensForExactETH(
        outputAmount,
        constants.MaxUint256,
        [this.contracts.WETHPartner.address, this.contracts.token1.address],
        this.signers.admin.address,
        constants.MaxUint256,
      ),
    ).to.be.revertedWith("SmarDexRouter: INVALID_PATH");
  });
}
