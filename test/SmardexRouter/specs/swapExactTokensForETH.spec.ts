import { parseEther } from "ethers/lib/utils";
import { constants } from "ethers";
import { WETHPairInitialize } from "../utils";
import { expect } from "chai";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { getPermitSignature } from "../../utils";

export function shouldBehaveLikeSwapExactTokensForETH(): void {
  const WETHPartnerAmount = parseEther("5");
  const ETHAmount = parseEther("10");
  const swapAmount = parseEther("1");
  const expectedOutputAmount = parseEther("1.427856999971422855");

  beforeEach(async function () {
    await WETHPairInitialize.call(this, WETHPartnerAmount, ETHAmount);
  });

  it("happy path", async function () {
    await this.contracts.WETHPartner.approve(this.contracts.smardexRouter.address, constants.MaxUint256);
    const WETHPairToken0 = await this.contracts.WETHPair.token0();
    const orderedTokens = WETHPairToken0 === this.contracts.WETHPartner.address;
    await expect(
      this.contracts.smardexRouter.swapExactTokensForETH(
        swapAmount,
        0,
        [this.contracts.WETHPartner.address, this.contracts.WETH.address],
        this.signers.admin.address,
        constants.MaxUint256,
      ),
    )
      .to.emit(this.contracts.WETHPartner, "Transfer")
      .withArgs(this.signers.admin.address, this.contracts.WETHPair.address, swapAmount)
      .to.emit(this.contracts.WETH, "Transfer")
      .withArgs(this.contracts.WETHPair.address, this.contracts.smardexRouter.address, expectedOutputAmount)
      .to.emit(this.contracts.WETHPair, "Sync")
      .withArgs(
        orderedTokens ? WETHPartnerAmount.add(swapAmount) : ETHAmount.sub(expectedOutputAmount),
        orderedTokens ? ETHAmount.sub(expectedOutputAmount) : WETHPartnerAmount.add(swapAmount),
        anyValue,
        anyValue,
        orderedTokens ? WETHPartnerAmount.div(2) : ETHAmount.div(2),
        orderedTokens ? ETHAmount.div(2) : WETHPartnerAmount.div(2),
      )
      .to.emit(this.contracts.WETHPair, "Swap")
      .withArgs(
        this.contracts.smardexRouter.address,
        this.contracts.smardexRouter.address,
        orderedTokens ? swapAmount : -expectedOutputAmount.toBigInt(),
        orderedTokens ? -expectedOutputAmount.toBigInt() : swapAmount,
      );
  });

  it("amounts", async function () {
    await this.contracts.WETHPartner.approve(this.contracts.routerEventEmitter.address, constants.MaxUint256);
    await expect(
      this.contracts.routerEventEmitter.swapExactTokensForTokens(
        this.contracts.smardexRouter.address,
        swapAmount,
        0,
        [this.contracts.WETHPartner.address, this.contracts.WETH.address],
        this.signers.admin.address,
        constants.MaxUint256,
      ),
    )
      .to.emit(this.contracts.routerEventEmitter, "Amount")
      .withArgs(expectedOutputAmount);
  });

  it("should revert when last token of the path is not WETH", async function () {
    await expect(
      this.contracts.smardexRouter.swapExactTokensForETH(
        swapAmount,
        0,
        [this.contracts.WETH.address, this.contracts.WETHPartner.address],
        this.signers.admin.address,
        constants.MaxUint256,
      ),
    ).to.be.revertedWith("SmarDexRouter: INVALID_PATH");
  });

  it("with permit", async function () {
    const WETHPairToken0 = await this.contracts.WETHPair.token0();
    const orderedTokens = WETHPairToken0 === this.contracts.WETHPartner.address;

    // make sure we don't have allowance yet
    await this.contracts.WETHPartner.approve(this.contracts.smardexRouter.address, 0);
    const { v, r, s } = await getPermitSignature(
      this.signers.admin,
      this.contracts.WETHPartner,
      this.contracts.smardexRouter.address,
      swapAmount,
    );

    await expect(
      this.contracts.smardexRouter.swapExactTokensForETHWithPermit(
        swapAmount,
        0,
        [this.contracts.WETHPartner.address, this.contracts.WETH.address],
        this.signers.admin.address,
        constants.MaxUint256,
        false,
        v,
        r,
        s,
      ),
    )
      .to.emit(this.contracts.WETHPartner, "Transfer")
      .withArgs(this.signers.admin.address, this.contracts.WETHPair.address, swapAmount)
      .to.emit(this.contracts.WETH, "Transfer")
      .withArgs(this.contracts.WETHPair.address, this.contracts.smardexRouter.address, expectedOutputAmount)
      .to.emit(this.contracts.WETHPair, "Sync")
      .withArgs(
        orderedTokens ? WETHPartnerAmount.add(swapAmount) : ETHAmount.sub(expectedOutputAmount),
        orderedTokens ? ETHAmount.sub(expectedOutputAmount) : WETHPartnerAmount.add(swapAmount),
        anyValue,
        anyValue,
        orderedTokens ? WETHPartnerAmount.div(2) : ETHAmount.div(2),
        orderedTokens ? ETHAmount.div(2) : WETHPartnerAmount.div(2),
      )
      .to.emit(this.contracts.WETHPair, "Swap")
      .withArgs(
        this.contracts.smardexRouter.address,
        this.contracts.smardexRouter.address,
        orderedTokens ? swapAmount : -expectedOutputAmount.toBigInt(),
        orderedTokens ? -expectedOutputAmount.toBigInt() : swapAmount,
      );
  });

  it("fail if permit amount doesn't match swap amount", async function () {
    // make sure we don't have allowance yet
    await this.contracts.WETHPartner.approve(this.contracts.smardexRouter.address, 0);
    const { v, r, s } = await getPermitSignature(
      this.signers.admin,
      this.contracts.WETHPartner,
      this.contracts.smardexRouter.address,
      swapAmount.add(1), // different amount
    );

    await expect(
      this.contracts.smardexRouter.swapExactTokensForETHWithPermit(
        swapAmount,
        0,
        [this.contracts.WETHPartner.address, this.contracts.WETH.address],
        this.signers.admin.address,
        constants.MaxUint256,
        false,
        v,
        r,
        s,
      ),
    ).to.be.revertedWith("TransferHelper::transferFrom: transferFrom failed");
  });

  it("fail if approve max parameter is wrong", async function () {
    // make sure we don't have allowance yet
    await this.contracts.WETHPartner.approve(this.contracts.smardexRouter.address, 0);

    const { v, r, s } = await getPermitSignature(
      this.signers.admin,
      this.contracts.WETHPartner,
      this.contracts.smardexRouter.address,
      swapAmount,
    );

    await expect(
      this.contracts.smardexRouter.swapExactTokensForETHWithPermit(
        swapAmount,
        0,
        [this.contracts.WETHPartner.address, this.contracts.WETH.address],
        this.signers.admin.address,
        constants.MaxUint256,
        true, // wrong value
        v,
        r,
        s,
      ),
    ).to.be.revertedWith("TransferHelper::transferFrom: transferFrom failed");
  });
}
