import { parseEther } from "ethers/lib/utils";
import { expect } from "chai";
import { addLiquidity } from "../utils";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { unitFixtureSmardexRouterTest } from "../../fixtures";
import { constants } from "ethers";
import { BigNumber } from "ethers/lib/ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { Contracts } from "../../types";

export function shouldBehaveLikeTwoTokenInPairBefore(): void {
  // this test doesn't need to add liquidity before
  // because both tokens already in
  it("simple mint with two tokens in pair before creation", async function () {
    await expect(
      this.contracts.smardexRouterTest.mint(
        this.contracts.smardexPair.address,
        this.signers.admin.address,
        parseEther("1000000"),
        parseEther("1000000"),
        this.signers.admin.address,
      ),
    ).to.not.be.reverted;
  });

  it("simple burn with two tokens in pair before creation", async function () {
    // try to mint lp with higher level router function addLiquidity
    await addLiquidity(this.contracts, this.signers.admin, parseEther("1000000"), parseEther("1000000"));

    const balanceLP = await this.contracts.smardexPair.balanceOf(this.signers.admin.address);
    await this.contracts.smardexPair.transfer(this.contracts.smardexPair.address, balanceLP);
    await expect(this.contracts.smardexPair.burn(this.signers.admin.address)).to.not.be.reverted;
  });

  it("check if profit made by sending tokens before pair creation", async function () {
    const hackProfit = await getProfitFromAddLiquidityAndSwap(this.contracts, this.signers.admin, this.signers.user);

    const { token0, token1, smardexRouterTest, factory, pair } = await loadFixture(unitFixtureSmardexRouterTest);

    this.contracts.smardexPair = pair;
    this.contracts.token0 = token0;
    this.contracts.token1 = token1;
    this.contracts.smardexRouterTest = smardexRouterTest;
    this.contracts.smardexFactory = factory;

    const standardProfit = await getProfitFromAddLiquidityAndSwap(
      this.contracts,
      this.signers.admin,
      this.signers.user,
    );

    expect(hackProfit).to.equal(standardProfit);
  });

  async function getProfitFromAddLiquidityAndSwap(
    contracts: Contracts,
    admin: SignerWithAddress,
    user: SignerWithAddress,
  ): Promise<BigNumber> {
    const MINT_VALUE = parseEther("1");

    await contracts.token0.connect(admin).approve(contracts.smardexRouterTest.address, constants.MaxUint256);
    await contracts.token1.connect(admin).approve(contracts.smardexRouterTest.address, constants.MaxUint256);

    await contracts.token0.connect(user).approve(contracts.smardexRouterTest.address, constants.MaxUint256);
    await contracts.token1.connect(user).approve(contracts.smardexRouterTest.address, constants.MaxUint256);

    await expect(contracts.token0.transfer(user.address, MINT_VALUE)).to.not.be.reverted;
    await expect(contracts.token1.transfer(user.address, MINT_VALUE)).to.not.be.reverted;

    // add liquidity without tokens already in
    await expect(
      contracts.smardexRouterTest.addLiquidity(
        {
          tokenA: contracts.token0.address,
          tokenB: contracts.token1.address,
          amountADesired: MINT_VALUE,
          amountBDesired: MINT_VALUE,
          amountAMin: 1,
          amountBMin: 1,
          fictiveReserveB: 0,
          fictiveReserveAMin: 0,
          fictiveReserveAMax: 0,
        },
        admin.address,
        constants.MaxUint256,
      ),
    ).to.not.be.reverted;

    // swap
    await expect(
      contracts.smardexRouterTest
        .connect(user)
        .swapExactTokensForTokens(
          MINT_VALUE,
          constants.Zero,
          [contracts.token0.address, contracts.token1.address],
          user.address,
          constants.MaxUint256,
        ),
    ).to.not.be.reverted;

    const userBalanceAfter = await contracts.token1.balanceOf(user.address);
    return userBalanceAfter.sub(MINT_VALUE);
  }
}
