import { BigNumber } from "ethers";
import { ERC20, SmardexRouter } from "../../typechain";
import { ethers } from "hardhat";
import { latest } from "../helpers/time";

export async function deployPool(
  token0: ERC20,
  amount0: BigNumber,
  token1: ERC20,
  amount1: BigNumber,
  smardexRouter: SmardexRouter,
) {
  const [admin] = await ethers.getSigners();

  await token0.approve(smardexRouter.address, amount0.toString());
  await token1.approve(smardexRouter.address, amount1.toString());

  const now = await latest();

  await smardexRouter.addLiquidity(
    {
      tokenA: token0.address,
      tokenB: token1.address,
      amountADesired: amount0,
      amountBDesired: amount1,
      amountAMin: 0,
      amountBMin: 0,
      fictiveReserveB: 0,
      fictiveReserveAMin: 0,
      fictiveReserveAMax: 0,
    },
    admin.address,
    now.add(10000),
  );
}
