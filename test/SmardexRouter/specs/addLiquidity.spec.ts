import { parseEther } from "ethers/lib/utils";
import { constants } from "ethers";
import { expect } from "chai";
import { ADDRESS_DEAD, MINIMUM_LIQUIDITY, PANIC_CODE_ARITHMETIC_UNDERFLOW_OVERFLOW } from "../../constants";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import hre from "hardhat";

export function shouldBehaveLikeAddLiquidity(): void {
  it("simple test", async function () {
    const token0Amount = parseEther("1");
    const token1Amount = parseEther("4");

    const expectedLiquidity = parseEther("2");
    await this.contracts.token0.approve(this.contracts.smardexRouter.address, constants.MaxUint256);
    await this.contracts.token1.approve(this.contracts.smardexRouter.address, constants.MaxUint256);
    await expect(
      this.contracts.smardexRouter.addLiquidity(
        this.contracts.token0.address,
        this.contracts.token1.address,
        token0Amount,
        token1Amount,
        1,
        1,
        this.signers.admin.address,
        constants.MaxUint256,
      ),
    )
      .to.emit(this.contracts.token0, "Transfer")
      .withArgs(this.signers.admin.address, this.contracts.smardexPair.address, token0Amount)
      .to.emit(this.contracts.token1, "Transfer")
      .withArgs(this.signers.admin.address, this.contracts.smardexPair.address, token1Amount)
      .to.emit(this.contracts.smardexPair, "Transfer")
      .withArgs(constants.AddressZero, ADDRESS_DEAD, MINIMUM_LIQUIDITY)
      .to.emit(this.contracts.smardexPair, "Transfer")
      .withArgs(constants.AddressZero, this.signers.admin.address, expectedLiquidity.sub(MINIMUM_LIQUIDITY))
      .to.emit(this.contracts.smardexPair, "Sync")
      .withArgs(token0Amount, token1Amount, anyValue, anyValue, 0, 0)
      .to.emit(this.contracts.smardexPair, "Mint")
      .withArgs(this.contracts.smardexRouter.address, this.signers.admin.address, token0Amount, token1Amount);

    expect(await this.contracts.smardexPair.balanceOf(this.signers.admin.address)).to.eq(
      expectedLiquidity.sub(MINIMUM_LIQUIDITY),
    );
  });

  it("should fail to create pair with same token twice", async function () {
    await expect(
      this.contracts.smardexRouter.addLiquidity(
        this.contracts.token0.address,
        this.contracts.token0.address,
        1,
        1,
        1,
        1,
        this.signers.admin.address,
        constants.MaxUint256,
      ),
    ).to.be.revertedWith("SmarDex: IDENTICAL_ADDRESSES");
  });

  it("should fail to create pair with zero Address", async function () {
    await expect(
      this.contracts.smardexRouter.addLiquidity(
        constants.AddressZero,
        this.contracts.token0.address,
        1,
        1,
        1,
        1,
        this.signers.admin.address,
        constants.MaxUint256,
      ),
    ).to.be.revertedWith("SmarDex: ZERO_ADDRESS");
  });

  it("should fail with Insufficient Liquidity Minted", async function () {
    await expect(
      this.contracts.smardexRouter.addLiquidity(
        this.contracts.token0.address,
        this.contracts.token1.address,
        10000 * 10000,
        10,
        10000 * 10000,
        10,
        this.signers.admin.address,
        constants.MaxUint256,
      ),
    ).to.not.be.reverted;
    await expect(
      this.contracts.smardexRouter.addLiquidity(
        this.contracts.token0.address,
        this.contracts.token1.address,
        1000,
        1,
        0,
        0,
        this.signers.admin.address,
        constants.MaxUint256,
      ),
    ).to.be.revertedWith("SmarDex: INSUFFICIENT_LIQUIDITY_MINTED");
  });

  it("should fail when deadline is before current timestamp", async function () {
    await this.contracts.token0.approve(this.contracts.smardexRouter.address, constants.MaxUint256);
    await this.contracts.token1.approve(this.contracts.smardexRouter.address, constants.MaxUint256);
    const currentTimestamp = (await hre.ethers.provider.getBlock("latest")).timestamp;
    await expect(
      this.contracts.smardexRouter.addLiquidity(
        this.contracts.token0.address,
        this.contracts.token1.address,
        parseEther("1"),
        parseEther("4"),
        1,
        1,
        this.signers.admin.address,
        currentTimestamp,
      ),
    ).to.be.revertedWith("SmarDexRouter: EXPIRED");
  });

  it("addLiquidity after swap and cover path for amounts Optimal", async function () {
    const token0Amount = parseEther("10");
    const token1Amount = parseEther("40");

    await this.contracts.token0.approve(this.contracts.smardexRouter.address, constants.MaxUint256);
    await this.contracts.token1.approve(this.contracts.smardexRouter.address, constants.MaxUint256);
    await this.contracts.smardexRouter.addLiquidity(
      this.contracts.token0.address,
      this.contracts.token1.address,
      token0Amount,
      token1Amount,
      0,
      0,
      this.signers.admin.address,
      constants.MaxUint256,
    );

    const swapAmount = parseEther("1");
    await this.contracts.smardexRouter.swapExactTokensForTokens(
      swapAmount,
      0,
      [this.contracts.token0.address, this.contracts.token1.address],
      this.signers.admin.address,
      constants.MaxUint256,
    );

    const reserves = await this.contracts.smardexPair.getReserves();

    const quoteB = await this.contracts.smardexRouter.quote(token0Amount, reserves.reserve0_, reserves.reserve1_);

    await expect(
      this.contracts.smardexRouter.addLiquidity(
        this.contracts.token0.address,
        this.contracts.token1.address,
        token0Amount,
        token1Amount,
        1,
        quoteB.add(1),
        this.signers.admin.address,
        constants.MaxUint256,
      ),
    ).to.be.revertedWith("SmarDexRouter: INSUFFICIENT_B_AMOUNT");

    await expect(
      this.contracts.smardexRouter.addLiquidity(
        this.contracts.token0.address,
        this.contracts.token1.address,
        token0Amount,
        quoteB.sub(1),
        token0Amount,
        1,
        this.signers.admin.address,
        constants.MaxUint256,
      ),
    ).to.be.revertedWith("SmarDexRouter: INSUFFICIENT_A_AMOUNT");

    await expect(
      this.contracts.smardexRouter.addLiquidity(
        this.contracts.token0.address,
        this.contracts.token1.address,
        token0Amount,
        token1Amount,
        1,
        quoteB,
        this.signers.admin.address,
        constants.MaxUint256,
      ),
    ).to.not.be.reverted;

    // path amountBOptimal > amountBDesired so router will calculate amountAOptimal internally
    const fictiveReserves = await this.contracts.smardexPair.getFictiveReserves();
    const amountBOptimal = await this.contracts.smardexRouter.quote(
      token0Amount.add(1),
      fictiveReserves[0],
      fictiveReserves[1],
    );
    await expect(
      this.contracts.smardexRouter.addLiquidity(
        this.contracts.token0.address,
        this.contracts.token1.address,
        token0Amount,
        amountBOptimal.mul(2),
        token0Amount,
        1,
        this.signers.admin.address,
        constants.MaxUint256,
      ),
    )
      .to.emit(this.contracts.token0, "Transfer")
      .withArgs(this.signers.admin.address, this.contracts.smardexPair.address, token0Amount)
      .to.emit(this.contracts.token1, "Transfer")
      .withArgs(this.signers.admin.address, this.contracts.smardexPair.address, anyValue)
      .to.emit(this.contracts.smardexPair, "Transfer")
      .to.emit(this.contracts.smardexPair, "Sync")
      .to.emit(this.contracts.smardexPair, "Mint");
  });

  it("trying to set a fictive reserve to 0 by mint", async function () {
    await this.contracts.token0.approve(this.contracts.smardexRouter.address, constants.MaxUint256);
    await this.contracts.token1.approve(this.contracts.smardexRouter.address, constants.MaxUint256);

    await expect(
      this.contracts.smardexRouter.addLiquidity(
        this.contracts.token0.address,
        this.contracts.token1.address,
        parseEther("0"),
        parseEther("1"),
        1,
        1,
        this.signers.admin.address,
        constants.MaxUint256,
      ),
    ).to.be.revertedWithPanic(PANIC_CODE_ARITHMETIC_UNDERFLOW_OVERFLOW);
  });
}
