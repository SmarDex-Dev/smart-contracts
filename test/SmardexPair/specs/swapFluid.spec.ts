import { expect } from "chai";
import { parseEther } from "ethers/lib/utils";
import { Contracts, Signers } from "../../types";
import { constants } from "ethers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

export function shouldBehaveLikeSwapFluid(): void {
  beforeEach(async function () {});

  async function setupPair(contracts: Contracts, signers: Signers) {
    await contracts.smardexRouterTest.addLiquidity(
      {
        tokenA: contracts.fluidToken0.address,
        tokenB: contracts.fluidToken1.address,
        amountADesired: parseEther("100"),
        amountBDesired: parseEther("200"),
        amountAMin: 0,
        amountBMin: 0,
        fictiveReserveB: 0,
        fictiveReserveAMax: 0,
        fictiveReserveAMin: 0,
      },
      signers.admin.address,
      constants.MaxUint256,
    );

    const reserves = await contracts.smardexPairTest.getReserves();
    await expect(reserves.reserve0_).to.be.eq(parseEther("100"));
    await expect(reserves.reserve1_).to.be.eq(parseEther("200"));

    const fictiveReserves = await contracts.smardexPairTest.getFictiveReserves();
    await expect(fictiveReserves.fictiveReserve0_).to.be.eq(parseEther("50"));
    await expect(fictiveReserves.fictiveReserve1_).to.be.eq(parseEther("100"));

    const currentTimestamp = await time.latest();
    await contracts.smardexPairTest.setPriceAverage(parseEther("50"), parseEther("100"), currentTimestamp);
  }

  it("swap when pair input token balance increased", async function () {
    await setupPair(this.contracts, this.signers);

    // Multiply by 10 the balance of the input token
    await this.contracts.fluidToken0.setBalance(this.contracts.smardexPairTest.address, 10, 1);

    const balanceBefore = await this.contracts.fluidToken1.balanceOf(this.signers.admin.address);
    await expect(
      this.contracts.smardexRouterTest.swapExactTokensForTokens(
        parseEther("1"),
        0,
        [this.contracts.fluidToken0.address, this.contracts.fluidToken1.address],
        this.signers.admin.address,
        constants.MaxUint256,
      ),
    ).to.not.be.reverted;
    const balanceAfter = await this.contracts.fluidToken1.balanceOf(this.signers.admin.address);
    expect(balanceAfter.sub(balanceBefore)).to.be.gt(constants.Zero);
  });

  it("swap when pair input token balance decreased", async function () {
    await setupPair(this.contracts, this.signers);

    // Divide by 10 the balance of the input token
    await this.contracts.fluidToken0.setBalance(this.contracts.smardexPairTest.address, 1, 10);

    const balanceBefore = await this.contracts.fluidToken1.balanceOf(this.signers.admin.address);
    await expect(
      this.contracts.smardexRouterTest.swapExactTokensForTokens(
        parseEther("1"),
        0,
        [this.contracts.fluidToken0.address, this.contracts.fluidToken1.address],
        this.signers.admin.address,
        constants.MaxUint256,
      ),
    ).to.not.be.reverted;
    const balanceAfter = await this.contracts.fluidToken1.balanceOf(this.signers.admin.address);
    expect(balanceAfter.sub(balanceBefore)).to.be.gt(constants.Zero);
  });

  it("swap when pair output token balance increased", async function () {
    await setupPair(this.contracts, this.signers);

    // Multiply by 10 the balance of the output token
    await this.contracts.fluidToken1.setBalance(this.contracts.smardexPairTest.address, 10, 1);

    const balanceBefore = await this.contracts.fluidToken1.balanceOf(this.signers.admin.address);
    await expect(
      this.contracts.smardexRouterTest.swapExactTokensForTokens(
        parseEther("1"),
        0,
        [this.contracts.fluidToken0.address, this.contracts.fluidToken1.address],
        this.signers.admin.address,
        constants.MaxUint256,
      ),
    ).to.not.be.reverted;
    const balanceAfter = await this.contracts.fluidToken1.balanceOf(this.signers.admin.address);
    expect(balanceAfter.sub(balanceBefore)).to.be.gt(constants.Zero);
  });

  it("swap when pair output token balance decreased", async function () {
    await setupPair(this.contracts, this.signers);

    // Divide by 10 the balance of the output token
    await this.contracts.fluidToken1.setBalance(this.contracts.smardexPairTest.address, 1, 10);

    const balanceBefore = await this.contracts.fluidToken1.balanceOf(this.signers.admin.address);
    await expect(
      this.contracts.smardexRouterTest.swapExactTokensForTokens(
        parseEther("1"),
        0,
        [this.contracts.fluidToken0.address, this.contracts.fluidToken1.address],
        this.signers.admin.address,
        constants.MaxUint256,
      ),
    ).to.not.be.reverted;
    const balanceAfter = await this.contracts.fluidToken1.balanceOf(this.signers.admin.address);
    expect(balanceAfter.sub(balanceBefore)).to.be.gt(constants.Zero);
  });
}
