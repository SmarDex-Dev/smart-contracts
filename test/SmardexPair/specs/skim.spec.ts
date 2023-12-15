import { addLiquidity } from "../utils";
import { constants } from "ethers";
import { expect } from "chai";
import { parseEther } from "ethers/lib/utils";
import { SmardexPair } from "../../../typechain";

export function shouldBehaveLikeSkim(): void {
  it("skim work if no fund present in the pool and no liquidity", async function () {
    const balanceBefore0 = await this.contracts.token0.balanceOf(this.signers.user.address);
    const balanceBefore1 = await this.contracts.token1.balanceOf(this.signers.user.address);

    await expect(
      (this.contracts.smardexPair as SmardexPair).connect(this.signers.admin).skim(this.signers.user.address),
    ).to.not.be.reverted;

    const balanceAfter0 = await this.contracts.token0.balanceOf(this.signers.user.address);
    const balanceAfter1 = await this.contracts.token1.balanceOf(this.signers.user.address);

    expect(balanceAfter0).to.be.equal(balanceBefore0);
    expect(balanceAfter1).to.be.equal(balanceBefore1);
  });

  it("skim work if fund present in the pool and no liquidity", async function () {
    // send token to the pair
    const AMOUNT0 = parseEther("1000");
    const AMOUNT1 = parseEther("100");
    await this.contracts.token0.connect(this.signers.admin).transfer(this.contracts.smardexPair.address, AMOUNT0);
    await this.contracts.token1.connect(this.signers.admin).transfer(this.contracts.smardexPair.address, AMOUNT1);

    const balanceBefore0 = await this.contracts.token0.balanceOf(this.signers.user.address);
    const balanceBefore1 = await this.contracts.token1.balanceOf(this.signers.user.address);

    // skim
    await expect(
      (this.contracts.smardexPair as SmardexPair).connect(this.signers.admin).skim(this.signers.user.address),
    )
      .to.emit(this.contracts.token0, "Transfer")
      .withArgs(this.contracts.smardexPair.address, this.signers.user.address, AMOUNT0)
      .to.emit(this.contracts.token1, "Transfer")
      .withArgs(this.contracts.smardexPair.address, this.signers.user.address, AMOUNT1);

    const balanceAfter0 = await this.contracts.token0.balanceOf(this.signers.user.address);
    const balanceAfter1 = await this.contracts.token1.balanceOf(this.signers.user.address);

    // check admin has been refunded on his token
    expect(balanceAfter0).to.be.equal(balanceBefore0.add(AMOUNT0));
    expect(balanceAfter1).to.be.equal(balanceBefore1.add(AMOUNT1));
  });

  it("skim not work if lp != 0", async function () {
    // add liquidity so that totalSupply != 0
    await addLiquidity(this.contracts, this.signers.admin, parseEther("1000"), parseEther("100"));

    // check the totalSupply is not 0
    expect(await this.contracts.smardexPair.totalSupply()).to.not.be.equal(constants.Zero);

    // check skim revert
    await expect(
      (this.contracts.smardexPair as SmardexPair).connect(this.signers.admin).skim(this.signers.user.address),
    ).to.be.revertedWith("SmarDex: ONLY_EMPTY_PAIR");
  });

  it("skim hack scenario", async function () {
    // check no fund on the pair and user
    expect(await this.contracts.token0.balanceOf(this.contracts.smardexPair.address)).to.be.equal(constants.Zero);
    expect(await this.contracts.token1.balanceOf(this.contracts.smardexPair.address)).to.be.equal(constants.Zero);
    expect(await this.contracts.token0.balanceOf(this.signers.user.address)).to.be.equal(constants.Zero);
    expect(await this.contracts.token1.balanceOf(this.signers.user.address)).to.be.equal(constants.Zero);
    expect(await this.contracts.smardexPair.totalSupply()).to.be.equal(constants.Zero);

    // skim : works, but no transfer
    await expect(
      (this.contracts.smardexPair as SmardexPair).connect(this.signers.admin).skim(this.signers.user.address),
    ).to.not.be.reverted;

    // check no fund on the pair and transferred to user
    expect(await this.contracts.token0.balanceOf(this.contracts.smardexPair.address)).to.be.equal(constants.Zero);
    expect(await this.contracts.token1.balanceOf(this.contracts.smardexPair.address)).to.be.equal(constants.Zero);
    expect(await this.contracts.token0.balanceOf(this.signers.user.address)).to.be.equal(constants.Zero);
    expect(await this.contracts.token1.balanceOf(this.signers.user.address)).to.be.equal(constants.Zero);

    // send funds: ok
    const AMOUNT0 = parseEther("1000");
    const AMOUNT1 = parseEther("100");
    await this.contracts.token0.connect(this.signers.admin).transfer(this.contracts.smardexPair.address, AMOUNT0);
    await this.contracts.token1.connect(this.signers.admin).transfer(this.contracts.smardexPair.address, AMOUNT1);

    // check fund on the pair but not on the user
    expect(await this.contracts.token0.balanceOf(this.contracts.smardexPair.address)).to.be.equal(AMOUNT0);
    expect(await this.contracts.token1.balanceOf(this.contracts.smardexPair.address)).to.be.equal(AMOUNT1);
    expect(await this.contracts.token0.balanceOf(this.signers.user.address)).to.be.equal(constants.Zero);
    expect(await this.contracts.token1.balanceOf(this.signers.user.address)).to.be.equal(constants.Zero);

    // skim: works with transfers
    await expect(
      (this.contracts.smardexPair as SmardexPair).connect(this.signers.admin).skim(this.signers.user.address),
    )
      .to.emit(this.contracts.token0, "Transfer")
      .withArgs(this.contracts.smardexPair.address, this.signers.user.address, AMOUNT0)
      .to.emit(this.contracts.token1, "Transfer")
      .withArgs(this.contracts.smardexPair.address, this.signers.user.address, AMOUNT1);

    // check no fund on the pair but on the user
    expect(await this.contracts.token0.balanceOf(this.contracts.smardexPair.address)).to.be.equal(constants.Zero);
    expect(await this.contracts.token1.balanceOf(this.contracts.smardexPair.address)).to.be.equal(constants.Zero);
    expect(await this.contracts.token0.balanceOf(this.signers.user.address)).to.be.equal(AMOUNT0);
    expect(await this.contracts.token1.balanceOf(this.signers.user.address)).to.be.equal(AMOUNT1);

    // send funds: ok
    const AMOUNT2 = parseEther("2000");
    const AMOUNT3 = parseEther("200");
    await this.contracts.token0.connect(this.signers.admin).transfer(this.contracts.smardexPair.address, AMOUNT2);
    await this.contracts.token1.connect(this.signers.admin).transfer(this.contracts.smardexPair.address, AMOUNT3);

    // check fund on the pair
    expect(await this.contracts.token0.balanceOf(this.contracts.smardexPair.address)).to.be.equal(AMOUNT2);
    expect(await this.contracts.token1.balanceOf(this.contracts.smardexPair.address)).to.be.equal(AMOUNT3);

    // add liquidity: funds transferred from the pair to the user: due to skim, from the user to the pair, due to addLiquidity
    await this.contracts.token0
      .connect(this.signers.user)
      .approve(this.contracts.smardexRouterTest.address, constants.MaxUint256);
    await this.contracts.token1
      .connect(this.signers.user)
      .approve(this.contracts.smardexRouterTest.address, constants.MaxUint256);
    await expect(
      this.contracts.smardexRouterTest.connect(this.signers.user).addLiquidity(
        {
          tokenA: this.contracts.token0.address,
          tokenB: this.contracts.token1.address,
          amountADesired: AMOUNT0,
          amountBDesired: AMOUNT1,
          amountAMin: 1,
          amountBMin: 1,
          fictiveReserveB: 0,
          fictiveReserveAMin: 0,
          fictiveReserveAMax: 0,
        },
        this.signers.user.address,
        constants.MaxUint256,
      ),
    )
      .to.emit(this.contracts.token0, "Transfer")
      .withArgs(this.signers.user.address, this.contracts.smardexPair.address, AMOUNT0)
      .to.emit(this.contracts.token1, "Transfer")
      .withArgs(this.signers.user.address, this.contracts.smardexPair.address, AMOUNT1)
      .to.emit(this.contracts.token0, "Transfer")
      .withArgs(this.contracts.smardexPair.address, this.signers.user.address, AMOUNT2)
      .to.emit(this.contracts.token1, "Transfer")
      .withArgs(this.contracts.smardexPair.address, this.signers.user.address, AMOUNT3)
      .to.emit(this.contracts.smardexPair, "Sync")
      .withArgs(AMOUNT0, AMOUNT1, AMOUNT0.div(2), AMOUNT1.div(2), constants.Zero, constants.Zero)
      .to.emit(this.contracts.smardexPair, "Mint")
      .withArgs(this.contracts.smardexRouterTest.address, this.signers.user.address, AMOUNT0, AMOUNT1);

    // check the funds on the pair
    expect(await this.contracts.smardexPair.totalSupply()).to.not.be.equal(constants.Zero);
    expect(await this.contracts.token0.balanceOf(this.contracts.smardexPair.address)).to.be.equal(AMOUNT0);
    expect(await this.contracts.token1.balanceOf(this.contracts.smardexPair.address)).to.be.equal(AMOUNT1);
    expect(await this.contracts.token0.balanceOf(this.signers.user.address)).to.be.equal(AMOUNT2);
    expect(await this.contracts.token1.balanceOf(this.signers.user.address)).to.be.equal(AMOUNT3);

    // skim: not work
    await expect(
      (this.contracts.smardexPair as SmardexPair).connect(this.signers.admin).skim(this.signers.user.address),
    ).to.be.revertedWith("SmarDex: ONLY_EMPTY_PAIR");
  });
}
