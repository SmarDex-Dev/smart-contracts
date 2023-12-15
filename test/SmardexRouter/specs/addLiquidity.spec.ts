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
        {
          tokenA: this.contracts.token0.address,
          tokenB: this.contracts.token1.address,
          amountADesired: token0Amount,
          amountBDesired: token1Amount,
          amountAMin: 1,
          amountBMin: 1,
          fictiveReserveB: 0,
          fictiveReserveAMin: 0,
          fictiveReserveAMax: 0,
        },
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
        {
          tokenA: this.contracts.token0.address,
          tokenB: this.contracts.token0.address,
          amountADesired: 1,
          amountBDesired: 1,
          amountAMin: 1,
          amountBMin: 1,
          fictiveReserveB: 0,
          fictiveReserveAMin: 0,
          fictiveReserveAMax: 0,
        },
        this.signers.admin.address,
        constants.MaxUint256,
      ),
    ).to.be.revertedWith("SmarDex: IDENTICAL_ADDRESSES");
  });

  it("should fail to create pair with zero Address", async function () {
    await expect(
      this.contracts.smardexRouter.addLiquidity(
        {
          tokenA: constants.AddressZero,
          tokenB: this.contracts.token0.address,
          amountADesired: 1,
          amountBDesired: 1,
          amountAMin: 1,
          amountBMin: 1,
          fictiveReserveB: 0,
          fictiveReserveAMin: 0,
          fictiveReserveAMax: 0,
        },
        this.signers.admin.address,
        constants.MaxUint256,
      ),
    ).to.be.revertedWith("SmarDex: ZERO_ADDRESS");
  });

  it("should fail with Insufficient Liquidity Minted", async function () {
    await expect(
      this.contracts.smardexRouter.addLiquidity(
        {
          tokenA: this.contracts.token0.address,
          tokenB: this.contracts.token1.address,
          amountADesired: 10000 * 10000,
          amountBDesired: 10,
          amountAMin: 10000 * 10000,
          amountBMin: 10,
          fictiveReserveB: 10,
          fictiveReserveAMin: 10000 * 10000,
          fictiveReserveAMax: 10000 * 10000,
        },
        this.signers.admin.address,
        constants.MaxUint256,
      ),
    ).to.not.be.reverted;
    await expect(
      this.contracts.smardexRouter.addLiquidity(
        {
          tokenA: this.contracts.token0.address,
          tokenB: this.contracts.token1.address,
          amountADesired: 1000,
          amountBDesired: 1,
          amountAMin: 0,
          amountBMin: 0,
          fictiveReserveB: 0,
          fictiveReserveAMin: 0,
          fictiveReserveAMax: 0,
        },
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
        {
          tokenA: this.contracts.token0.address,
          tokenB: this.contracts.token1.address,
          amountADesired: parseEther("1"),
          amountBDesired: parseEther("4"),
          amountAMin: 1,
          amountBMin: 1,
          fictiveReserveB: 0,
          fictiveReserveAMin: 0,
          fictiveReserveAMax: 0,
        },
        this.signers.admin.address,
        currentTimestamp,
      ),
    ).to.be.revertedWith("SmarDexRouter: EXPIRED");
  });

  it("should fail when price has moved too much", async function () {
    await this.contracts.token0.approve(this.contracts.smardexRouter.address, constants.MaxUint256);
    await this.contracts.token1.approve(this.contracts.smardexRouter.address, constants.MaxUint256);
    await this.contracts.smardexRouter.addLiquidity(
      {
        tokenA: this.contracts.token0.address,
        tokenB: this.contracts.token1.address,
        amountADesired: parseEther("1"),
        amountBDesired: parseEther("1"),
        amountAMin: 0,
        amountBMin: 0,
        fictiveReserveB: 0,
        fictiveReserveAMin: 0,
        fictiveReserveAMax: 0,
      },
      this.signers.admin.address,
      constants.MaxUint256,
    );
    // User expects 1 token0 = 1 token1
    let fictiveReserves = await this.contracts.smardexPair.getFictiveReserves();
    // Someone makes a big trade that shifts the ratio
    await this.contracts.smardexRouter.swapExactTokensForTokens(
      parseEther("0.1"),
      0,
      [this.contracts.token0.address, this.contracts.token1.address],
      this.signers.admin.address,
      constants.MaxUint256,
    );
    // User now tries to add liquidity, but the price has changed by more than 1%
    await expect(
      this.contracts.smardexRouter.addLiquidity(
        {
          tokenA: this.contracts.token0.address,
          tokenB: this.contracts.token1.address,
          amountADesired: parseEther("1"),
          amountBDesired: parseEther("1"),
          amountAMin: 0,
          amountBMin: 0,
          fictiveReserveB: fictiveReserves.fictiveReserve1_,
          fictiveReserveAMin: fictiveReserves.fictiveReserve0_.mul(99).div(100), // 1% price slippage
          fictiveReserveAMax: fictiveReserves.fictiveReserve0_.mul(101).div(100),
        },
        this.signers.admin.address,
        constants.MaxUint256,
      ),
    ).to.be.revertedWith("SmarDexRouter: PRICE_TOO_HIGH");
    // Price shifts in other direction
    await this.contracts.smardexRouter.swapExactTokensForTokens(
      parseEther("0.3"),
      0,
      [this.contracts.token1.address, this.contracts.token0.address],
      this.signers.admin.address,
      constants.MaxUint256,
    );
    // Should also revert
    await expect(
      this.contracts.smardexRouter.addLiquidity(
        {
          tokenA: this.contracts.token0.address,
          tokenB: this.contracts.token1.address,
          amountADesired: parseEther("1"),
          amountBDesired: parseEther("1"),
          amountAMin: 0,
          amountBMin: 0,
          fictiveReserveB: fictiveReserves.fictiveReserve1_,
          fictiveReserveAMin: fictiveReserves.fictiveReserve0_.mul(99).div(100), // 1% price slippage
          fictiveReserveAMax: fictiveReserves.fictiveReserve0_.mul(101).div(100),
        },
        this.signers.admin.address,
        constants.MaxUint256,
      ),
    ).to.be.revertedWith("SmarDexRouter: PRICE_TOO_LOW");
    // Should pass with correct reserves
    fictiveReserves = await this.contracts.smardexPair.getFictiveReserves();
    await expect(
      this.contracts.smardexRouter.addLiquidity(
        {
          tokenA: this.contracts.token0.address,
          tokenB: this.contracts.token1.address,
          amountADesired: parseEther("1"),
          amountBDesired: parseEther("1"),
          amountAMin: 0,
          amountBMin: 0,
          fictiveReserveB: fictiveReserves.fictiveReserve1_,
          fictiveReserveAMin: fictiveReserves.fictiveReserve0_.mul(99).div(100), // 1% price slippage
          fictiveReserveAMax: fictiveReserves.fictiveReserve0_.mul(101).div(100),
        },
        this.signers.admin.address,
        constants.MaxUint256,
      ),
    ).to.not.be.reverted;
  });

  it("addLiquidity after swap and cover path for amounts Optimal", async function () {
    const token0Amount = parseEther("10");
    const token1Amount = parseEther("40");

    await this.contracts.token0.approve(this.contracts.smardexRouter.address, constants.MaxUint256);
    await this.contracts.token1.approve(this.contracts.smardexRouter.address, constants.MaxUint256);
    await expect(
      this.contracts.smardexRouter.addLiquidity(
        {
          tokenA: this.contracts.token0.address,
          tokenB: this.contracts.token1.address,
          amountADesired: token0Amount,
          amountBDesired: token1Amount,
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
        {
          tokenA: this.contracts.token0.address,
          tokenB: this.contracts.token1.address,
          amountADesired: token0Amount,
          amountBDesired: token1Amount,
          amountAMin: 1,
          amountBMin: quoteB.add(1),
          fictiveReserveB: 0,
          fictiveReserveAMin: 0,
          fictiveReserveAMax: 0,
        },
        this.signers.admin.address,
        constants.MaxUint256,
      ),
    ).to.be.revertedWith("SmarDexRouter: INSUFFICIENT_B_AMOUNT");

    await expect(
      this.contracts.smardexRouter.addLiquidity(
        {
          tokenA: this.contracts.token0.address,
          tokenB: this.contracts.token1.address,
          amountADesired: token0Amount,
          amountBDesired: quoteB.sub(1),
          amountAMin: token0Amount,
          amountBMin: 1,
          fictiveReserveB: 0,
          fictiveReserveAMin: 0,
          fictiveReserveAMax: 0,
        },
        this.signers.admin.address,
        constants.MaxUint256,
      ),
    ).to.be.revertedWith("SmarDexRouter: INSUFFICIENT_A_AMOUNT");

    let fictiveReserves = await this.contracts.smardexPair.getFictiveReserves();
    await expect(
      this.contracts.smardexRouter.addLiquidity(
        {
          tokenA: this.contracts.token0.address,
          tokenB: this.contracts.token1.address,
          amountADesired: token0Amount,
          amountBDesired: token1Amount,
          amountAMin: 1,
          amountBMin: quoteB,
          fictiveReserveB: fictiveReserves.fictiveReserve1_,
          fictiveReserveAMin: fictiveReserves.fictiveReserve0_,
          fictiveReserveAMax: fictiveReserves.fictiveReserve0_,
        },
        this.signers.admin.address,
        constants.MaxUint256,
      ),
    ).to.not.be.reverted;

    fictiveReserves = await this.contracts.smardexPair.getFictiveReserves();
    // path amountBOptimal > amountBDesired so router will calculate amountAOptimal internally
    const amountBOptimal = await this.contracts.smardexRouter.quote(
      token0Amount.add(1),
      fictiveReserves[0],
      fictiveReserves[1],
    );
    await expect(
      this.contracts.smardexRouter.addLiquidity(
        {
          tokenA: this.contracts.token0.address,
          tokenB: this.contracts.token1.address,
          amountADesired: token0Amount,
          amountBDesired: amountBOptimal.mul(2),
          amountAMin: token0Amount,
          amountBMin: 1,
          fictiveReserveB: fictiveReserves.fictiveReserve1_,
          fictiveReserveAMin: fictiveReserves.fictiveReserve0_,
          fictiveReserveAMax: fictiveReserves.fictiveReserve0_,
        },
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
        {
          tokenA: this.contracts.token0.address,
          tokenB: this.contracts.token1.address,
          amountADesired: constants.Zero,
          amountBDesired: parseEther("1"),
          amountAMin: 1,
          amountBMin: 1,
          fictiveReserveB: 0,
          fictiveReserveAMin: 0,
          fictiveReserveAMax: 0,
        },
        this.signers.admin.address,
        constants.MaxUint256,
      ),
    ).to.be.revertedWithPanic(PANIC_CODE_ARITHMETIC_UNDERFLOW_OVERFLOW);
  });
}
