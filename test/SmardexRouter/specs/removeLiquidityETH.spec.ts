import { parseEther } from "ethers/lib/utils";
import { constants } from "ethers";
import { expect } from "chai";
import { MINIMUM_LIQUIDITY } from "../../constants";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { WETHPairInitialize } from "../utils";

export function shouldBehaveLikeRemoveLiquidityETH(): void {
  it("removeLiquidityETH", async function () {
    const WETHPartnerAmount = parseEther("1");
    const ETHAmount = parseEther("4");
    await WETHPairInitialize.call(this, WETHPartnerAmount, ETHAmount);

    const expectedLiquidity = parseEther("2");
    const WETHPairToken0 = await this.contracts.WETHPair.token0();
    await this.contracts.WETHPair.approve(this.contracts.smardexRouter.address, constants.MaxUint256);
    const wethPairToken0isWETHPartner = WETHPairToken0 === this.contracts.WETHPartner.address;
    const balanceETH = await this.signers.admin.getBalance();
    await expect(
      this.contracts.smardexRouter.removeLiquidityETH(
        this.contracts.WETHPartner.address,
        expectedLiquidity.sub(MINIMUM_LIQUIDITY),
        0,
        0,
        this.signers.admin.address,
        constants.MaxUint256,
      ),
    )
      .to.emit(this.contracts.WETHPair, "Transfer")
      .withArgs(this.signers.admin.address, this.contracts.WETHPair.address, expectedLiquidity.sub(MINIMUM_LIQUIDITY))
      .to.emit(this.contracts.WETHPair, "Transfer")
      .withArgs(this.contracts.WETHPair.address, constants.AddressZero, expectedLiquidity.sub(MINIMUM_LIQUIDITY))
      .to.emit(this.contracts.WETH, "Transfer")
      .withArgs(this.contracts.WETHPair.address, this.contracts.smardexRouter.address, ETHAmount.sub(2000))
      .to.emit(this.contracts.WETHPartner, "Transfer")
      .withArgs(this.contracts.WETHPair.address, this.contracts.smardexRouter.address, WETHPartnerAmount.sub(500))
      .to.emit(this.contracts.WETHPartner, "Transfer")
      .withArgs(this.contracts.smardexRouter.address, this.signers.admin.address, WETHPartnerAmount.sub(500))
      .to.emit(this.contracts.WETHPair, "Sync")
      .withArgs(
        wethPairToken0isWETHPartner ? 500 : 2000,
        wethPairToken0isWETHPartner ? 2000 : 500,
        anyValue,
        anyValue,
        0,
        0,
      )
      .to.emit(this.contracts.WETHPair, "Burn")
      .withArgs(
        this.contracts.smardexRouter.address,
        this.contracts.smardexRouter.address,
        wethPairToken0isWETHPartner ? WETHPartnerAmount.sub(500) : ETHAmount.sub(2000),
        wethPairToken0isWETHPartner ? ETHAmount.sub(2000) : WETHPartnerAmount.sub(500),
      );
    expect(await this.signers.admin.getBalance()).to.be.gt(balanceETH);
    expect(await this.contracts.WETHPair.balanceOf(this.signers.admin.address)).to.eq(0);
    const totalSupplyWETHPartner = await this.contracts.WETHPartner.totalSupply();
    const totalSupplyWETH = await this.contracts.WETH.totalSupply();
    expect(await this.contracts.WETHPartner.balanceOf(this.signers.admin.address)).to.eq(
      totalSupplyWETHPartner.sub(500),
    );
    expect(await this.contracts.WETH.balanceOf(this.signers.admin.address)).to.eq(totalSupplyWETH.sub(2000));
  });
}
