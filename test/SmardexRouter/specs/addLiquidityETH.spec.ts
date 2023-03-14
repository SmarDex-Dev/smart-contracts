import { parseEther } from "ethers/lib/utils";
import { constants } from "ethers";
import { expect } from "chai";
import { ADDRESS_DEAD, MINIMUM_LIQUIDITY } from "../../constants";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";

export function shouldBehaveLikeAddLiquidityETH(): void {
  const WETHPartnerAmount = parseEther("1");
  const ETHAmount = parseEther("4");
  const expectedLiquidity = parseEther("2");
  it("simple test", async function () {
    const WETHPairToken0 = await this.contracts.WETHPair.token0();
    await this.contracts.WETHPartner.approve(this.contracts.smardexRouter.address, constants.MaxUint256);
    await expect(
      this.contracts.smardexRouter.addLiquidityETH(
        this.contracts.WETHPartner.address,
        WETHPartnerAmount,
        WETHPartnerAmount,
        ETHAmount,
        this.signers.admin.address,
        constants.MaxUint256,
        { value: ETHAmount },
      ),
    )
      .to.emit(this.contracts.WETHPair, "Transfer")
      .withArgs(constants.AddressZero, ADDRESS_DEAD, MINIMUM_LIQUIDITY)
      .to.emit(this.contracts.WETHPair, "Transfer")
      .withArgs(constants.AddressZero, this.signers.admin.address, expectedLiquidity.sub(MINIMUM_LIQUIDITY))
      .to.emit(this.contracts.WETHPair, "Sync")
      .withArgs(
        WETHPairToken0 === this.contracts.WETHPartner.address ? WETHPartnerAmount : ETHAmount,
        WETHPairToken0 === this.contracts.WETHPartner.address ? ETHAmount : WETHPartnerAmount,
        anyValue,
        anyValue,
        0,
        0,
      )
      .to.emit(this.contracts.WETHPair, "Mint")
      .withArgs(
        this.contracts.smardexRouter.address,
        this.signers.admin.address,
        WETHPairToken0 === this.contracts.WETHPartner.address ? WETHPartnerAmount : ETHAmount,
        WETHPairToken0 === this.contracts.WETHPartner.address ? ETHAmount : WETHPartnerAmount,
      );

    expect(await this.contracts.WETHPair.balanceOf(this.signers.admin.address)).to.eq(
      expectedLiquidity.sub(MINIMUM_LIQUIDITY),
    );
  });

  it("send more ETH and get refund ", async function () {
    await this.contracts.smardexRouter.addLiquidityETH(
      this.contracts.WETHPartner.address,
      WETHPartnerAmount,
      WETHPartnerAmount,
      ETHAmount,
      this.signers.admin.address,
      constants.MaxUint256,
      { value: ETHAmount },
    );

    const balanceETH = await this.signers.admin.getBalance();
    await this.contracts.smardexRouter.addLiquidityETH(
      this.contracts.WETHPartner.address,
      WETHPartnerAmount,
      WETHPartnerAmount,
      ETHAmount,
      this.signers.admin.address,
      constants.MaxUint256,
      { value: ETHAmount.add(parseEther("1")) },
    );

    const balanceAfterETH = await this.signers.admin.getBalance();
    expect(balanceETH.sub(balanceAfterETH).sub(ETHAmount)).to.be.approximately(0, parseEther("0.0003"));
  });
}
