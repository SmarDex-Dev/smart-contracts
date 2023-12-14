import { expect } from "chai";
import { BigNumber, constants } from "ethers";
import { hexConcat, parseEther } from "ethers/lib/utils";
import { AutoSwapper, ERC20Test, SmardexPair, SmardexPair__factory, SmardexRouter } from "../../../typechain";
import { getSwapEncodedData } from "../../utils";
import { deployERC20Test } from "../../deployers";
import { deployPool } from "../utils";

async function addLiquidity(
  token0Amount: BigNumber,
  token1Amount: BigNumber,
  token0: ERC20Test,
  token1: ERC20Test,
  router: SmardexRouter,
  adminAddress: string,
) {
  await router.addLiquidity(
    {
      tokenA: token0.address,
      tokenB: token1.address,
      amountADesired: token0Amount,
      amountBDesired: token1Amount,
      amountAMin: 1,
      amountBMin: 1,
      fictiveReserveB: 0,
      fictiveReserveAMin: 0,
      fictiveReserveAMax: 0,
    },
    adminAddress,
    constants.MaxUint256,
  );
}

async function swapBothTokens(
  router: SmardexRouter,
  amountIn: BigNumber,
  token0: ERC20Test,
  token1: ERC20Test,
  adminAddress: string,
) {
  await router.swapExactTokensForTokens(
    amountIn,
    1,
    [token1.address, token0.address],
    adminAddress,
    constants.MaxUint256,
  );
  await router.swapTokensForExactTokens(
    amountIn,
    constants.MaxUint256,
    [token0.address, token1.address],
    adminAddress,
    constants.MaxUint256,
  );
}

export function shouldBehaveLikeAutoSwapper() {
  describe("Auto Swapper ", function () {
    const SDEXAmount = parseEther("10");
    const TOKEN1Amount = parseEther("10");
    const TenTokens = parseEther("10");
    const amountIn = parseEther("1");

    // create a pair & add liquidity : SDEX/Token1
    beforeEach(async function () {
      await this.contracts.smardexToken.approve(this.contracts.smardexRouter.address, constants.MaxUint256);
      await this.contracts.token1.approve(this.contracts.smardexRouter.address, constants.MaxUint256);
      await addLiquidity(
        TenTokens,
        TenTokens,
        this.contracts.token0,
        this.contracts.token1,
        this.contracts.smardexRouter,
        this.signers.admin.address,
      );
      await this.contracts.smardexFactory.setFeeTo(this.contracts.autoSwapper.address);
    });

    context("When autoSwapper contract is feeTo destination in Smardex Factory", function () {
      context("when user tries to execute manually", function () {
        it("Check addresses ", async function () {
          expect(await this.contracts.smardexFactory.feeTo()).to.eq(this.contracts.autoSwapper.address);
          // staking address is factory contract as we did not deploy a staking contract for unit tests
          try {
            const stakingAddress = await (this.contracts.autoSwapper as AutoSwapper).stakingAddress();
            expect(stakingAddress).to.eq(this.misc.targetAddress);
          } catch (e) {
            // do nothing
          }
          expect(await this.contracts.autoSwapper.smardexToken()).to.eq(this.contracts.smardexToken.address);
          expect(this.contracts.smardexToken.address).to.eq(this.contracts.token0.address);
        });
        it("should not fail with manual transferred tokens to contract", async function () {
          await this.contracts.token1.transfer(this.contracts.autoSwapper.address, parseEther("1"));
          await this.contracts.token0.transfer(this.contracts.autoSwapper.address, parseEther("1"));
          const balance = await this.contracts.token0.balanceOf(this.contracts.autoSwapper.address);
          expect(balance).to.eq(parseEther("1"));
          await expect(
            this.contracts.autoSwapper.executeWork(this.contracts.token0.address, this.contracts.token1.address),
          ).to.not.be.reverted;
          expect(await this.contracts.token0.balanceOf(this.misc.targetAddress)).to.eq(parseEther("1"));
          expect(await this.contracts.token1.balanceOf(this.contracts.autoSwapper.address)).to.eq(parseEther("1"));
          expect(await this.contracts.token0.balanceOf(this.contracts.autoSwapper.address)).to.eq(0);
        });
        it("should fail when calling smardexSwapCallback without param ", async function () {
          await expect(this.contracts.autoSwapper.smardexSwapCallback(0, 0, constants.HashZero)).to.revertedWith(
            "SmardexRouter: Callback Invalid amount",
          );
        });
        it("should fail when calling smardexSwapCallback from an account instead of pair ", async function () {
          await expect(
            this.contracts.autoSwapper.smardexSwapCallback(
              1000,
              1000,
              getSwapEncodedData(
                this.signers.admin.address,
                hexConcat([this.contracts.token0.address, this.contracts.token1.address]),
              ),
            ),
          ).to.revertedWith("SmarDexRouter: INVALID_PAIR");
        });
      });
      context("with SDEX in pair's Tokens", function () {
        it("should executeWork on autoSwapper and swap all tokens on his own pair", async function () {
          const balanceBefore = await this.contracts.smardexToken.balanceOf(this.misc.targetAddress);
          await swapBothTokens(
            this.contracts.smardexRouter,
            amountIn,
            this.contracts.token0,
            this.contracts.token1,
            this.signers.admin.address,
          );
          const [fee0, fee1] = await (this.contracts.smardexPair as SmardexPair).getFeeToAmounts();
          expect(fee0).to.not.eq(0);
          expect(fee1).to.not.eq(0);

          const lp = await this.contracts.smardexPair.balanceOf(this.signers.admin.address);
          await this.contracts.smardexPair.approve(this.contracts.smardexRouter.address, lp);
          // burn for _mintFee but only half lp or we wont be able to swap in the pool to get SDEX
          await this.contracts.smardexRouter.removeLiquidity(
            this.contracts.token0.address,
            this.contracts.token1.address,
            lp.div(2),
            1,
            1,
            this.signers.admin.address,
            constants.MaxUint256,
          );

          // We can not check for feeToAmount after burn or mint because we swapped in pair so feeToAmount increased again
          const [fee0After, fee1After] = await (this.contracts.smardexPair as SmardexPair).getFeeToAmounts();
          expect(fee0After).to.eq(0);
          expect(fee1After).to.not.eq(0);

          const lpAfter = await this.contracts.smardexPair.balanceOf(this.signers.admin.address);
          expect(lp.sub(lpAfter)).to.eq(lp.div(2));
          // if autoSwapper balance is != 0 then swap failed
          expect(await this.contracts.token1.balanceOf(this.contracts.autoSwapper.address)).to.eq(0);
          const balanceAfter = await this.contracts.smardexToken.balanceOf(this.misc.targetAddress);

          expect(balanceAfter).to.not.eq(balanceBefore);
        });

        it("multiple add/remove liquidity with already created pair", async function () {
          for (let i = 0; i < 3; i++) {
            await expect(
              swapBothTokens(
                this.contracts.smardexRouter,
                amountIn,
                this.contracts.token0,
                this.contracts.token1,
                this.signers.admin.address,
              ),
            ).to.not.be.reverted;

            const lp = await this.contracts.smardexPair.balanceOf(this.signers.admin.address);
            await this.contracts.smardexPair.approve(this.contracts.smardexRouter.address, lp);
            await this.contracts.smardexRouter.removeLiquidity(
              this.contracts.token0.address,
              this.contracts.token1.address,
              lp.div(5),
              1,
              1,
              this.signers.admin.address,
              constants.MaxUint256,
            );

            await swapBothTokens(
              this.contracts.smardexRouter,
              amountIn,
              this.contracts.token0,
              this.contracts.token1,
              this.signers.admin.address,
            );

            await expect(
              this.contracts.smardexRouter.addLiquidity(
                {
                  tokenA: this.contracts.token0.address,
                  tokenB: this.contracts.token1.address,
                  amountADesired: SDEXAmount.div(10),
                  amountBDesired: TOKEN1Amount.div(10),
                  amountAMin: 1,
                  amountBMin: 1,
                  fictiveReserveB: 0,
                  fictiveReserveAMin: 0,
                  fictiveReserveAMax: 0,
                },
                this.signers.admin.address,
                constants.MaxUint256,
              ),
            ).to.not.be.reverted;
          }
          const [fee0, fee1] = await (this.contracts.smardexPair as SmardexPair).getFeeToAmounts();
          expect(fee0).to.eq(0);
          expect(fee1).to.not.eq(0);
        });
      });
      context("with NO SDEX in pair's Tokens", function () {
        it("should fail (but not revert) because there are no pair corresponding with SDEX", async function () {
          await this.contracts.WETHPartner.approve(this.contracts.smardexRouter.address, parseEther("10000"));
          await this.contracts.smardexRouter.addLiquidity(
            {
              tokenA: this.contracts.WETHPartner.address,
              tokenB: this.contracts.token1.address,
              amountADesired: TenTokens,
              amountBDesired: TenTokens,
              amountAMin: 1,
              amountBMin: 1,
              fictiveReserveB: 0,
              fictiveReserveAMin: 0,
              fictiveReserveAMax: 0,
            },
            this.signers.admin.address,
            constants.MaxUint256,
          );

          const addressT1WETHP = await this.contracts.smardexFactory.getPair(
            this.contracts.token1.address,
            this.contracts.WETHPartner.address,
          );
          const pairT1WETHP = SmardexPair__factory.connect(addressT1WETHP, this.signers.admin);
          await pairT1WETHP.approve(this.contracts.smardexRouter.address, constants.MaxUint256);

          const balanceBefore = await this.contracts.smardexToken.balanceOf(this.misc.targetAddress);

          await this.contracts.smardexRouter.swapExactTokensForTokens(
            amountIn.div(2),
            0,
            [this.contracts.WETHPartner.address, this.contracts.token1.address],
            this.signers.admin.address,
            constants.MaxUint256,
          );
          const t0isWethP = (await pairT1WETHP.token0()) === this.contracts.WETHPartner.address;
          let [fee0, fee1] = await pairT1WETHP.getFeeToAmounts();
          let fees = t0isWethP ? fee0 : fee1;
          // We swapped one way only so we should have only fee0
          expect(fees).to.not.eq(0);

          const lp = await pairT1WETHP.balanceOf(this.signers.admin.address);
          await pairT1WETHP.approve(this.contracts.smardexRouter.address, lp);
          // burn for _mintFee but only half lp or we wont be able to swap in the pool to get SDEX
          await this.contracts.smardexRouter.removeLiquidity(
            this.contracts.token1.address,
            this.contracts.WETHPartner.address,
            lp.div(2),
            1,
            1,
            this.signers.admin.address,
            constants.MaxUint256,
          );

          [fee0, fee1] = await pairT1WETHP.getFeeToAmounts();
          fees = t0isWethP ? fee0 : fee1;
          expect(fees).to.eq(0);

          const addressWethpSdex = await this.contracts.smardexFactory.getPair(
            this.contracts.WETHPartner.address,
            this.contracts.smardexToken.address,
          );
          expect(addressWethpSdex).to.eq(constants.AddressZero);

          const lpAfter = await pairT1WETHP.balanceOf(this.signers.admin.address);
          expect(lp.sub(lpAfter)).to.eq(lp.div(2));
          // if autoSwapper balance is != 0 then swap failed, and it should have because we dont have a pair corresponding
          expect(await this.contracts.WETHPartner.balanceOf(this.contracts.autoSwapper.address)).to.not.eq(0);
          const balanceAfter = await this.contracts.smardexToken.balanceOf(this.misc.targetAddress);

          expect(balanceAfter).to.eq(balanceBefore);
        });
        it("should executeWork on autoSwapper and swap all tokens on another pair", async function () {
          await this.contracts.WETHPartner.approve(this.contracts.smardexRouter.address, parseEther("10000"));
          await this.contracts.token1.approve(this.contracts.smardexRouter.address, parseEther("10000"));
          await this.contracts.smardexToken.approve(this.contracts.smardexRouter.address, parseEther("10000"));
          // we already have a pair & liquidity : SDEX/Token1

          // We now need to complementary pairs : TokenX / Token1 & TokenX / SDEX,
          // and mint or burn after a swap on  TokenX / Token1 to use other SDEX pairs to swap fees
          await this.contracts.smardexRouter.addLiquidity(
            {
              tokenA: this.contracts.WETHPartner.address,
              tokenB: this.contracts.token1.address,
              amountADesired: TenTokens,
              amountBDesired: TenTokens,
              amountAMin: 1,
              amountBMin: 1,
              fictiveReserveB: 0,
              fictiveReserveAMin: 0,
              fictiveReserveAMax: 0,
            },
            this.signers.admin.address,
            constants.MaxUint256,
          );

          await this.contracts.smardexRouter.addLiquidity(
            {
              tokenA: this.contracts.WETHPartner.address,
              tokenB: this.contracts.smardexToken.address,
              amountADesired: TenTokens,
              amountBDesired: TenTokens,
              amountAMin: 1,
              amountBMin: 1,
              fictiveReserveB: 0,
              fictiveReserveAMin: 0,
              fictiveReserveAMax: 0,
            },
            this.signers.admin.address,
            constants.MaxUint256,
          );

          const balanceBefore = await this.contracts.smardexToken.balanceOf(this.misc.targetAddress);

          await this.contracts.smardexRouter.swapExactTokensForTokens(
            amountIn,
            0,
            [this.contracts.token1.address, this.contracts.WETHPartner.address],
            this.signers.admin.address,
            constants.MaxUint256,
          );
          await this.contracts.smardexRouter.swapExactTokensForTokens(
            amountIn,
            0,
            [this.contracts.WETHPartner.address, this.contracts.token1.address],
            this.signers.admin.address,
            constants.MaxUint256,
          );

          const addressT1WETHP = await this.contracts.smardexFactory.getPair(
            this.contracts.token1.address,
            this.contracts.WETHPartner.address,
          );
          const pairT1WETHP = SmardexPair__factory.connect(addressT1WETHP, this.signers.admin);
          await pairT1WETHP.approve(this.contracts.smardexRouter.address, constants.MaxUint256);

          const addressSdexWethp = await this.contracts.smardexFactory.getPair(
            this.contracts.WETHPartner.address,
            this.contracts.smardexToken.address,
          );
          const pairSdexWethp = SmardexPair__factory.connect(addressSdexWethp, this.signers.admin);
          await pairSdexWethp.approve(this.contracts.smardexRouter.address, constants.MaxUint256);

          const lp = await pairT1WETHP.balanceOf(this.signers.admin.address);
          // burn for _mintFee, all lp as we dont need this pair get SDEX
          // We should get all tokens swapped (token1, WETHPartner) to SDEX
          await this.contracts.smardexRouter.removeLiquidity(
            this.contracts.WETHPartner.address,
            this.contracts.token1.address,
            lp,
            1,
            1,
            this.signers.admin.address,
            constants.MaxUint256,
          );

          const lpAfter = await pairT1WETHP.balanceOf(this.signers.admin.address);
          expect(lpAfter).to.eq(0);
          // if autoSwapper balance is != 0 then swap failed
          expect(await this.contracts.WETHPartner.balanceOf(this.contracts.autoSwapper.address)).to.eq(0);
          expect(await this.contracts.token1.balanceOf(this.contracts.autoSwapper.address)).to.eq(0);
          const balanceAfter = await this.contracts.smardexToken.balanceOf(this.misc.targetAddress);
          expect(balanceAfter).to.not.eq(balanceBefore);
        });
        it("should executeWork on autoSwapper and swap all tokens on another pair with price < 0", async function () {
          await this.contracts.WETHPartner.approve(this.contracts.smardexRouter.address, parseEther("10000"));
          await this.contracts.token1.approve(this.contracts.smardexRouter.address, parseEther("10000"));
          await this.contracts.smardexToken.approve(this.contracts.smardexRouter.address, parseEther("10000"));
          // we already have a pair & liquidity : SDEX/Token1

          // We now need to complementary pairs : TokenX / Token1 & TokenX / SDEX,
          // and mint or burn after a swap on  TokenX / Token1 to use other SDEX pairs to swap fees
          await this.contracts.smardexRouter.addLiquidity(
            {
              tokenA: this.contracts.WETHPartner.address,
              tokenB: this.contracts.token1.address,
              amountADesired: TenTokens,
              amountBDesired: TenTokens,
              amountAMin: 1,
              amountBMin: 1,
              fictiveReserveB: 0,
              fictiveReserveAMin: 0,
              fictiveReserveAMax: 0,
            },
            this.signers.admin.address,
            constants.MaxUint256,
          );

          await this.contracts.smardexRouter.addLiquidity(
            {
              tokenA: this.contracts.WETHPartner.address,
              tokenB: this.contracts.smardexToken.address,
              amountADesired: parseEther("1"),
              amountBDesired: TenTokens,
              amountAMin: 1,
              amountBMin: 1,
              fictiveReserveB: 0,
              fictiveReserveAMin: 0,
              fictiveReserveAMax: 0,
            },
            this.signers.admin.address,
            constants.MaxUint256,
          );

          const balanceBefore = await this.contracts.smardexToken.balanceOf(this.misc.targetAddress);

          await this.contracts.smardexRouter.swapExactTokensForTokens(
            amountIn,
            0,
            [this.contracts.token1.address, this.contracts.WETHPartner.address],
            this.signers.admin.address,
            constants.MaxUint256,
          );
          await this.contracts.smardexRouter.swapExactTokensForTokens(
            amountIn,
            0,
            [this.contracts.WETHPartner.address, this.contracts.token1.address],
            this.signers.admin.address,
            constants.MaxUint256,
          );

          const addressT1WETHP = await this.contracts.smardexFactory.getPair(
            this.contracts.token1.address,
            this.contracts.WETHPartner.address,
          );
          const pairT1WETHP = SmardexPair__factory.connect(addressT1WETHP, this.signers.admin);
          await pairT1WETHP.approve(this.contracts.smardexRouter.address, constants.MaxUint256);

          const addressSdexWethp = await this.contracts.smardexFactory.getPair(
            this.contracts.WETHPartner.address,
            this.contracts.smardexToken.address,
          );
          const pairSdexWethp = SmardexPair__factory.connect(addressSdexWethp, this.signers.admin);
          await pairSdexWethp.approve(this.contracts.smardexRouter.address, constants.MaxUint256);

          const lp = await pairT1WETHP.balanceOf(this.signers.admin.address);
          // burn for _mintFee, all lp as we dont need this pair get SDEX
          // We should get all tokens swapped (token1, WETHPartner) to SDEX
          await this.contracts.smardexRouter.removeLiquidity(
            this.contracts.WETHPartner.address,
            this.contracts.token1.address,
            lp,
            1,
            1,
            this.signers.admin.address,
            constants.MaxUint256,
          );

          const lpAfter = await pairT1WETHP.balanceOf(this.signers.admin.address);
          expect(lpAfter).to.eq(0);
          // if autoSwapper balance is != 0 then swap failed
          expect(await this.contracts.WETHPartner.balanceOf(this.contracts.autoSwapper.address)).to.eq(0);
          expect(await this.contracts.token1.balanceOf(this.contracts.autoSwapper.address)).to.eq(0);
          const balanceAfter = await this.contracts.smardexToken.balanceOf(this.misc.targetAddress);
          expect(balanceAfter).to.not.eq(balanceBefore);
        });
        it("should fail because attacker tried to manipulate price", async function () {
          await this.contracts.WETHPartner.approve(this.contracts.smardexRouter.address, parseEther("10000"));
          await this.contracts.token1.approve(this.contracts.smardexRouter.address, parseEther("10000"));
          await this.contracts.smardexToken.approve(this.contracts.smardexRouter.address, parseEther("10000"));
          await this.contracts.WETHPartner.transfer(this.signers.user.address, parseEther("10000"));
          await this.contracts.token1.transfer(this.signers.user.address, parseEther("10000"));
          await this.contracts.smardexToken.transfer(this.signers.user.address, parseEther("10000"));
          await this.contracts.WETHPartner.connect(this.signers.user).approve(
            this.contracts.smardexRouter.address,
            parseEther("10000"),
          );
          await this.contracts.token1
            .connect(this.signers.user)
            .approve(this.contracts.smardexRouter.address, parseEther("10000"));
          await this.contracts.smardexToken
            .connect(this.signers.user)
            .approve(this.contracts.smardexRouter.address, parseEther("10000"));
          // we already have a pair & liquidity : SDEX/Token1

          // We now need to complementary pairs : TokenX / Token1 & TokenX / SDEX,
          // and mint or burn after a swap on  TokenX / Token1 to use other SDEX pairs to swap fees
          await this.contracts.smardexRouter.addLiquidity(
            {
              tokenA: this.contracts.WETHPartner.address,
              tokenB: this.contracts.token1.address,
              amountADesired: TenTokens,
              amountBDesired: TenTokens,
              amountAMin: 1,
              amountBMin: 1,
              fictiveReserveB: 0,
              fictiveReserveAMin: 0,
              fictiveReserveAMax: 0,
            },
            this.signers.admin.address,
            constants.MaxUint256,
          );

          await this.contracts.smardexRouter.addLiquidity(
            {
              tokenA: this.contracts.WETHPartner.address,
              tokenB: this.contracts.smardexToken.address,
              amountADesired: TenTokens,
              amountBDesired: TenTokens,
              amountAMin: 1,
              amountBMin: 1,
              fictiveReserveB: 0,
              fictiveReserveAMin: 0,
              fictiveReserveAMax: 0,
            },
            this.signers.admin.address,
            constants.MaxUint256,
          );

          await this.contracts.smardexRouter.swapExactTokensForTokens(
            amountIn,
            0,
            [this.contracts.token1.address, this.contracts.WETHPartner.address],
            this.signers.admin.address,
            constants.MaxUint256,
          );
          await this.contracts.smardexRouter.swapExactTokensForTokens(
            amountIn,
            0,
            [this.contracts.WETHPartner.address, this.contracts.token1.address],
            this.signers.admin.address,
            constants.MaxUint256,
          );

          /**
           * ATTACK swap token1 for SDEX and WETHPartner for SDEX
           */
          await this.contracts.smardexRouter
            .connect(this.signers.user)
            .swapExactTokensForTokens(
              amountIn.mul(100),
              0,
              [this.contracts.token1.address, this.contracts.smardexToken.address],
              this.signers.admin.address,
              constants.MaxUint256,
            );

          await this.contracts.smardexRouter
            .connect(this.signers.user)
            .swapExactTokensForTokens(
              amountIn.mul(100),
              0,
              [this.contracts.WETHPartner.address, this.contracts.smardexToken.address],
              this.signers.admin.address,
              constants.MaxUint256,
            );

          const addressT1WETHP = await this.contracts.smardexFactory.getPair(
            this.contracts.token1.address,
            this.contracts.WETHPartner.address,
          );
          const pairT1WETHP = SmardexPair__factory.connect(addressT1WETHP, this.signers.admin);
          await pairT1WETHP.approve(this.contracts.smardexRouter.address, constants.MaxUint256);

          const addressSdexWethp = await this.contracts.smardexFactory.getPair(
            this.contracts.WETHPartner.address,
            this.contracts.smardexToken.address,
          );
          const pairSdexWethp = SmardexPair__factory.connect(addressSdexWethp, this.signers.admin);
          await pairSdexWethp.approve(this.contracts.smardexRouter.address, constants.MaxUint256);

          const lp = await pairT1WETHP.balanceOf(this.signers.admin.address);
          const balanceBefore = await this.contracts.smardexToken.balanceOf(this.misc.targetAddress);

          // burn for _mintFee, all lp as we dont need this pair get SDEX
          // We should get NO token swapped (token1, WETHPartner) to SDEX because of induced slippage from attack
          await this.contracts.smardexRouter.removeLiquidity(
            this.contracts.WETHPartner.address,
            this.contracts.token1.address,
            lp,
            1,
            1,
            this.signers.admin.address,
            constants.MaxUint256,
          );

          const lpAfter = await pairT1WETHP.balanceOf(this.signers.admin.address);
          expect(lpAfter).to.eq(0);
          // if autoSwapper balance is != 0 then swap failed, and we want it to because of attack
          expect(await this.contracts.WETHPartner.balanceOf(this.contracts.autoSwapper.address)).to.not.eq(0);
          expect(await this.contracts.token1.balanceOf(this.contracts.autoSwapper.address)).to.not.eq(0);
          const balanceAfter = await this.contracts.smardexToken.balanceOf(this.misc.targetAddress);

          expect(balanceAfter).to.eq(balanceBefore);
        });
      });
      context("when manually swapping with path", function () {
        it("should fail if not owner", async function () {
          await expect(
            this.contracts.autoSwapper.connect(this.signers.user).swapTokenWithPath("1", "1", [], "0"),
          ).to.revertedWith("Ownable: caller is not the owner");
        });

        it("should fail if last token in path isn't SDEX", async function () {
          const token1Addr = this.contracts.token1.address;
          const SDEXAddr = this.contracts.smardexToken.address;
          await expect(
            this.contracts.autoSwapper.swapTokenWithPath(
              "1",
              "1",
              [token1Addr, SDEXAddr, token1Addr],
              constants.MaxUint256,
            ),
          ).to.revertedWith("AutoSwapper: INVALID_LAST_TOKEN");
        });

        it("should fail if path < 2", async function () {
          await expect(
            this.contracts.autoSwapper.swapTokenWithPath("1", "1", [], constants.MaxUint256),
          ).to.revertedWith("AutoSwapper: INVALID_PATH");

          await expect(
            this.contracts.autoSwapper.swapTokenWithPath("1", "1", [this.contracts.WETH.address], constants.MaxUint256),
          ).to.revertedWith("AutoSwapper: INVALID_PATH");
        });

        it("should fail if amount > balance", async function () {
          await expect(
            this.contracts.autoSwapper.swapTokenWithPath(
              "1",
              "1",
              [this.contracts.token1.address, this.contracts.smardexToken.address],
              constants.MaxUint256,
            ),
          ).to.revertedWith("AutoSwapper: INVALID_AMOUNT");
        });

        it("should swap balance and send to stakingPool/burn with simple path", async function () {
          const token1 = this.contracts.token1;
          const SDEXToken = this.contracts.smardexToken;
          await token1.transfer(this.contracts.autoSwapper.address, parseEther("1"));
          const balSDEXStakingBefore = await SDEXToken.balanceOf(this.misc.targetAddress);

          await this.contracts.autoSwapper.swapTokenWithPath(
            "0",
            "1",
            [token1.address, SDEXToken.address],
            constants.MaxUint256,
          );

          const balToken1SwapperAfter = await token1.balanceOf(this.contracts.autoSwapper.address);
          const balSDEXStakingAfter = await SDEXToken.balanceOf(this.misc.targetAddress);

          expect(balToken1SwapperAfter).to.eq(0);
          expect(balSDEXStakingAfter).to.be.gt(balSDEXStakingBefore);
        });

        it("should swap amount and send to stakingPool/burn with simple path", async function () {
          const token1 = this.contracts.token1;
          const SDEXToken = this.contracts.smardexToken;
          await token1.transfer(this.contracts.autoSwapper.address, parseEther("1"));
          const balSDEXStakingBefore = await SDEXToken.balanceOf(this.misc.targetAddress);

          await this.contracts.autoSwapper.swapTokenWithPath(
            "1000",
            "1",
            [token1.address, SDEXToken.address],
            constants.MaxUint256,
          );

          const balToken1SwapperAfter = await token1.balanceOf(this.contracts.autoSwapper.address);
          const balSDEXStakingAfter = await SDEXToken.balanceOf(this.misc.targetAddress);

          expect(balToken1SwapperAfter).to.eq(parseEther("1").sub(1000));
          expect(balSDEXStakingAfter).to.be.gt(balSDEXStakingBefore);
        });

        it("should swap and send to stakingPool/burn with complex path", async function () {
          const token1 = this.contracts.token1;
          const router = this.contracts.smardexRouter;
          const SDEXToken = this.contracts.smardexToken;
          const autoSwapper = this.contracts.autoSwapper;
          const token2 = await deployERC20Test(constants.MaxUint256);
          const token3 = await deployERC20Test(constants.MaxUint256);
          await deployPool(token1, parseEther("4242"), token2, parseEther("5000"), router);
          await deployPool(token2, parseEther("2121"), token3, parseEther("50000"), router);
          await deployPool(token3, parseEther("66666"), SDEXToken, parseEther("99999"), router);

          await token1.transfer(autoSwapper.address, parseEther("1"));

          const balToken1SwapperBefore = await token1.balanceOf(autoSwapper.address);
          const balSDEXStakingBefore = await SDEXToken.balanceOf(this.misc.targetAddress);

          await autoSwapper.swapTokenWithPath(
            balToken1SwapperBefore,
            "1",
            [token1.address, token2.address, token3.address, SDEXToken.address],
            constants.MaxUint256,
          );
          const balToken1SwapperAfter = await token1.balanceOf(autoSwapper.address);
          const balSDEXStakingAfter = await SDEXToken.balanceOf(this.misc.targetAddress);

          expect(balToken1SwapperAfter).to.eq(0);
          expect(balSDEXStakingAfter).to.be.gt(balSDEXStakingBefore);
        });
      });
    });
  });
}
