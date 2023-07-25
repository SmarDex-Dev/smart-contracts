import { parseEther } from "ethers/lib/utils";
import { constants } from "ethers";
import { WETHPairInitialize } from "../utils";
import { expect } from "chai";
import { ethers } from "hardhat";
import { addLiquidity } from "../utils";
import { ERC20Test } from "../../../typechain";

export function shouldRefundUnusedETH(): void {
  let wethPair: string;
  let tokensPair: string;

  const checkPairBalance = async function (pair: string) {
    const pairBalanceBefore = await ethers.provider.getBalance(pair);
    // Pair should not have any ETH
    expect(pairBalanceBefore).to.eq(0);
  };

  /* ----------------------- swapETHForExactTokens value ---------------------- */
  const WETHPartnerAmount = parseEther("10");
  const ETHAmount = parseEther("5");
  const expectedSwapAmount = parseEther("0.625437806464525168");
  const outputAmount = parseEther("1");

  /* ---------------------- swapExactETHForTokens values ---------------------- */
  const swapAmount = parseEther("1");
  const expectedOutputTokenAmount = parseEther("1.427856999971422855");

  /* ---------------------- swapExactTokensForETH values ---------------------- */
  const expectedOutputEthAmount = parseEther("0.416423582751320987");

  /* --------------------- swapTokensForExactTokens values -------------------- */
  const token0Amount = parseEther("5");
  const token1Amount = parseEther("10");

  /* ---------------------- swapTokensForExactETH values ---------------------- */
  const expectedOutputWethAmount = parseEther("3.335668301144134228");

  beforeEach(async function () {
    await WETHPairInitialize.call(this, WETHPartnerAmount, ETHAmount);

    await this.contracts.token0.approve(this.contracts.smardexRouter.address, constants.MaxUint256);
    await this.contracts.token0.approve(this.contracts.smardexRouter.address, constants.MaxUint256);
    await this.contracts.WETHPartner.approve(this.contracts.smardexRouter.address, constants.MaxUint256);
    await this.contracts.WETH.approve(this.contracts.smardexRouter.address, constants.MaxUint256);
    await this.contracts.WETH.deposit({ value: ETHAmount });

    await addLiquidity(
      token0Amount,
      token1Amount,
      this.contracts.token0,
      this.contracts.token1,
      this.contracts.smardexRouter,
      this.signers.admin.address,
    );

    await this.contracts.WETH.deposit({ value: ETHAmount });
    await addLiquidity(
      token1Amount,
      ETHAmount,
      this.contracts.token1,
      { address: this.contracts.WETH.address } as ERC20Test,
      this.contracts.smardexRouter,
      this.signers.admin.address,
    );

    wethPair = await this.contracts.smardexFactory.getPair(
      this.contracts.WETH.address,
      this.contracts.WETHPartner.address,
    );
    tokensPair = await this.contracts.smardexFactory.getPair(
      this.contracts.token0.address,
      this.contracts.token1.address,
    );
  });

  // Check amounts when swapETHForExactTokens
  it("should refund the unused ETH to msg.sender", async function () {
    const balAdminBefore = await this.signers.admin.getBalance();
    const balUserBefore = await this.signers.user.getBalance();
    await checkPairBalance(wethPair);

    const routerAsAdmin = this.contracts.smardexRouter.connect(this.signers.admin);
    await routerAsAdmin.swapETHForExactTokens(
      outputAmount,
      [this.contracts.WETH.address, this.contracts.WETHPartner.address],
      this.signers.user.address,
      constants.MaxUint256,
      {
        value: expectedSwapAmount.add(parseEther("1")), // send 1 extra ETH
      },
    );

    const balAdminAfter = await this.signers.admin.getBalance();
    const balUserAfter = await this.signers.user.getBalance();

    await checkPairBalance(wethPair);

    // Admin balance should be decreased by the expectedSwapAmount + the fees only,
    // not the extra sent ETH that should be refunded
    expect(balAdminBefore.sub(balAdminAfter)).to.be.approximately(expectedSwapAmount, parseEther("0.01"));

    // User ETH balance should not be increased by the extra sent ETH
    expect(balUserAfter.sub(balUserBefore)).to.eq(0);
  });

  it("should not have any ETH in the pair on swapExactETHForTokens", async function () {
    await checkPairBalance(wethPair);

    await expect(
      this.contracts.routerEventEmitter.swapExactETHForTokens(
        this.contracts.smardexRouter.address,
        0,
        [this.contracts.WETH.address, this.contracts.WETHPartner.address],
        this.signers.admin.address,
        constants.MaxUint256,
        {
          value: swapAmount,
        },
      ),
    )
      .to.emit(this.contracts.routerEventEmitter, "Amount")
      .withArgs(expectedOutputTokenAmount);

    await checkPairBalance(wethPair);
  });

  it("should not have any ETH in the pair on swapExactTokensForETH", async function () {
    await checkPairBalance(wethPair);

    await this.contracts.WETHPartner.approve(this.contracts.routerEventEmitter.address, constants.MaxUint256);
    await expect(
      this.contracts.routerEventEmitter.swapExactTokensForTokens(
        this.contracts.smardexRouter.address,
        swapAmount,
        0,
        [this.contracts.WETHPartner.address, this.contracts.WETH.address],
        this.signers.admin.address,
        constants.MaxUint256,
      ),
    )
      .to.emit(this.contracts.routerEventEmitter, "Amount")
      .withArgs(expectedOutputEthAmount);

    await checkPairBalance(wethPair);
  });

  it("should not have any ETH in the pair on swapExactTokensForTokens", async function () {
    await checkPairBalance(tokensPair);

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
      .withArgs(expectedOutputTokenAmount);

    await checkPairBalance(tokensPair);
  });

  it("should not have any ETH in the pair on swapTokensForExactETH", async function () {
    await checkPairBalance(wethPair);

    await this.contracts.WETHPartner.approve(this.contracts.routerEventEmitter.address, constants.MaxUint256);
    await expect(
      this.contracts.routerEventEmitter.swapTokensForExactTokens(
        this.contracts.smardexRouter.address,
        outputAmount,
        expectedOutputWethAmount,
        [this.contracts.WETHPartner.address, this.contracts.WETH.address],
        this.signers.admin.address,
        constants.MaxUint256,
      ),
    )
      .to.emit(this.contracts.routerEventEmitter, "Amount")
      .withArgs(expectedOutputWethAmount);

    await checkPairBalance(wethPair);
  });

  it("should not have any ETH in the pair on swapTokensForExactTokens", async function () {
    await checkPairBalance(tokensPair);

    await this.contracts.token0.approve(this.contracts.routerEventEmitter.address, constants.MaxUint256);
    await expect(
      this.contracts.routerEventEmitter.swapTokensForExactTokens(
        this.contracts.smardexRouter.address,
        outputAmount,
        expectedSwapAmount.mul(2),
        [this.contracts.token0.address, this.contracts.token1.address],
        this.signers.admin.address,
        constants.MaxUint256,
      ),
    )
      .to.emit(this.contracts.routerEventEmitter, "Amount")
      .withArgs(expectedSwapAmount);

    await checkPairBalance(tokensPair);
  });

  it("should not have any ETH in the pair on swapTokensForExactTokens", async function () {
    await checkPairBalance(tokensPair);

    await this.contracts.token0.approve(this.contracts.routerEventEmitter.address, constants.MaxUint256);
    await expect(
      this.contracts.routerEventEmitter.swapTokensForExactTokens(
        this.contracts.smardexRouter.address,
        outputAmount,
        expectedSwapAmount.mul(2),
        [this.contracts.token0.address, this.contracts.token1.address],
        this.signers.admin.address,
        constants.MaxUint256,
      ),
    )
      .to.emit(this.contracts.routerEventEmitter, "Amount")
      .withArgs(expectedSwapAmount);

    await checkPairBalance(tokensPair);
  });

  context("When path contains more than 2 tokens", async function () {
    it("should not have ETH in the pair when WETH is in the middle of the path", async function () {
      await checkPairBalance(wethPair);

      await expect(
        this.contracts.smardexRouter.swapExactTokensForTokens(
          1000000,
          0,
          [
            this.contracts.token0.address,
            this.contracts.token1.address,
            this.contracts.WETH.address,
            this.contracts.WETHPartner.address,
          ],
          this.signers.admin.address,
          constants.MaxUint256,
        ),
      ).to.not.be.reverted;

      await checkPairBalance(wethPair);

      await expect(
        this.contracts.smardexRouter.swapExactTokensForTokens(
          1000000,
          0,
          [
            this.contracts.WETHPartner.address,
            this.contracts.WETH.address,
            this.contracts.token1.address,
            this.contracts.token0.address,
          ],
          this.signers.admin.address,
          constants.MaxUint256,
        ),
      ).to.not.be.reverted;

      await checkPairBalance(wethPair);
    });

    it("should not have ETH in the pair when WETH is the last element of the path", async function () {
      await checkPairBalance(wethPair);

      await expect(
        this.contracts.smardexRouter.swapExactTokensForETH(
          1000000,
          0,
          [this.contracts.token0.address, this.contracts.token1.address, this.contracts.WETH.address],
          this.signers.admin.address,
          constants.MaxUint256,
        ),
      ).to.not.be.reverted;

      await checkPairBalance(wethPair);
    });

    it("should not have ETH in the pair when WETH is the first element of the path", async function () {
      await checkPairBalance(wethPair);

      await expect(
        this.contracts.smardexRouter.swapETHForExactTokens(
          outputAmount,
          [this.contracts.WETH.address, this.contracts.WETHPartner.address],
          this.signers.user.address,
          constants.MaxUint256,
          {
            value: expectedSwapAmount.add(parseEther("1")), // send 1 extra ETH
          },
        ),
      ).to.not.be.reverted;

      await checkPairBalance(wethPair);
    });
  });
}
