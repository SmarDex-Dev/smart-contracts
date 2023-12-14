import { parseEther } from "ethers/lib/utils";
import { constants } from "ethers";
import { expect } from "chai";

export function shouldBehaveLikeOneTokenInPairBefore(): void {
  it("add liquidity with one token in pair before creation", async function () {
    // Check one token in uninitialized pair
    expect(await this.contracts.smardexPair.totalSupply()).to.equal(0);
    expect(await this.contracts.token0.balanceOf(this.contracts.smardexPair.address)).to.equal(0);
    expect(await this.contracts.token1.balanceOf(this.contracts.smardexPair.address)).to.equal(parseEther("10"));
    const balanceBefore0 = await this.contracts.token0.balanceOf(this.signers.admin.address);
    const balanceBefore1 = await this.contracts.token1.balanceOf(this.signers.admin.address);
    // Works thanks to skim
    await expect(
      this.contracts.smardexRouterTest.addLiquidity(
        {
          tokenA: this.contracts.token0.address,
          tokenB: this.contracts.token1.address,
          amountADesired: parseEther("1000"),
          amountBDesired: parseEther("2000"),
          amountAMin: 0,
          amountBMin: 0,
          fictiveReserveB: 0,
          fictiveReserveAMin: 0,
          fictiveReserveAMax: 0,
        },
        this.signers.admin.address,
        constants.MaxUint256,
      ),
    ).to.not.be.reverted;

    // Check balances
    expect(await this.contracts.token0.balanceOf(this.signers.admin.address)).to.equal(
      balanceBefore0.sub(parseEther("1000")),
    );
    expect(await this.contracts.token1.balanceOf(this.signers.admin.address)).to.equal(
      balanceBefore1.sub(parseEther("2000")).add(parseEther("10")), // user retrieves what was in the pair
    );
  });

  it("simple mint with one token in pair before creation", async function () {
    // Check one token in uninitialized pair
    expect(await this.contracts.smardexPair.totalSupply()).to.equal(0);
    expect(await this.contracts.token0.balanceOf(this.contracts.smardexPair.address)).to.equal(0);
    expect(await this.contracts.token1.balanceOf(this.contracts.smardexPair.address)).to.equal(parseEther("10"));
    const balanceBefore0 = await this.contracts.token0.balanceOf(this.signers.admin.address);
    const balanceBefore1 = await this.contracts.token1.balanceOf(this.signers.admin.address);

    // success with lower level pair method
    await expect(
      this.contracts.smardexRouterTest.mint(
        this.contracts.smardexPair.address,
        this.signers.admin.address,
        parseEther("1000"),
        parseEther("2000"),
        this.signers.admin.address,
      ),
    ).to.not.be.reverted;

    // Check balances
    expect(await this.contracts.token0.balanceOf(this.signers.admin.address)).to.equal(
      balanceBefore0.sub(parseEther("1000")),
    );
    expect(await this.contracts.token1.balanceOf(this.signers.admin.address)).to.equal(
      balanceBefore1.sub(parseEther("2000")),
    );
    // user doesn't retrieve what was in the pair
  });

  it("simple burn with one token in pair before creation", async function () {
    await expect(
      this.contracts.smardexRouterTest.mint(
        this.contracts.smardexPair.address,
        this.signers.admin.address,
        parseEther("1000000"),
        parseEther("1000000"),
        this.signers.admin.address,
      ),
    ).to.not.be.reverted;

    await expect(
      this.contracts.smardexRouterTest.mint(
        this.contracts.smardexPair.address,
        this.signers.admin.address,
        parseEther("1000000"),
        parseEther("1000000"),
        this.signers.admin.address,
      ),
    ).to.not.be.reverted;

    const balanceLP = await this.contracts.smardexPair.balanceOf(this.signers.admin.address);
    await this.contracts.smardexPair.transfer(this.contracts.smardexPair.address, balanceLP);
    await expect(this.contracts.smardexPair.burn(this.signers.admin.address)).to.not.be.reverted;
  });
}
