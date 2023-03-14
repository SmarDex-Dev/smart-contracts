import { parseEther } from "ethers/lib/utils";
import { WETHPairInitialize } from "../utils";
import { constants } from "ethers";
import { expect } from "chai";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";

export function shouldBehaveLikeSwapExactETHForTokens(): void {
  const WETHPartnerAmount = parseEther("10");
  const ETHAmount = parseEther("5");
  const swapAmount = parseEther("1");
  const expectedOutputAmount = parseEther("1.427856999971422855");

  beforeEach(async function () {
    await WETHPairInitialize.call(this, WETHPartnerAmount, ETHAmount);
    await this.contracts.token0.approve(this.contracts.smardexRouter.address, constants.MaxUint256);
  });

  it("happy path", async function () {
    const WETHPairToken0 = await this.contracts.WETHPair.token0();
    const orderedTokens = WETHPairToken0 === this.contracts.WETHPartner.address;
    await expect(
      this.contracts.smardexRouter.swapExactETHForTokens(
        0,
        [this.contracts.WETH.address, this.contracts.WETHPartner.address],
        this.signers.admin.address,
        constants.MaxUint256,
        {
          value: swapAmount,
        },
      ),
    )
      .to.emit(this.contracts.WETH, "Transfer")
      .withArgs(this.contracts.smardexRouter.address, this.contracts.WETHPair.address, swapAmount)
      .to.emit(this.contracts.WETHPartner, "Transfer")
      .withArgs(this.contracts.WETHPair.address, this.signers.admin.address, expectedOutputAmount)
      .to.emit(this.contracts.WETHPair, "Sync")
      .withArgs(
        orderedTokens ? WETHPartnerAmount.sub(expectedOutputAmount) : ETHAmount.add(swapAmount),
        orderedTokens ? ETHAmount.add(swapAmount) : WETHPartnerAmount.sub(expectedOutputAmount),
        anyValue,
        anyValue,
        orderedTokens ? WETHPartnerAmount.div(2) : ETHAmount.div(2),
        orderedTokens ? ETHAmount.div(2) : WETHPartnerAmount.div(2),
      )
      .to.emit(this.contracts.WETHPair, "Swap")
      .withArgs(
        this.contracts.smardexRouter.address,
        this.signers.admin.address,
        orderedTokens ? -expectedOutputAmount.toBigInt() : swapAmount,
        orderedTokens ? swapAmount : -expectedOutputAmount.toBigInt(),
      );
  });

  it("amounts", async function () {
    await expect(
      this.contracts.routerEventEmitter.swapExactETHForTokens(
        this.contracts.smardexRouter.address,
        0,
        [this.contracts.WETH.address, this.contracts.WETHPartner.address],
        this.signers.admin.address,
        constants.MaxUint256,
        {
          value: swapAmount,
        },
      ),
    )
      .to.emit(this.contracts.routerEventEmitter, "Amount")
      .withArgs(expectedOutputAmount);
  });

  it("should revert when first token of the path is not WETH", async function () {
    await expect(
      this.contracts.smardexRouter.swapExactETHForTokens(
        0,
        [this.contracts.WETHPartner.address, this.contracts.WETH.address],
        this.signers.admin.address,
        constants.MaxUint256,
        {
          value: swapAmount,
        },
      ),
    ).to.be.revertedWith("SmarDexRouter: INVALID_PATH");
  });
}
