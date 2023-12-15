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
        {
          token: this.contracts.WETHPartner.address,
          amountTokenDesired: WETHPartnerAmount,
          amountTokenMin: WETHPartnerAmount,
          amountETHMin: ETHAmount,
          fictiveReserveETH: ETHAmount,
          fictiveReserveTokenMin: WETHPartnerAmount,
          fictiveReserveTokenMax: WETHPartnerAmount,
        },
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
      {
        token: this.contracts.WETHPartner.address,
        amountTokenDesired: WETHPartnerAmount,
        amountTokenMin: WETHPartnerAmount,
        amountETHMin: ETHAmount,
        fictiveReserveETH: ETHAmount,
        fictiveReserveTokenMin: WETHPartnerAmount,
        fictiveReserveTokenMax: WETHPartnerAmount,
      },
      this.signers.admin.address,
      constants.MaxUint256,
      { value: ETHAmount },
    );

    const balanceETH = await this.signers.admin.getBalance();
    await this.contracts.smardexRouter.addLiquidityETH(
      {
        token: this.contracts.WETHPartner.address,
        amountTokenDesired: WETHPartnerAmount,
        amountTokenMin: WETHPartnerAmount,
        amountETHMin: ETHAmount,
        fictiveReserveETH: ETHAmount,
        fictiveReserveTokenMin: WETHPartnerAmount,
        fictiveReserveTokenMax: WETHPartnerAmount,
      },
      this.signers.admin.address,
      constants.MaxUint256,
      { value: ETHAmount.add(parseEther("1")) },
    );

    const balanceAfterETH = await this.signers.admin.getBalance();
    expect(balanceETH.sub(balanceAfterETH).sub(ETHAmount)).to.be.approximately(0, parseEther("0.0003"));
  });

  it("should fail when price has moved too much", async function () {
    const WETHPairToken0 = await this.contracts.WETHPair.token0();
    await this.contracts.WETHPartner.approve(this.contracts.smardexRouter.address, constants.MaxUint256);
    await this.contracts.smardexRouter.addLiquidityETH(
      {
        token: this.contracts.WETHPartner.address,
        amountTokenDesired: parseEther("1000"),
        amountTokenMin: 0,
        amountETHMin: 0,
        fictiveReserveETH: 0,
        fictiveReserveTokenMin: 0,
        fictiveReserveTokenMax: 0,
      },
      this.signers.admin.address,
      constants.MaxUint256,
      { value: parseEther("1") },
    );
    // User expects 1 eth = 1000 token
    let fictiveReserves = await this.contracts.WETHPair.getFictiveReserves();
    let [fictiveReserveToken, fictiveReserveETH] =
      WETHPairToken0 === this.contracts.WETHPartner.address
        ? [fictiveReserves.fictiveReserve0_, fictiveReserves.fictiveReserve1_]
        : [fictiveReserves.fictiveReserve1_, fictiveReserves.fictiveReserve0_];
    // Someone makes a big trade that shifts the ratio
    await this.contracts.smardexRouter.swapExactETHForTokens(
      0,
      [this.contracts.WETH.address, this.contracts.WETHPartner.address],
      this.signers.admin.address,
      constants.MaxUint256,
      { value: parseEther("0.1") },
    );
    // User now tries to add liquidity, but the price has changed by more than 1%
    await expect(
      this.contracts.smardexRouter.addLiquidityETH(
        {
          token: this.contracts.WETHPartner.address,
          amountTokenDesired: parseEther("1000"),
          amountTokenMin: 0,
          amountETHMin: 0,
          fictiveReserveETH: fictiveReserveETH,
          fictiveReserveTokenMin: fictiveReserveToken.mul(99).div(100), // 1% price slippage
          fictiveReserveTokenMax: fictiveReserveToken.mul(101).div(100),
        },
        this.signers.admin.address,
        constants.MaxUint256,
        { value: parseEther("1") },
      ),
    ).to.be.revertedWith("SmarDexRouter: PRICE_TOO_LOW");
    // Price shifts in other direction
    await this.contracts.smardexRouter.swapExactTokensForETH(
      parseEther("300"),
      0,
      [this.contracts.WETHPartner.address, this.contracts.WETH.address],
      this.signers.admin.address,
      constants.MaxUint256,
    );
    // Should also revert
    await expect(
      this.contracts.smardexRouter.addLiquidityETH(
        {
          token: this.contracts.WETHPartner.address,
          amountTokenDesired: parseEther("1000"),
          amountTokenMin: 0,
          amountETHMin: 0,
          fictiveReserveETH: fictiveReserveETH,
          fictiveReserveTokenMin: fictiveReserveToken.mul(99).div(100), // 1% price slippage
          fictiveReserveTokenMax: fictiveReserveToken.mul(101).div(100),
        },
        this.signers.admin.address,
        constants.MaxUint256,
        { value: parseEther("1") },
      ),
    ).to.be.revertedWith("SmarDexRouter: PRICE_TOO_HIGH");
    // Should pass with correct reserves
    fictiveReserves = await this.contracts.WETHPair.getFictiveReserves();
    [fictiveReserveToken, fictiveReserveETH] =
      WETHPairToken0 === this.contracts.WETHPartner.address
        ? [fictiveReserves.fictiveReserve0_, fictiveReserves.fictiveReserve1_]
        : [fictiveReserves.fictiveReserve1_, fictiveReserves.fictiveReserve0_];
    await expect(
      this.contracts.smardexRouter.addLiquidityETH(
        {
          token: this.contracts.WETHPartner.address,
          amountTokenDesired: parseEther("1000"),
          amountTokenMin: 0,
          amountETHMin: 0,
          fictiveReserveETH: fictiveReserveETH,
          fictiveReserveTokenMin: fictiveReserveToken.mul(99).div(100), // 1% price slippage
          fictiveReserveTokenMax: fictiveReserveToken.mul(101).div(100),
        },
        this.signers.admin.address,
        constants.MaxUint256,
        { value: parseEther("1") },
      ),
    ).to.not.be.reverted;
  });
}
