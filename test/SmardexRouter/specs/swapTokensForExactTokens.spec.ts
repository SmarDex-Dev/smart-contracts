import { parseEther } from "ethers/lib/utils";
import { constants } from "ethers";
import { addLiquidity } from "../utils";
import { expect } from "chai";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";

export function shouldBehaveLikeSwapTokensForExactTokens(): void {
  const token0Amount = parseEther("5");
  const token1Amount = parseEther("10");
  const expectedTokenIn = parseEther("0.625437806464525168");
  const outputAmount = parseEther("1");

  beforeEach(async function () {
    await addLiquidity(
      token0Amount,
      token1Amount,
      this.contracts.token0,
      this.contracts.token1,
      this.contracts.smardexRouter,
      this.signers.admin.address,
    );
  });

  it("should revert with EXCESSIVE_INPUT_AMOUNT", async function () {
    await expect(
      this.contracts.smardexRouter.swapTokensForExactTokens(
        outputAmount.add(1),
        expectedTokenIn,
        [this.contracts.token0.address, this.contracts.token1.address],
        this.signers.admin.address,
        constants.MaxUint256,
      ),
    ).to.be.revertedWith("SmarDexRouter: EXCESSIVE_INPUT_AMOUNT");
  });

  it("happy path", async function () {
    await this.contracts.token0.approve(this.contracts.smardexRouter.address, constants.MaxUint256);

    const balanceAdminBefore = await this.contracts.token1.balanceOf(this.signers.admin.address);

    await expect(
      this.contracts.smardexRouter.swapTokensForExactTokens(
        outputAmount,
        constants.MaxUint256,
        [this.contracts.token0.address, this.contracts.token1.address],
        this.signers.admin.address,
        constants.MaxUint256,
      ),
    )
      .to.emit(this.contracts.token0, "Transfer")
      .withArgs(this.signers.admin.address, this.contracts.smardexPair.address, expectedTokenIn)
      .to.emit(this.contracts.token1, "Transfer")
      .withArgs(this.contracts.smardexPair.address, this.signers.admin.address, outputAmount)
      .to.emit(this.contracts.smardexPair, "Sync")
      .withArgs(
        token0Amount.add(expectedTokenIn),
        token1Amount.sub(outputAmount),
        anyValue,
        anyValue,
        token0Amount.div(2),
        token1Amount.div(2),
      )
      .to.emit(this.contracts.smardexPair, "Swap")
      .withArgs(
        this.contracts.smardexRouter.address,
        this.signers.admin.address,
        expectedTokenIn,
        -outputAmount.toBigInt(),
      );

    const balanceAdminAfter = await this.contracts.token1.balanceOf(this.signers.admin.address);
    expect(balanceAdminAfter.sub(balanceAdminBefore)).to.be.eq(outputAmount);
  });

  it("amounts", async function () {
    await this.contracts.token0.approve(this.contracts.routerEventEmitter.address, constants.MaxUint256);
    await expect(
      this.contracts.routerEventEmitter.swapTokensForExactTokens(
        this.contracts.smardexRouter.address,
        outputAmount,
        expectedTokenIn.mul(2),
        [this.contracts.token0.address, this.contracts.token1.address],
        this.signers.admin.address,
        constants.MaxUint256,
      ),
    )
      .to.emit(this.contracts.routerEventEmitter, "Amount")
      .withArgs(expectedTokenIn);
  });

  it("to of the swap can be router with address zero", async function () {
    await this.contracts.token0.approve(this.contracts.smardexRouter.address, constants.MaxUint256);

    await expect(
      this.contracts.smardexRouter.swapTokensForExactTokens(
        outputAmount,
        constants.MaxUint256,
        [this.contracts.token0.address, this.contracts.token1.address],
        constants.AddressZero,
        constants.MaxUint256,
      ),
    ).to.not.be.reverted;

    expect(await this.contracts.token1.balanceOf(this.contracts.smardexRouter.address)).to.be.eq(outputAmount);
  });
}
