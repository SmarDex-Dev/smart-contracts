import { parseEther } from "ethers/lib/utils";
import { BigNumber, constants } from "ethers";
import { expect } from "chai";
import { ADDRESS_DEAD, MINIMUM_LIQUIDITY, PANIC_CODE_ARITHMETIC_UNDERFLOW_OVERFLOW } from "../../constants";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import hre from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { unitFixtureSmardexRouter } from "../../fixtures";

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
        constants.Zero,
        parseEther("1"),
        1,
        1,
        this.signers.admin.address,
        constants.MaxUint256,
      ),
    ).to.be.revertedWithPanic(PANIC_CODE_ARITHMETIC_UNDERFLOW_OVERFLOW);
  });

  context("When gas limit is too low to run the full transaction", function () {
    let addLiquidityRequiredGas: BigNumber;

    beforeEach("", async function () {
      /* -------------------------------------------------------------------------- */
      /*                        Get addLiquidity required gas                       */
      /* -------------------------------------------------------------------------- */

      // Make an addLiquidity call to get the required gas to run the full transaction
      await this.contracts.smardexFactory.setFeeTo(this.contracts.autoSwapper.address);

      // Approves pair tokens
      await this.contracts.token0.approve(this.contracts.smardexRouter.address, constants.MaxUint256);
      await this.contracts.token1.approve(this.contracts.smardexRouter.address, constants.MaxUint256);

      // Get required gas to run the full transaction with enough gas

      const addLiquidityTx = await this.contracts.smardexRouter.addLiquidity(
        this.contracts.token0.address,
        this.contracts.token1.address,
        parseEther("1"),
        parseEther("4"),
        1,
        1,
        this.signers.admin.address,
        constants.MaxUint256,
      );

      const receipt = await addLiquidityTx.wait();

      // Store the required gas to run the full transaction
      addLiquidityRequiredGas = receipt.gasUsed;
    });

    it("Call fail when the gasLimit is insufficient to fully run addLiquidity", async function () {
      /* -------------------------------------------------------------------------- */
      /*                               Reload fixtures                              */
      /* -------------------------------------------------------------------------- */
      const { token0, token1, pair } = await loadFixture(unitFixtureSmardexRouter);
      this.contracts.token0 = token0;
      this.contracts.token1 = token1;
      this.contracts.smardexPair = pair;

      /* -------------------------------------------------------------------------- */
      /*                            Custom gasLimit call                            */
      /* -------------------------------------------------------------------------- */

      /* ------------------------------- Setup call ------------------------------- */

      await this.contracts.smardexFactory.setFeeTo(this.contracts.autoSwapper.address);

      // Approves pair tokens (new fixtures)
      await this.contracts.token0.approve(this.contracts.smardexRouter.address, constants.MaxUint256);
      await this.contracts.token1.approve(this.contracts.smardexRouter.address, constants.MaxUint256);

      /* ------------------------------ Check revert ------------------------------ */

      // Using a try catch because `.to.be.reverted` doesn't fetch
      try {
        // Execute call with insufficient gas to run _feeToSwap, but enough for call the rest

        const res = await (
          await this.contracts.smardexRouter.addLiquidity(
            this.contracts.token0.address,
            this.contracts.token1.address,
            parseEther("1"),
            parseEther("4"),
            1,
            1,
            this.signers.admin.address,
            constants.MaxUint256,
            { gasLimit: addLiquidityRequiredGas.mul(95).div(100) },
          )
        ).wait();

        console.log(res, addLiquidityRequiredGas);
      } catch (err) {
        expect((err as Error).toString()).to.eq(
          "Error: Transaction reverted: contract call run out of gas and made the transaction revert",
        );
        expect((err as { stackTrace: string[] }).stackTrace.length).to.be.greaterThan(0);
        return;
      }

      // Throw error if the call didn't fail as expected
      throw new Error("Call did not failed as expected");
    });
  });
}
