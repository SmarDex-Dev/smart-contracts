import { parseEther } from "ethers/lib/utils";
import { constants } from "ethers";
import { addLiquidity } from "../utils";
import { expect } from "chai";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";

export function shouldBehaveLikeSwapExactTokensForTokens(): void {
  const token0Amount = parseEther("5");
  const token1Amount = parseEther("10");
  const swapAmount = parseEther("1");
  const expectedOutputAmount = parseEther("1.427856999971422855");

  beforeEach(async function () {
    await addLiquidity(
      token0Amount,
      token1Amount,
      this.contracts.token0,
      this.contracts.token1,
      this.contracts.smardexRouter,
      this.signers.admin.address,
    );
    await this.contracts.token0.approve(this.contracts.smardexRouter.address, constants.MaxUint256);
  });

  it("should revert with INSUFFICIENT_OUTPUT_AMOUNT", async function () {
    await expect(
      this.contracts.smardexRouter.swapExactTokensForTokens(
        swapAmount,
        expectedOutputAmount.add(1),
        [this.contracts.token0.address, this.contracts.token1.address],
        this.signers.admin.address,
        constants.MaxUint256,
      ),
    ).to.be.revertedWith("SmarDexRouter: INSUFFICIENT_OUTPUT_AMOUNT");
  });

  it("happy path", async function () {
    const balanceAdminBefore = await this.contracts.token1.balanceOf(this.signers.admin.address);

    await expect(
      this.contracts.smardexRouter.swapExactTokensForTokens(
        swapAmount,
        0,
        [this.contracts.token0.address, this.contracts.token1.address],
        this.signers.admin.address,
        constants.MaxUint256,
      ),
    )
      .to.emit(this.contracts.token0, "Transfer")
      .withArgs(this.signers.admin.address, this.contracts.smardexPair.address, swapAmount)
      .to.emit(this.contracts.token1, "Transfer")
      .withArgs(this.contracts.smardexPair.address, this.signers.admin.address, expectedOutputAmount)
      .to.emit(this.contracts.smardexPair, "Sync")
      .withArgs(
        token0Amount.add(swapAmount),
        token1Amount.sub(expectedOutputAmount),
        anyValue,
        anyValue,
        token0Amount.div(2),
        token1Amount.div(2),
      )
      .to.emit(this.contracts.smardexPair, "Swap")
      .withArgs(
        this.contracts.smardexRouter.address,
        this.signers.admin.address,
        swapAmount,
        -expectedOutputAmount.toBigInt(),
      );
    const balanceAdminAfter = await this.contracts.token1.balanceOf(this.signers.admin.address);
    expect(balanceAdminAfter.sub(balanceAdminBefore)).to.be.eq(expectedOutputAmount);
  });

  it("amounts", async function () {
    await this.contracts.token0.approve(this.contracts.routerEventEmitter.address, constants.MaxUint256);
    await expect(
      this.contracts.routerEventEmitter.swapExactTokensForTokens(
        this.contracts.smardexRouter.address,
        swapAmount,
        0,
        [this.contracts.token0.address, this.contracts.token1.address],
        this.signers.admin.address,
        constants.MaxUint256,
      ),
    )
      .to.emit(this.contracts.routerEventEmitter, "Amount")
      .withArgs(expectedOutputAmount);
  });

  it("to of the swap can be router with address zero", async function () {
    await expect(
      this.contracts.smardexRouter.swapExactTokensForTokens(
        swapAmount,
        0,
        [this.contracts.token0.address, this.contracts.token1.address],
        constants.AddressZero,
        constants.MaxUint256,
      ),
    ).to.not.be.reverted;

    expect(await this.contracts.token1.balanceOf(this.contracts.smardexRouter.address)).to.be.eq(expectedOutputAmount);
  });
}
