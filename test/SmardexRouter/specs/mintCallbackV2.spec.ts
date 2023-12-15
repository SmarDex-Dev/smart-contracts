import { expect } from "chai";
import { constants } from "ethers";
import { parseEther } from "ethers/lib/utils";
import { SmardexPair } from "../../../typechain";

export function shouldBehaveLikeMintCallback() {
  const TOKEN0_AMOUNT = parseEther("10");
  const TOKEN1_AMOUNT = parseEther("40");
  const FIRST_SWAP_AMOUNT = parseEther("2");

  it("should addLiquidity with MintCallback and fail with missing tokens", async function () {
    await this.contracts.smardexRouter.addLiquidity(
      {
        tokenA: this.contracts.token0.address,
        tokenB: this.contracts.token1.address,
        amountADesired: TOKEN0_AMOUNT,
        amountBDesired: TOKEN1_AMOUNT,
        amountAMin: 0,
        amountBMin: 0,
        fictiveReserveB: 0,
        fictiveReserveAMin: 0,
        fictiveReserveAMax: 0,
      },
      this.signers.admin.address,
      constants.MaxUint256,
    );
    expect(await this.contracts.smardexPair.balanceOf(this.signers.admin.address)).to.be.gt(0);
    // Swap to increase feeToAmount
    await this.contracts.smardexRouter.swapExactTokensForTokens(
      FIRST_SWAP_AMOUNT,
      0,
      [this.contracts.token0.address, this.contracts.token1.address],
      this.signers.admin.address,
      constants.MaxUint256,
    );
    await this.contracts.smardexRouter.swapExactTokensForTokens(
      FIRST_SWAP_AMOUNT,
      0,
      [this.contracts.token1.address, this.contracts.token0.address],
      this.signers.admin.address,
      constants.MaxUint256,
    );
    // get fees
    const feeToAmount = await (this.contracts.smardexPair as SmardexPair).getFeeToAmounts();
    expect(feeToAmount.fees0_).to.be.gt(0);
    expect(feeToAmount.fees1_).to.be.gt(0);
    await expect(
      this.contracts.smardexRouterCallbackTest.addLiquidity(
        this.contracts.token0.address,
        this.contracts.token1.address,
        TOKEN0_AMOUNT.mul(10),
        TOKEN1_AMOUNT,
        this.signers.admin.address,
        constants.MaxUint256,
      ),
    ).to.be.revertedWith("SmarDex: INSUFFICIENT_AMOUNT_1");

    await this.contracts.smardexRouterCallbackTest.setIsToken0ToLower(true);

    await expect(
      this.contracts.smardexRouterCallbackTest.addLiquidity(
        this.contracts.token0.address,
        this.contracts.token1.address,
        TOKEN0_AMOUNT.mul(10),
        TOKEN1_AMOUNT,
        this.signers.admin.address,
        constants.MaxUint256,
      ),
    ).to.be.revertedWith("SmarDex: INSUFFICIENT_AMOUNT_0");
    expect(await this.contracts.smardexPair.balanceOf(this.signers.admin.address)).to.be.gt(0);
  });
  it("should addLiquidity with MintCallback and fail reentrancy", async function () {
    await this.contracts.fakeERC20reentrancy.approve(this.contracts.smardexRouter.address, constants.MaxUint256);
    await this.contracts.fakeERC20reentrancy.approve(this.contracts.fakeERC20reentrancy.address, constants.MaxUint256);
    await this.contracts.WETH.deposit({ value: parseEther("50") });
    await this.contracts.WETH.approve(this.contracts.smardexRouter.address, constants.MaxUint256);
    await this.contracts.WETH.approve(this.contracts.fakeERC20reentrancy.address, TOKEN0_AMOUNT.add(TOKEN0_AMOUNT));
    await this.contracts.smardexRouter.addLiquidity(
      {
        tokenA: this.contracts.WETH.address,
        tokenB: this.contracts.fakeERC20reentrancy.address,
        amountADesired: TOKEN0_AMOUNT,
        amountBDesired: TOKEN0_AMOUNT,
        amountAMin: 0,
        amountBMin: 0,
        fictiveReserveB: 0,
        fictiveReserveAMin: 0,
        fictiveReserveAMax: 0,
      },
      this.signers.admin.address,
      constants.MaxUint256,
    );

    await this.contracts.fakeERC20reentrancy.activate();

    await expect(
      this.contracts.fakeERC20reentrancy.addLiquidity(
        this.contracts.WETH.address,
        this.contracts.fakeERC20reentrancy.address,
        parseEther("1"),
        parseEther("1"),
        this.signers.admin.address,
        constants.MaxUint256,
      ),
    ).to.be.revertedWith("SmarDex: LOCKED");
  });

  it("mint callback should fail when not called by pair", async function () {
    const data = {
      token0: this.contracts.token0.address,
      token1: this.contracts.token1.address,
      amount0: 0,
      amount1: 100000,
      payer: this.signers.admin.address,
    };
    await expect(this.contracts.smardexRouter.smardexMintCallback(data)).to.be.revertedWith(
      "SmarDexRouter: INVALID_PAIR",
    );
  });

  it("mint callback should fail when no amount", async function () {
    const data = {
      token0: this.contracts.token0.address,
      token1: this.contracts.token1.address,
      amount0: 0,
      amount1: 0,
      payer: this.signers.admin.address,
    };
    await expect(this.contracts.fakeERC20reentrancy.smardexMintCallback(data)).to.be.revertedWith(
      "SmardexRouter: Callback Invalid amount",
    );
  });
}
