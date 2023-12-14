import { constants } from "ethers/lib/ethers";
import { formatEther, parseEther, parseUnits } from "ethers/lib/utils";
import { BigNumber } from "ethers";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { Contracts } from "../../types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { unitFixtureSmardexRouter, unitFixtureTokensAndPairWithFactory } from "../../fixtures";
import hre from "hardhat";
import { ERC20Test, SmardexPair, SmardexPair__factory, SmardexRouter } from "../../../typechain";
import { deployDoubleSwapRouter } from "../../deployers";
import { increase } from "../../helpers/time";

const LOGGING = false;

const debug_log = (msg: string) => {
  if (LOGGING) console.log(msg);
};

async function make_a_trade(
  amount0: BigNumber,
  signer: SignerWithAddress,
  contracts: Contracts | { smardexRouter: SmardexRouter; token0: ERC20Test; token1: ERC20Test },
  autoMine = true,
) {
  const activatedAutomine = await hre.network.provider.request({ method: "hardhat_getAutomine" });

  if (!autoMine && activatedAutomine) await hre.network.provider.send("evm_setAutomine", [false]);
  if (autoMine) await time.increase(12);
  let receipt: any;
  if (amount0.lt(0)) {
    // user buy token0
    receipt = await contracts.smardexRouter.connect(signer).swapExactTokensForTokens(
      amount0.abs(),
      1,
      [contracts.token0.address, contracts.token1.address], // ETH -> USDT, we buy USDT
      signer.address,
      constants.MaxUint256,
    );
  } else {
    receipt = await contracts.smardexRouter.connect(signer).swapTokensForExactTokens(
      amount0.abs(),
      constants.MaxUint256,
      [contracts.token1.address, contracts.token0.address], // USDT -> ETH, we buy ETH
      signer.address,
      constants.MaxUint256,
    );
  }
  if (autoMine && !activatedAutomine) {
    await hre.network.provider.send("evm_setAutomine", [true]);
    await hre.network.provider.send("evm_mine");
  }
  return receipt;
}

async function show_reserves(contracts: Contracts | { smardexPair: SmardexPair }) {
  if (!LOGGING) return;
  const reserves = await contracts.smardexPair.getReserves();
  const fictiveReserves = await contracts.smardexPair.getFictiveReserves();

  console.log(`reserve0 ${formatEther(reserves.reserve0_)}`);
  console.log(`reserve1 ${formatEther(reserves.reserve1_)}`);
  console.log(`fictiveReserve0 ${formatEther(fictiveReserves.fictiveReserve0_)}`);
  console.log(`fictiveReserve1 ${formatEther(fictiveReserves.fictiveReserve1_)}`);
  return { reserves, fictiveReserves };
}

export function checkBestTrade() {
  describe("Worst cases", function () {
    it("return the worst new K", async function () {
      const quantity0 = 55;
      const quantity1 = 220;
      const amountToken0 = parseEther(quantity0.toString());
      const amountToken1 = parseEther(quantity1.toString());
      let worstK = amountToken0.mul(amountToken1);
      let worstKTokenIn = 0;
      await this.contracts.smardexRouter.addLiquidity(
        {
          tokenA: this.contracts.token0.address,
          tokenB: this.contracts.token1.address,
          amountADesired: amountToken0,
          amountBDesired: amountToken1,
          amountAMin: amountToken0,
          amountBMin: amountToken1,
          fictiveReserveB: amountToken1,
          fictiveReserveAMin: amountToken0,
          fictiveReserveAMax: amountToken0,
        },
        this.signers.admin.address,
        constants.MaxUint256,
      );

      let pairToken0Balance = await this.contracts.token0.balanceOf(this.contracts.smardexPair.address);
      let pairToken1Balance = await this.contracts.token1.balanceOf(this.contracts.smardexPair.address);
      let fictiveReserves = await this.contracts.smardexPair.getFictiveReserves();

      //swap 1
      await this.contracts.token0.transfer(this.contracts.smardexPair.address, parseEther("5"));
      await this.contracts.smardexRouter.swapExactTokensForTokens(
        parseEther("5"),
        1,
        [this.contracts.token0.address, this.contracts.token1.address],
        this.signers.user.address,
        constants.MaxUint256,
      );

      pairToken0Balance = await this.contracts.token0.balanceOf(this.contracts.smardexPair.address);
      pairToken1Balance = await this.contracts.token1.balanceOf(this.contracts.smardexPair.address);
      fictiveReserves = await this.contracts.smardexPair.getFictiveReserves();

      await this.contracts.token1.transfer(this.contracts.smardexPair.address, parseEther("45"));
      await this.contracts.smardexRouter.swapExactTokensForTokens(
        parseEther("45"),
        1,
        [this.contracts.token1.address, this.contracts.token0.address],
        this.signers.user.address,
        constants.MaxUint256,
      );

      pairToken0Balance = await this.contracts.token0.balanceOf(this.contracts.smardexPair.address);
      pairToken1Balance = await this.contracts.token1.balanceOf(this.contracts.smardexPair.address);
      debug_log("Pair token 0 balance :" + formatEther(pairToken0Balance));
      debug_log("Pair token 1 balance :" + formatEther(pairToken1Balance));

      fictiveReserves = await this.contracts.smardexPair.getFictiveReserves();
      debug_log("Reserve fictive token 0 :" + formatEther(fictiveReserves.fictiveReserve0_));
      debug_log("Reserve fictive token 1 :" + formatEther(fictiveReserves.fictiveReserve1_));

      debug_log("Send Token0 ...");
      for (let i = 1; i <= quantity0; i++) {
        const newK = amountToken0.add(parseEther(i.toString())).mul(amountToken1.sub(1));
        if (newK.lt(worstK)) {
          worstK = newK;
          worstKTokenIn = i;
        }
      }
      debug_log("Worst K :" + worstK + " when sending " + worstKTokenIn + " token 0");

      for (let i = 1; i <= quantity1; i++) {
        const newK = amountToken1.add(parseEther(i.toString())).mul(amountToken0.sub(1));
        if (newK.lt(worstK)) {
          worstK = newK;
          worstKTokenIn = i;
        }
      }
      debug_log("Worst K :" + worstK + " when sending " + worstKTokenIn + " token 1");
    });
    it("swap loops in and out and check output values increasing for LPs", async function () {
      const loopSize = 20;
      await this.contracts.token0.transfer(this.signers.user.address, parseEther("1000000000"));
      await this.contracts.token1.transfer(this.signers.user.address, parseEther("1000000000"));
      const amountIn = parseEther("1");
      await this.contracts.token0.approve(this.contracts.smardexRouter.address, constants.MaxUint256);
      await this.contracts.token1.approve(this.contracts.smardexRouter.address, constants.MaxUint256);
      await this.contracts.smardexRouter.addLiquidity(
        {
          tokenA: this.contracts.token0.address,
          tokenB: this.contracts.token1.address,
          amountADesired: parseEther("15.1562258412964"),
          amountBDesired: parseEther("123377.063205187"),
          amountAMin: 1,
          amountBMin: 1,
          fictiveReserveB: 0,
          fictiveReserveAMin: 0,
          fictiveReserveAMax: 0,
        },
        this.signers.admin.address,
        constants.MaxUint256,
      );

      const initialToken0Balance = await this.contracts.token0.balanceOf(this.signers.user.address);
      const initialToken1Balance = await this.contracts.token1.balanceOf(this.signers.user.address);
      let token0Balance = await this.contracts.token0.balanceOf(this.signers.user.address);
      let token1Balance = await this.contracts.token1.balanceOf(this.signers.user.address);

      debug_log(
        "Initial USER DIFF Balances: " +
          JSON.stringify({
            token0Balance: formatEther(token0Balance.sub(initialToken0Balance)),
            token1Balance: formatEther(token1Balance.sub(initialToken1Balance)),
          }),
      );
      /**
       *  BUY SWAPS
       * ____________________________________________________
       */
      await this.contracts.smardexRouter.connect(this.signers.user).swapTokensForExactTokens(
        parseEther("5"),
        constants.MaxUint256,
        [this.contracts.token1.address, this.contracts.token0.address], //ETH -> USDT, we sell 1 ETH
        this.signers.user.address,
        constants.MaxUint256,
      );
      await this.contracts.smardexRouter.connect(this.signers.user).swapTokensForExactTokens(
        parseEther("0.00323964736677335"),
        constants.MaxUint256,
        [this.contracts.token1.address, this.contracts.token0.address], //ETH -> USDT, we sell 1 ETH
        this.signers.user.address,
        constants.MaxUint256,
      );
      await this.contracts.smardexRouter.connect(this.signers.user).swapTokensForExactTokens(
        parseEther("0.00323964736677335"),
        constants.MaxUint256,
        [this.contracts.token1.address, this.contracts.token0.address], //ETH -> USDT, we sell 1 ETH
        this.signers.user.address,
        constants.MaxUint256,
      );
      await this.contracts.smardexRouter.connect(this.signers.user).swapTokensForExactTokens(
        parseEther("0.00157883640548213"),
        constants.MaxUint256,
        [this.contracts.token1.address, this.contracts.token0.address], //ETH -> USDT, we sell 1 ETH
        this.signers.user.address,
        constants.MaxUint256,
      );

      /**
       *  SELL SWAPS
       * ____________________________________________________
       */
      await this.contracts.smardexRouter.connect(this.signers.user).swapExactTokensForTokens(
        parseEther("0.00162027178887663"), // we want amountOut, providing max tokens for it
        1,
        [this.contracts.token0.address, this.contracts.token1.address],
        this.signers.user.address,
        constants.MaxUint256,
      );
      await this.contracts.smardexRouter.connect(this.signers.user).swapExactTokensForTokens(
        parseEther("0.00210385305088939"), // we want amountOut, providing max tokens for it
        1,
        [this.contracts.token0.address, this.contracts.token1.address],
        this.signers.user.address,
        constants.MaxUint256,
      );
      await this.contracts.smardexRouter.connect(this.signers.user).swapExactTokensForTokens(
        parseEther("0.00861382416069739"), // we want amountOut, providing max tokens for it
        1,
        [this.contracts.token0.address, this.contracts.token1.address],
        this.signers.user.address,
        constants.MaxUint256,
      );

      // Buy Again
      await this.contracts.smardexRouter.connect(this.signers.user).swapTokensForExactTokens(
        parseEther("0.00175432807397786"),
        constants.MaxUint256,
        [this.contracts.token1.address, this.contracts.token0.address], //ETH -> USDT, we sell 1 ETH
        this.signers.user.address,
        constants.MaxUint256,
      );
      //I guess next one is for reserves Fictives to be updated
      await this.contracts.smardexRouter.connect(this.signers.user).swapTokensForExactTokens(
        parseEther("0.00175432807397786"),
        constants.MaxUint256,
        [this.contracts.token1.address, this.contracts.token0.address], //ETH -> USDT, we sell 1 ETH
        this.signers.user.address,
        constants.MaxUint256,
      );

      token0Balance = await this.contracts.token0.balanceOf(this.signers.user.address);
      token1Balance = await this.contracts.token1.balanceOf(this.signers.user.address);
      /**
       * BEGIN LOOPS
       * _____________________________________________________
       */
      for (let i = 0; i <= loopSize; i++) {
        // debug_log("\nLoop ------------ " + i);

        //swap 1
        await this.contracts.smardexRouter.connect(this.signers.user).swapExactTokensForTokens(
          amountIn,
          1,
          [this.contracts.token0.address, this.contracts.token1.address], //ETH -> USDT, we sell 1 ETH
          this.signers.user.address,
          constants.MaxUint256,
        );

        token0Balance = await this.contracts.token0.balanceOf(this.signers.user.address);
        token1Balance = await this.contracts.token1.balanceOf(this.signers.user.address);

        //swap 2
        await this.contracts.smardexRouter.connect(this.signers.user).swapTokensForExactTokens(
          amountIn, // we want amountOut 1ETH, providing max tokens for it
          constants.MaxUint256,
          [this.contracts.token1.address, this.contracts.token0.address],
          this.signers.user.address,
          constants.MaxUint256,
        );

        token0Balance = await this.contracts.token0.balanceOf(this.signers.user.address);
        token1Balance = await this.contracts.token1.balanceOf(this.signers.user.address);
      }
      //Send ETH he swapped in from user to see LP actualized
      await this.contracts.smardexRouter
        .connect(this.signers.user)
        .swapExactTokensForTokens(
          token0Balance.sub(initialToken0Balance),
          1,
          [this.contracts.token0.address, this.contracts.token1.address],
          this.signers.user.address,
          constants.MaxUint256,
        );
      token0Balance = await this.contracts.token0.balanceOf(this.signers.user.address);
      token1Balance = await this.contracts.token1.balanceOf(this.signers.user.address);
      expect(token0Balance).to.be.lte(initialToken0Balance);
      expect(token1Balance).to.be.lte(initialToken1Balance);
    });
  });
}

export function testExploit() {
  let bestGain = constants.Zero;
  before(async function () {
    const signers = await hre.ethers.getSigners();
    const { smardexRouter, factory } = await unitFixtureSmardexRouter();
    for (let indexSwap = 1; indexSwap < 50; indexSwap++) {
      const { token0, token1 } = await unitFixtureTokensAndPairWithFactory(factory);

      await token0.approve(smardexRouter.address, constants.MaxUint256);
      await token1.approve(smardexRouter.address, constants.MaxUint256);

      //Approve a 2 steps transfer to the contract (user)
      await token0.connect(signers[1]).approve(smardexRouter.address, constants.MaxUint256);
      await token1.connect(signers[1]).approve(smardexRouter.address, constants.MaxUint256);
      await token0.mint(signers[0].address, parseEther("100000000")); //ETH
      await token1.mint(signers[0].address, parseEther("100000000")); //USDT
      await token0.mint(signers[1].address, parseEther("100000000"));
      await token1.mint(signers[1].address, parseEther("100000000"));

      await smardexRouter.connect(signers[0]).addLiquidity(
        {
          tokenA: token0.address, // ETH
          tokenB: token1.address, // USDT
          amountADesired: parseEther("14.0790730962204"),
          amountBDesired: parseEther("115392.024049914"),
          amountAMin: 1,
          amountBMin: 1,
          fictiveReserveB: 0,
          fictiveReserveAMin: 0,
          fictiveReserveAMax: 0,
        },
        signers[0].address,
        constants.MaxUint256,
      );

      // make_trades
      const balance1_before = await token1.balanceOf(signers[1].address);
      const balance0_before = await token0.balanceOf(signers[1].address);

      await make_a_trade(parseEther("2"), signers[0], { smardexRouter, token0, token1 });
      await make_a_trade(parseEther("0.01"), signers[0], { smardexRouter, token0, token1 });

      let error = false;
      try {
        await make_a_trade(
          parseEther("-" + indexSwap.toString()),
          signers[1],
          { smardexRouter, token0, token1 },
          false, //avoid mining to have both swaps in same tx
        );
        await make_a_trade(parseEther(indexSwap.toString()), signers[1], { smardexRouter, token0, token1 });
      } catch (_error) {
        error = true;
      }

      const balance1_after = await token1.balanceOf(signers[1].address);
      const balance0_after = await token0.balanceOf(signers[1].address);

      if (balance1_after.sub(balance1_before).gt(bestGain) && !error && balance0_after.eq(balance0_before)) {
        bestGain = balance1_after.sub(balance1_before);
        debug_log(`user index: ${indexSwap.toString()}`);
        debug_log(`user gained: ${formatEther(balance1_after.sub(balance1_before))} USDT`);
      }
    }
  });

  it("Should check bestGain after loops", function () {
    expect(bestGain).to.be.lte(0);
  });
}

// TEST CASE 2
export function testNewSmardex() {
  let bestGain = constants.Zero;
  before(async function () {
    const signers = await hre.ethers.getSigners();
    const { smardexRouter, factory } = await unitFixtureSmardexRouter();
    const doubleSwapRouter = await deployDoubleSwapRouter();
    for (let indexSwap = 1; indexSwap < 50; indexSwap++) {
      const { token0, token1 } = await unitFixtureTokensAndPairWithFactory(factory);

      await token0.approve(smardexRouter.address, constants.MaxUint256);
      await token1.approve(smardexRouter.address, constants.MaxUint256);

      //Approve a 2 steps transfer to the contract (user)
      await token0.mint(signers[0].address, parseEther("1000000000")); //ETH
      await token1.mint(signers[0].address, parseEther("1000000000")); //USDT
      await token0.mint(signers[1].address, parseEther("1000000000"));
      await token1.mint(signers[1].address, parseEther("1000000000"));
      await token0.connect(signers[0]).approve(smardexRouter.address, constants.MaxUint256);
      await token1.connect(signers[0]).approve(smardexRouter.address, constants.MaxUint256);
      await token0.connect(signers[1]).approve(doubleSwapRouter.address, constants.MaxUint256);
      await token1.connect(signers[1]).approve(doubleSwapRouter.address, constants.MaxUint256);

      await smardexRouter.connect(signers[0]).addLiquidity(
        {
          tokenA: token0.address, // ETH
          tokenB: token1.address, // USDT
          amountADesired: parseEther("14.0790730962204"),
          amountBDesired: parseEther("115392.024049914"),
          amountAMin: 1,
          amountBMin: 1,
          fictiveReserveB: 0,
          fictiveReserveAMin: 0,
          fictiveReserveAMax: 0,
        },
        signers[0].address,
        constants.MaxUint256,
      );

      // make_trades
      const balance1_before = await token1.balanceOf(signers[1].address);
      const balance0_before = await token0.balanceOf(signers[1].address);

      let error = false;
      try {
        await make_a_trade(parseEther("0.1"), signers[0], { smardexRouter, token0, token1 });
        await make_a_trade(parseEther("2"), signers[0], { smardexRouter, token0, token1 });
        await make_a_trade(parseEther("-2.5"), signers[0], { smardexRouter, token0, token1 });
        await make_a_trade(parseEther("5"), signers[0], { smardexRouter, token0, token1 });

        await doubleSwapRouter
          .connect(signers[1])
          .doubleSwapExactOutExactIn(smardexRouter.address, indexSwap, parseEther("20000000"), [
            token1.address,
            token0.address,
          ]);
      } catch (_error) {
        error = true;
      }

      const balance1_after = await token1.balanceOf(signers[1].address);
      const balance0_after = await token0.balanceOf(signers[1].address);

      if (balance1_after.sub(balance1_before).gt(bestGain) && balance0_after.eq(balance0_before) && !error) {
        bestGain = balance1_after.sub(balance1_before);
        debug_log(`user index: ${indexSwap.toString()}`);
        debug_log(`user gained: ${formatEther(balance1_after.sub(balance1_before))} USDT`);
        debug_log(`user ETH Bal diff : ${formatEther(balance0_after.sub(balance0_before))} ETH`);
      }
    }
  });

  it("Should check bestGain after loops", function () {
    expect(bestGain).to.be.lte(0);
  });
}

// TEST CASE 3
export function testHack() {
  let bestGain = constants.Zero;
  before(async function () {
    const signers = await hre.ethers.getSigners();
    const { smardexRouter, factory } = await unitFixtureSmardexRouter();
    const doubleSwapRouter = await deployDoubleSwapRouter();
    for (let indexSwap = 1; indexSwap < 50; indexSwap++) {
      const { token0, token1 } = await unitFixtureTokensAndPairWithFactory(factory);

      //Approve a 2 steps transfer to the contract (user)
      await token0.mint(signers[0].address, parseEther("1000000000000")); //ETH
      await token1.mint(signers[0].address, parseEther("1000000000000")); //USDT
      await token0.mint(signers[1].address, parseEther("1000000000000000"));
      await token1.mint(signers[1].address, parseEther("1000000000000000"));
      await token0.connect(signers[0]).approve(smardexRouter.address, constants.MaxUint256);
      await token1.connect(signers[0]).approve(smardexRouter.address, constants.MaxUint256);
      await token0.connect(signers[1]).approve(doubleSwapRouter.address, constants.MaxUint256);
      await token1.connect(signers[1]).approve(doubleSwapRouter.address, constants.MaxUint256);

      await smardexRouter.connect(signers[0]).addLiquidity(
        {
          tokenA: token0.address, // ETH
          tokenB: token1.address, // USDT
          amountADesired: parseEther("14.0790730962204"),
          amountBDesired: parseEther("115392.024049914"),
          amountAMin: 1,
          amountBMin: 1,
          fictiveReserveB: 0,
          fictiveReserveAMin: 0,
          fictiveReserveAMax: 0,
        },
        signers[0].address,
        constants.MaxUint256,
      );

      // make_trades
      const balance1_before = await token1.balanceOf(signers[1].address);

      await make_a_trade(parseEther("0.1"), signers[0], { smardexRouter, token0, token1 });
      await make_a_trade(parseEther("2"), signers[0], { smardexRouter, token0, token1 });
      await make_a_trade(parseEther("-2.5"), signers[0], { smardexRouter, token0, token1 });
      await make_a_trade(parseEther("5"), signers[0], { smardexRouter, token0, token1 });

      let error = false;
      try {
        await doubleSwapRouter
          .connect(signers[1])
          .doubleSwapExactOutExactIn(smardexRouter.address, indexSwap, parseEther("20000000"), [
            token1.address,
            token0.address,
          ]);
      } catch (errorM: any) {
        debug_log("Error hack : " + errorM);
        error = true;
      }

      const balance1_after = await token1.balanceOf(signers[1].address);

      if (balance1_after.sub(balance1_before).gt(bestGain) && !error) {
        bestGain = balance1_after.sub(balance1_before);
        debug_log(`user index: ${indexSwap.toString()}`);
        debug_log(`user gained: ${formatEther(balance1_after.sub(balance1_before))} USDT`);
      }
    }
  });

  it("Should check bestGain after loops v3", function () {
    expect(bestGain).to.be.lte(0);
  });
}

// TEST CASE 4
export function testHack4() {
  let bestGain = constants.Zero;
  it("Should check bestGain after loops v4", async function () {
    const signers = await hre.ethers.getSigners();
    const { smardexRouter, factory } = await unitFixtureSmardexRouter();
    const { token0, token1 } = await unitFixtureTokensAndPairWithFactory(factory);
    const doubleSwapRouter = await deployDoubleSwapRouter();

    //Approve a 2 steps transfer to the contract (user)
    await token0.mint(signers[0].address, parseEther("100000000")); //ETH
    await token1.mint(signers[0].address, parseEther("200000000")); //USDT
    await token0.mint(signers[1].address, parseEther("100000"));
    await token1.mint(signers[1].address, parseEther("200000000"));
    await token0.connect(signers[0]).approve(smardexRouter.address, constants.MaxUint256);
    await token1.connect(signers[0]).approve(smardexRouter.address, constants.MaxUint256);
    await token0.connect(signers[1]).approve(doubleSwapRouter.address, constants.MaxUint256);
    await token1.connect(signers[1]).approve(doubleSwapRouter.address, constants.MaxUint256);

    await smardexRouter.connect(signers[0]).addLiquidity(
      {
        tokenA: token0.address, // ETH
        tokenB: token1.address, // USDT
        amountADesired: parseEther("14.0790730962204"),
        amountBDesired: parseEther("115392.024049914"),
        amountAMin: 1,
        amountBMin: 1,
        fictiveReserveB: 0,
        fictiveReserveAMin: 0,
        fictiveReserveAMax: 0,
      },
      signers[0].address,
      constants.MaxUint256,
    );

    const smardexPairContract = SmardexPair__factory.connect(
      await factory.getPair(token0.address, token1.address),
      signers[0],
    );

    debug_log("Add liquidity done, reserves : ");
    await show_reserves({
      smardexPair: smardexPairContract,
    });

    // make_trades
    const balance1_before = await token1.balanceOf(signers[1].address);
    const balance0_before = await token0.balanceOf(signers[1].address);
    const blockInit = (await hre.ethers.provider.getBlock("latest")).number;

    /** USER BALANCES */
    const balance1_user_before = await token1.balanceOf(signers[0].address);
    const balance0_user_before = await token0.balanceOf(signers[0].address);
    debug_log("\nUser balance 0 before : " + formatEther(balance0_user_before));
    debug_log("User balance 1 before : " + formatEther(balance1_user_before));
    await make_a_trade(parseEther("3"), signers[0], { smardexRouter, token0, token1 });
    const balance1_user_after = await token1.balanceOf(signers[0].address);
    const balance0_user_after = await token0.balanceOf(signers[0].address);
    debug_log("User balance 0 after : " + formatEther(balance0_user_after));
    debug_log("User balance 1 after : " + formatEther(balance1_user_after) + "\n");

    expect((await hre.ethers.provider.getBlock("latest")).number).to.be.gte(blockInit + 1);
    debug_log("After first swap, from user, reserves : ");
    await show_reserves({
      smardexPair: smardexPairContract,
    });

    await expect(
      doubleSwapRouter
        .connect(signers[1])
        .doubleSwapExactOutExactIn(smardexRouter.address, parseEther("4.1"), parseEther("20000000"), [
          token1.address,
          token0.address,
        ]),
    ).to.be.revertedWith("SmarDexLibrary: INSUFFICIENT_LIQUIDITY");
    await doubleSwapRouter
      .connect(signers[1])
      .doubleSwapExactOutExactIn(smardexRouter.address, parseEther("3.9"), parseEther("20000000"), [
        token1.address,
        token0.address,
      ]);
    const balance1_after = await token1.balanceOf(signers[1].address);
    const balance0_after = await token0.balanceOf(signers[1].address);
    debug_log("After third swap, from hacker, reserves : ");
    await show_reserves({
      smardexPair: smardexPairContract,
    });

    if (!balance0_after.eq(balance0_before))
      throw new Error("balance0_after !== balance0_before : " + balance0_after.sub(balance0_before).toString());

    if (balance1_after.sub(balance1_before).gt(bestGain)) {
      bestGain = balance1_after.sub(balance1_before);
    }
    debug_log(`user gained: ${formatEther(balance1_after.sub(balance1_before))} USDT`);
    expect(bestGain).to.be.lte(0);
  });
}

// TEST CASE 5
export function testLiqFrontrun() {
  it("Should not allow adding liquidity on unbalanced fictive reserves", async function () {
    const [attacker, victim] = await hre.ethers.getSigners();
    const { smardexRouter, factory } = await unitFixtureSmardexRouter();
    const { token0, token1 } = await unitFixtureTokensAndPairWithFactory(factory);

    await token0.mint(attacker.address, parseEther("1000000")); //DAI
    await token1.mint(attacker.address, parseEther("1000000")); //USDT
    await token0.mint(victim.address, parseEther("1000000")); //DAI
    await token1.mint(victim.address, parseEther("1000000")); //USDT
    await token0.connect(attacker).approve(smardexRouter.address, constants.MaxUint256);
    await token1.connect(attacker).approve(smardexRouter.address, constants.MaxUint256);
    await token0.connect(victim).approve(smardexRouter.address, constants.MaxUint256);
    await token1.connect(victim).approve(smardexRouter.address, constants.MaxUint256);

    await smardexRouter.connect(attacker).addLiquidity(
      {
        tokenA: token0.address,
        tokenB: token1.address,
        amountADesired: parseEther("1"),
        amountBDesired: 100,
        amountAMin: 0,
        amountBMin: 0,
        fictiveReserveB: 0,
        fictiveReserveAMin: 0,
        fictiveReserveAMax: 0,
      },
      attacker.address,
      constants.MaxUint256,
    );

    const smardexPairContract = SmardexPair__factory.connect(
      await factory.getPair(token0.address, token1.address),
      attacker,
    );

    debug_log("Attacker added liquidity, reserves : ");
    await show_reserves({
      smardexPair: smardexPairContract,
    });

    await smardexRouter
      .connect(attacker)
      .swapExactTokensForTokens(
        parseEther("0.5"),
        0,
        [token1.address, token0.address],
        attacker.address,
        constants.MaxUint256,
      );

    debug_log("Attacker swapped, reserves : ");
    await show_reserves({
      smardexPair: smardexPairContract,
    });

    // since reserves were at 0 when user submitted tx, he uses his own desired amounts for the price slippage
    await expect(
      smardexRouter.connect(victim).addLiquidity(
        {
          tokenA: token0.address,
          tokenB: token1.address,
          amountADesired: parseEther("1000000"),
          amountBDesired: parseEther("1000000"),
          amountAMin: parseEther("990000"), // slippage 1%
          amountBMin: parseEther("990000"),
          fictiveReserveB: parseEther("1000000"),
          fictiveReserveAMin: parseEther("990000"), // slippage 1%
          fictiveReserveAMax: parseEther("1010000"), // slippage 1%
        },
        victim.address,
        constants.MaxUint256,
      ),
    ).to.be.revertedWith("SmarDexRouter: PRICE_TOO_LOW"); // should revert thanks to fix

    // Re-establishing balanced fictive reserves
    await increase(BigNumber.from(300));
    await smardexRouter
      .connect(victim)
      .swapExactTokensForTokens(
        parseUnits("6.4", "gwei"),
        0,
        [token0.address, token1.address],
        victim.address,
        constants.MaxUint256,
      );
    debug_log("Waited 5 minutes then made a swap, reserves : ");
    await show_reserves({
      smardexPair: smardexPairContract,
    });
    await increase(BigNumber.from(300));
    await smardexRouter
      .connect(victim)
      .swapExactTokensForTokens(
        parseEther("0.0203"),
        0,
        [token1.address, token0.address],
        victim.address,
        constants.MaxUint256,
      );
    debug_log("Waited 5 minutes then made another swap, reserves : ");
    await show_reserves({
      smardexPair: smardexPairContract,
    });
    await expect(
      smardexRouter.connect(victim).addLiquidity(
        {
          tokenA: token0.address,
          tokenB: token1.address,
          amountADesired: parseEther("1000000"),
          amountBDesired: parseEther("1000000"),
          amountAMin: parseEther("990000"), // slippage 1%
          amountBMin: parseEther("990000"),
          fictiveReserveB: parseEther("1000000"),
          fictiveReserveAMin: parseEther("990000"), // slippage 1%
          fictiveReserveAMax: parseEther("1010000"), // slippage 1%
        },
        victim.address,
        constants.MaxUint256,
      ),
    ).to.not.be.reverted;
    debug_log("User deposited liquidity, reserves : ");
    await show_reserves({
      smardexPair: smardexPairContract,
    });

    await increase(BigNumber.from(300));
    await smardexRouter
      .connect(victim)
      .swapExactTokensForTokens(
        parseEther("0.1"),
        0,
        [token1.address, token0.address],
        victim.address,
        constants.MaxUint256,
      );
    debug_log("After 5 minutes, any swap will restore the reserves in a normal range : ");
    await show_reserves({
      smardexPair: smardexPairContract,
    });
  });
}
