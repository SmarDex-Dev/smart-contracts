import { expect } from "chai";
import { BigNumber, constants } from "ethers";
import { parseEther } from "ethers/lib/utils";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ERC20Test, WETH9 } from "../../../typechain";
import { SmardexPair__factory } from "../../../typechain";

interface CurrentBalance {
  token0: BigNumber;
  token1: BigNumber;
  WETHPartner: BigNumber;
  WETH: BigNumber;
  ETH: BigNumber;
}

async function getUserBalances(
  signer: SignerWithAddress,
  token0: ERC20Test,
  token1: ERC20Test,
  WETHPartner: ERC20Test,
  WETH9: WETH9,
): Promise<CurrentBalance> {
  return {
    token0: await token0.balanceOf(signer.address),
    token1: await token1.balanceOf(signer.address),
    WETHPartner: await WETHPartner.balanceOf(signer.address),
    WETH: await WETH9.balanceOf(signer.address),
    ETH: await signer.getBalance(),
  };
}

export function shouldBehaveLikeRouterScenarios() {
  const TOKEN0_AMOUNT = parseEther("10");
  const TOKEN1_AMOUNT = parseEther("40");
  const FIRST_SWAP_AMOUNT = parseEther("2");
  const SECOND_SWAP_AMOUNT = parseEther("1");

  it("should addLiquidity with MintCallback", async function () {
    await this.contracts.token0.approve(this.contracts.smardexRouter.address, constants.MaxUint256);
    await this.contracts.token1.approve(this.contracts.smardexRouter.address, constants.MaxUint256);
    await this.contracts.smardexRouter.addLiquidity(
      this.contracts.token0.address,
      this.contracts.token1.address,
      TOKEN0_AMOUNT,
      TOKEN1_AMOUNT,
      0,
      0,
      this.signers.admin.address,
      constants.MaxUint256,
    );
    expect(await this.contracts.smardexPair.balanceOf(this.signers.admin.address)).to.be.gt(0);
  });
  it("should addLiquidityETH with MintCallback", async function () {
    const token0Amount = parseEther("10");
    const token1Amount = parseEther("40");

    await this.contracts.token0.approve(this.contracts.smardexRouter.address, constants.MaxUint256);
    await this.contracts.smardexRouter.addLiquidityETH(
      this.contracts.token0.address,
      token0Amount,
      0,
      0,
      this.signers.admin.address,
      constants.MaxUint256,
      {
        value: token1Amount,
      },
    );
    const pair = await this.contracts.smardexFactory.getPair(
      this.contracts.token0.address,
      this.contracts.WETH.address,
    );
    expect(await SmardexPair__factory.connect(pair, this.signers.admin).balanceOf(this.signers.admin.address)).to.be.gt(
      0,
    );
  });

  it("addLiquidity and should swap Exact In", async function () {
    await this.contracts.smardexRouter.addLiquidity(
      this.contracts.token0.address,
      this.contracts.token1.address,
      TOKEN0_AMOUNT,
      TOKEN1_AMOUNT,
      0,
      0,
      this.signers.admin.address,
      constants.MaxUint256,
    );

    await this.contracts.smardexRouter.addLiquidity(
      this.contracts.token1.address,
      this.contracts.WETHPartner.address,
      TOKEN0_AMOUNT,
      TOKEN1_AMOUNT,
      0,
      0,
      this.signers.admin.address,
      constants.MaxUint256,
    );

    await this.contracts.token0.transfer(this.signers.user.address, FIRST_SWAP_AMOUNT.add(SECOND_SWAP_AMOUNT));
    await this.contracts.token0
      .connect(this.signers.user)
      .approve(this.contracts.smardexRouter.address, constants.MaxUint256);

    const balBefore = await getUserBalances(
      this.signers.user,
      this.contracts.token0,
      this.contracts.token1,
      this.contracts.WETHPartner,
      this.contracts.WETH,
    );

    await this.contracts.smardexRouter
      .connect(this.signers.user)
      .swapExactTokensForTokens(
        FIRST_SWAP_AMOUNT,
        0,
        [this.contracts.token0.address, this.contracts.token1.address],
        this.signers.user.address,
        constants.MaxUint256,
      );

    const balAfter = await getUserBalances(
      this.signers.user,
      this.contracts.token0,
      this.contracts.token1,
      this.contracts.WETHPartner,
      this.contracts.WETH,
    );

    expect(balAfter.token0).to.be.eq(SECOND_SWAP_AMOUNT);
    expect(balAfter.token1).to.be.gt(balBefore.token1);

    await this.contracts.smardexRouter
      .connect(this.signers.user)
      .swapExactTokensForTokens(
        SECOND_SWAP_AMOUNT,
        0,
        [this.contracts.token0.address, this.contracts.token1.address, this.contracts.WETHPartner.address],
        this.signers.user.address,
        constants.MaxUint256,
      );

    const balAfter2 = await getUserBalances(
      this.signers.user,
      this.contracts.token0,
      this.contracts.token1,
      this.contracts.WETHPartner,
      this.contracts.WETH,
    );

    expect(balAfter2.token0).to.be.eq(0);
    expect(balAfter2.WETHPartner).to.be.gt(balBefore.WETHPartner);

    await expect(
      this.contracts.smardexRouter.addLiquidity(
        this.contracts.token0.address,
        this.contracts.token1.address,
        TOKEN0_AMOUNT,
        TOKEN1_AMOUNT,
        1,
        1, //"33334596064823583783",
        this.signers.admin.address,
        constants.MaxUint256,
      ),
    ).to.not.be.reverted;

    // path amountBOptimal > amountBDesired so router will calculate amountAOptimal internally
    const fictiveReserves = await this.contracts.smardexPair.getFictiveReserves();
    const amountBOptimal = await this.contracts.smardexRouter.quote(
      TOKEN0_AMOUNT.add(1),
      fictiveReserves[0],
      fictiveReserves[1],
    );
    await expect(
      this.contracts.smardexRouter.addLiquidity(
        this.contracts.token0.address,
        this.contracts.token1.address,
        TOKEN0_AMOUNT.add(1),
        amountBOptimal.add(1),
        1,
        1,
        this.signers.admin.address,
        constants.MaxUint256,
      ),
    )
      .to.emit(this.contracts.token0, "Transfer")
      .withArgs(this.signers.admin.address, this.contracts.smardexPair.address, anyValue)
      .to.emit(this.contracts.token1, "Transfer")
      .withArgs(this.signers.admin.address, this.contracts.smardexPair.address, anyValue)
      .to.emit(this.contracts.smardexPair, "Transfer")
      .to.emit(this.contracts.smardexPair, "Sync");
  });

  it("addLiquidity and should swap Exact In to ETH", async function () {
    await this.contracts.smardexRouter.addLiquidityETH(
      this.contracts.WETHPartner.address,
      TOKEN1_AMOUNT,
      0,
      0,
      this.signers.admin.address,
      constants.MaxUint256,
      {
        value: TOKEN0_AMOUNT,
      },
    );

    await this.contracts.smardexRouter.addLiquidity(
      this.contracts.token1.address,
      this.contracts.WETHPartner.address,
      TOKEN0_AMOUNT,
      TOKEN1_AMOUNT,
      0,
      0,
      this.signers.admin.address,
      constants.MaxUint256,
    );

    await this.contracts.WETHPartner.transfer(this.signers.user.address, FIRST_SWAP_AMOUNT);
    await this.contracts.token1.transfer(this.signers.user.address, SECOND_SWAP_AMOUNT);
    await this.contracts.WETHPartner.connect(this.signers.user).approve(
      this.contracts.smardexRouter.address,
      constants.MaxUint256,
    );
    await this.contracts.token1
      .connect(this.signers.user)
      .approve(this.contracts.smardexRouter.address, constants.MaxUint256);

    const balBefore = await getUserBalances(
      this.signers.user,
      this.contracts.token0,
      this.contracts.token1,
      this.contracts.WETHPartner,
      this.contracts.WETH,
    );
    const WETHPartnerPair = await this.contracts.smardexFactory.getPair(
      this.contracts.WETH.address,
      this.contracts.WETHPartner.address,
    );
    const pairBalanceWETHPartnerBefore = await this.contracts.WETHPartner.balanceOf(WETHPartnerPair);

    await this.contracts.smardexRouter
      .connect(this.signers.user)
      .swapExactTokensForETH(
        FIRST_SWAP_AMOUNT,
        0,
        [this.contracts.WETHPartner.address, this.contracts.WETH.address],
        this.signers.user.address,
        constants.MaxUint256,
      );

    const pairBalanceWETHPartnerAfter = await this.contracts.WETHPartner.balanceOf(WETHPartnerPair);
    const balAfter = await getUserBalances(
      this.signers.user,
      this.contracts.token0,
      this.contracts.token1,
      this.contracts.WETHPartner,
      this.contracts.WETH,
    );

    expect(balAfter.ETH).to.be.gt(balBefore.ETH);
    expect(balAfter.WETHPartner).to.be.eq(0);
    expect(pairBalanceWETHPartnerAfter).to.be.eq(pairBalanceWETHPartnerBefore.add(FIRST_SWAP_AMOUNT));

    const token1Pair = await this.contracts.smardexFactory.getPair(
      this.contracts.token1.address,
      this.contracts.WETHPartner.address,
    );
    const pairBalanceToken1Before = await this.contracts.token1.balanceOf(token1Pair);

    await this.contracts.smardexRouter
      .connect(this.signers.user)
      .swapExactTokensForETH(
        SECOND_SWAP_AMOUNT,
        0,
        [this.contracts.token1.address, this.contracts.WETHPartner.address, this.contracts.WETH.address],
        this.signers.user.address,
        constants.MaxUint256,
      );
    const pairBalanceToken1After = await this.contracts.token1.balanceOf(token1Pair);

    const balAfter2 = await getUserBalances(
      this.signers.user,
      this.contracts.token0,
      this.contracts.token1,
      this.contracts.WETHPartner,
      this.contracts.WETH,
    );

    expect(pairBalanceToken1After).to.be.eq(pairBalanceToken1Before.add(SECOND_SWAP_AMOUNT));
    expect(balAfter2.token1).to.be.eq(0);
    expect(balAfter2.ETH).to.be.gt(balAfter.ETH);
  });

  it("addLiquidity and should swap Exact Out", async function () {
    await this.contracts.smardexRouter.addLiquidity(
      this.contracts.token0.address,
      this.contracts.token1.address,
      TOKEN0_AMOUNT,
      TOKEN1_AMOUNT,
      0,
      0,
      this.signers.admin.address,
      constants.MaxUint256,
    );

    await this.contracts.smardexRouter.addLiquidity(
      this.contracts.token1.address,
      this.contracts.WETHPartner.address,
      TOKEN0_AMOUNT,
      TOKEN1_AMOUNT,
      0,
      0,
      this.signers.admin.address,
      constants.MaxUint256,
    );

    await this.contracts.token0.transfer(this.signers.user.address, parseEther("14"));
    await this.contracts.token0
      .connect(this.signers.user)
      .approve(this.contracts.smardexRouter.address, constants.MaxUint256);

    await this.contracts.token1.transfer(this.signers.user.address, parseEther("12"));
    await this.contracts.token1
      .connect(this.signers.user)
      .approve(this.contracts.smardexRouter.address, constants.MaxUint256);

    const balBefore = await getUserBalances(
      this.signers.user,
      this.contracts.token0,
      this.contracts.token1,
      this.contracts.WETHPartner,
      this.contracts.WETH,
    );

    await this.contracts.smardexRouter.connect(this.signers.user).swapTokensForExactTokens(
      FIRST_SWAP_AMOUNT,
      parseEther("13.3271140"), //ExcelV13 value
      [this.contracts.token0.address, this.contracts.token1.address],
      this.signers.user.address,
      constants.MaxUint256,
    );

    const balAfter = await getUserBalances(
      this.signers.user,
      this.contracts.token0,
      this.contracts.token1,
      this.contracts.WETHPartner,
      this.contracts.WETH,
    );

    expect(balAfter.token0).to.be.lt(balBefore.token0);
    expect(balAfter.token1.sub(balBefore.token1)).to.eq(FIRST_SWAP_AMOUNT);

    await this.contracts.smardexRouter
      .connect(this.signers.user)
      .swapTokensForExactTokens(
        SECOND_SWAP_AMOUNT,
        "263289539506595403",
        [this.contracts.token0.address, this.contracts.token1.address, this.contracts.WETHPartner.address],
        this.signers.user.address,
        constants.MaxUint256,
      );

    const balAfter2 = await getUserBalances(
      this.signers.user,
      this.contracts.token0,
      this.contracts.token1,
      this.contracts.WETHPartner,
      this.contracts.WETH,
    );

    expect(balAfter2.token0).to.be.lt(balAfter.token0);
    expect(balAfter2.WETHPartner.sub(balBefore.WETHPartner)).to.eq(SECOND_SWAP_AMOUNT);

    await this.contracts.smardexRouter
      .connect(this.signers.user)
      .swapTokensForExactTokens(
        FIRST_SWAP_AMOUNT,
        "11389255501490301553",
        [this.contracts.token1.address, this.contracts.token0.address],
        this.signers.user.address,
        constants.MaxUint256,
      );

    const balAfter3 = await getUserBalances(
      this.signers.user,
      this.contracts.token0,
      this.contracts.token1,
      this.contracts.WETHPartner,
      this.contracts.WETH,
    );

    expect(balAfter3.token1).to.be.lt(balAfter2.token1);
    expect(balAfter3.token0.sub(balAfter2.token0)).to.eq(FIRST_SWAP_AMOUNT);

    await expect(
      this.contracts.smardexRouter.addLiquidity(
        this.contracts.token0.address,
        this.contracts.token1.address,
        TOKEN0_AMOUNT,
        TOKEN1_AMOUNT,
        1,
        1, //"33334596064823583783",
        this.signers.admin.address,
        constants.MaxUint256,
      ),
    ).to.not.be.reverted;

    // path amountBOptimal > amountBDesired so router will calculate amountAOptimal internally
    const fictiveReserves = await this.contracts.smardexPair.getFictiveReserves();
    const amountBOptimal = await this.contracts.smardexRouter.quote(
      TOKEN0_AMOUNT.add(1),
      fictiveReserves[0],
      fictiveReserves[1],
    );
    await expect(
      this.contracts.smardexRouter.addLiquidity(
        this.contracts.token0.address,
        this.contracts.token1.address,
        TOKEN0_AMOUNT.add(1),
        amountBOptimal.add(1),
        1,
        1,
        this.signers.admin.address,
        constants.MaxUint256,
      ),
    )
      .to.emit(this.contracts.token0, "Transfer")
      .withArgs(this.signers.admin.address, this.contracts.smardexPair.address, anyValue)
      .to.emit(this.contracts.token1, "Transfer")
      .withArgs(this.signers.admin.address, this.contracts.smardexPair.address, anyValue)
      .to.emit(this.contracts.smardexPair, "Transfer")
      .to.emit(this.contracts.smardexPair, "Sync");
  });

  it("addLiquidity and should swap Exact In with ETH with function swapExactETHForTokens", async function () {
    await this.contracts.smardexRouter.addLiquidityETH(
      this.contracts.WETHPartner.address,
      TOKEN1_AMOUNT,
      0,
      0,
      this.signers.admin.address,
      constants.MaxUint256,
      {
        value: TOKEN0_AMOUNT,
      },
    );

    const balBefore = await getUserBalances(
      this.signers.user,
      this.contracts.token0,
      this.contracts.token1,
      this.contracts.WETHPartner,
      this.contracts.WETH,
    );

    const swapAmount = parseEther("2");
    //warning we make swap from admin, to user address
    const firstPath = [this.contracts.WETH.address, this.contracts.WETHPartner.address];
    await this.contracts.smardexRouter.swapExactETHForTokens(
      0,
      firstPath,
      this.signers.user.address,
      constants.MaxUint256,
      {
        value: swapAmount,
      },
    );

    const balAfter = await getUserBalances(
      this.signers.user,
      this.contracts.token0,
      this.contracts.token1,
      this.contracts.WETHPartner,
      this.contracts.WETH,
    );

    expect(balAfter.WETHPartner).to.be.gt(balBefore.WETHPartner);

    await this.contracts.smardexRouter.addLiquidity(
      this.contracts.token1.address,
      this.contracts.WETHPartner.address,
      TOKEN0_AMOUNT,
      TOKEN1_AMOUNT,
      0,
      0,
      this.signers.admin.address,
      constants.MaxUint256,
    );

    const secondPath = [this.contracts.WETH.address, this.contracts.WETHPartner.address, this.contracts.token1.address];
    await this.contracts.smardexRouter.swapExactETHForTokens(
      0,
      secondPath,
      this.signers.user.address,
      constants.MaxUint256,
      {
        value: parseEther("1"),
      },
    );

    const balAfter2 = await getUserBalances(
      this.signers.user,
      this.contracts.token0,
      this.contracts.token1,
      this.contracts.WETHPartner,
      this.contracts.WETH,
    );
    await expect(balAfter2.token1).to.be.gt(balBefore.token1);
  });

  it("addLiquidity and should swap ETH to Exact Out tokens with swapETHForExactTokens", async function () {
    await this.contracts.smardexRouter.addLiquidityETH(
      this.contracts.WETHPartner.address,
      TOKEN1_AMOUNT,
      0,
      0,
      this.signers.admin.address,
      constants.MaxUint256,
      {
        value: TOKEN0_AMOUNT,
      },
    );

    const ethPair = await this.contracts.smardexFactory.getPair(
      this.contracts.WETH.address,
      this.contracts.WETHPartner.address,
    );

    const balBefore = await getUserBalances(
      this.signers.user,
      this.contracts.token0,
      this.contracts.token1,
      this.contracts.WETHPartner,
      this.contracts.WETH,
    );
    const pairBalanceWETHBefore = await this.contracts.WETH.balanceOf(ethPair);

    const swapAmount = parseEther("2");
    const firstPath = [this.contracts.WETH.address, this.contracts.WETHPartner.address];
    const msgValueETH = swapAmount.mul(10);

    await this.contracts.smardexRouter
      .connect(this.signers.user)
      .swapETHForExactTokens(swapAmount, firstPath, this.signers.user.address, constants.MaxUint256, {
        //we should calculate ETH to send because it is an exact out swap
        value: msgValueETH,
      });

    const balAfter = await getUserBalances(
      this.signers.user,
      this.contracts.token0,
      this.contracts.token1,
      this.contracts.WETHPartner,
      this.contracts.WETH,
    );
    const pairBalanceWETHAfter = await this.contracts.WETH.balanceOf(ethPair);

    expect(balAfter.WETHPartner.sub(balBefore.WETHPartner)).to.eq(swapAmount);
    expect(balBefore.ETH.sub(balAfter.ETH)).to.be.approximately(
      pairBalanceWETHAfter.sub(pairBalanceWETHBefore),
      parseEther("0.001"),
    );

    await this.contracts.smardexRouter.addLiquidity(
      this.contracts.token1.address,
      this.contracts.WETHPartner.address,
      TOKEN0_AMOUNT,
      TOKEN1_AMOUNT,
      0,
      0,
      this.signers.admin.address,
      constants.MaxUint256,
    );

    const balAfter2 = await getUserBalances(
      this.signers.user,
      this.contracts.token0,
      this.contracts.token1,
      this.contracts.WETHPartner,
      this.contracts.WETH,
    );
    const secondValueETH = parseEther("10");
    const balAdminBefore = await getUserBalances(
      this.signers.admin,
      this.contracts.token0,
      this.contracts.token1,
      this.contracts.WETHPartner,
      this.contracts.WETH,
    );

    const secondPath = [this.contracts.WETH.address, this.contracts.WETHPartner.address, this.contracts.token1.address];
    await this.contracts.smardexRouter.swapETHForExactTokens(
      parseEther("1"),
      secondPath,
      this.signers.user.address,
      constants.MaxUint256,
      {
        value: secondValueETH,
      },
    );

    const balAdminAfter = await getUserBalances(
      this.signers.admin,
      this.contracts.token0,
      this.contracts.token1,
      this.contracts.WETHPartner,
      this.contracts.WETH,
    );
    const pairBalanceWETHAfter2 = await this.contracts.WETH.balanceOf(ethPair);

    // we expect that ETH balance after is decreased by 10 ETH - 7.859 ETH because thay are refunded
    const expectedBalance = balAdminBefore.ETH.sub(secondValueETH).add(
      secondValueETH.sub(pairBalanceWETHAfter2.sub(pairBalanceWETHAfter)),
    );
    expect(balAdminAfter.ETH).to.be.approximately(expectedBalance, parseEther("0.001"));

    const balAfter3 = await getUserBalances(
      this.signers.user,
      this.contracts.token0,
      this.contracts.token1,
      this.contracts.WETHPartner,
      this.contracts.WETH,
    );

    // we expect that weth balance is not changed because we use ETH wrapped in contract
    expect(balAfter3.WETH).to.eq(balAfter2.WETH);
    expect(balAfter3.token1.sub(balAfter2.token1)).to.eq(parseEther("1"));
    expect(balAfter3.ETH.sub(balAfter2.ETH)).to.be.eq(0);

    await this.contracts.smardexRouter.swapTokensForExactETH(
      parseEther("1"),
      constants.MaxUint256,
      [this.contracts.token1.address, this.contracts.WETHPartner.address, this.contracts.WETH.address],
      this.signers.user.address,
      constants.MaxUint256,
    );

    const balAfter4 = await getUserBalances(
      this.signers.user,
      this.contracts.token0,
      this.contracts.token1,
      this.contracts.WETHPartner,
      this.contracts.WETH,
    );

    expect(balAfter4.ETH.sub(balAfter3.ETH)).to.eq(parseEther("1"));
    expect(balAfter4.WETH).to.eq(balAfter3.WETH);
  });

  it("Try to destabilize pair with sending more tokens than expected", async function () {
    const swapAmount = parseEther("1");
    const expectedAmountForUser = parseEther("0.979719329480993");
    await this.contracts.token0
      .connect(this.signers.user)
      .approve(this.contracts.smardexRouter.address, constants.MaxUint256);
    await this.contracts.token1
      .connect(this.signers.user)
      .approve(this.contracts.smardexRouter.address, constants.MaxUint256);
    await this.contracts.token0.connect(this.signers.admin).transfer(this.signers.user.address, swapAmount.mul(100));
    await this.contracts.token0.connect(this.signers.admin).transfer(this.signers.feeTo.address, swapAmount.mul(100));
    await this.contracts.token1.connect(this.signers.admin).transfer(this.signers.user.address, swapAmount.mul(100));

    const balBeforeAdmin = await getUserBalances(
      this.signers.admin,
      this.contracts.token0,
      this.contracts.token1,
      this.contracts.WETHPartner,
      this.contracts.WETH,
    );
    const balBeforeUser = await getUserBalances(
      this.signers.user,
      this.contracts.token0,
      this.contracts.token1,
      this.contracts.WETHPartner,
      this.contracts.WETH,
    );

    await this.contracts.smardexRouter
      .connect(this.signers.admin)
      .addLiquidity(
        this.contracts.token0.address,
        this.contracts.token1.address,
        parseEther("100"),
        parseEther("100"),
        0,
        0,
        this.signers.admin.address,
        constants.MaxUint256,
      );

    // we force move price to 100:200 balances by sending free tokens to pair
    // A swap would change price but also change a lot price and that we dont want
    await this.contracts.token0
      .connect(this.signers.feeTo)
      .transfer(this.contracts.smardexPair.address, swapAmount.mul(100));

    const firstPath = [this.contracts.token0.address, this.contracts.token1.address];

    await this.contracts.smardexRouter
      .connect(this.signers.user)
      .swapExactTokensForTokens(swapAmount, 1, firstPath, this.signers.user.address, constants.MaxUint256);

    const balAfterUser = await getUserBalances(
      this.signers.user,
      this.contracts.token0,
      this.contracts.token1,
      this.contracts.WETHPartner,
      this.contracts.WETH,
    );

    expect(balBeforeUser.token0.sub(balAfterUser.token0)).to.eq(swapAmount);
    await this.contracts.smardexRouter
      .connect(this.signers.user)
      .swapTokensForExactTokens(
        swapAmount,
        constants.MaxUint256,
        firstPath,
        this.signers.user.address,
        constants.MaxUint256,
      );
    expect(balAfterUser.token1.sub(balBeforeUser.token1)).to.be.approximately(
      expectedAmountForUser,
      parseEther("0.007"), //pair price is destabilized but not that much because fictiveReserves are not updated by sending free tokens to pair
    );

    await this.contracts.smardexPair.approve(this.contracts.smardexRouter.address, constants.MaxUint256);
    await this.contracts.smardexRouter.removeLiquidity(
      this.contracts.token0.address,
      this.contracts.token1.address,
      this.contracts.smardexPair.balanceOf(this.signers.admin.address),
      1,
      1,
      this.signers.admin.address,
      constants.MaxUint256,
    );

    const balanceLPremovedAdmin = await getUserBalances(
      this.signers.admin,
      this.contracts.token0,
      this.contracts.token1,
      this.contracts.WETHPartner,
      this.contracts.WETH,
    );

    // we expect admin to get at least the 100 tokens sent freely in pair
    expect(
      balanceLPremovedAdmin.token0
        .add(balanceLPremovedAdmin.token1)
        .sub(balBeforeAdmin.token0)
        .sub(balBeforeAdmin.token1),
    ).to.be.gt(parseEther("100"));
  });
}
