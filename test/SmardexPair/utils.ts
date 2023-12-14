import { BigNumber, constants } from "ethers/lib/ethers";
import { Contracts } from "../types";
import { expect } from "chai";
import { ADDRESS_DEAD, MINIMUM_LIQUIDITY } from "../constants";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { parseEther } from "ethers/lib/utils";

export async function sendTokensToPair(contracts: Contracts, token0Amount: BigNumber, token1Amount: BigNumber) {
  await contracts.token0.transfer(contracts.smardexPair.address, token0Amount);
  await contracts.token1.transfer(contracts.smardexPair.address, token1Amount);
}

export async function addLiquidity(
  contracts: Contracts,
  admin: SignerWithAddress,
  token0Amount: BigNumber,
  token1Amount: BigNumber,
) {
  await contracts.smardexRouterTest.addLiquidity(
    {
      tokenA: contracts.token0.address,
      tokenB: contracts.token1.address,
      amountADesired: token0Amount,
      amountBDesired: token1Amount,
      amountAMin: 1,
      amountBMin: 1,
      fictiveReserveB: 0,
      fictiveReserveAMin: 0,
      fictiveReserveAMax: 0,
    },
    admin.address,
    constants.MaxUint256,
  );
}

export async function mintAndCheck(
  contracts: Contracts,
  admin: SignerWithAddress,
  token0Amount: BigNumber,
  token1Amount: BigNumber,
  expectedLiquidity: BigNumber,
) {
  const pricesAverage = await contracts.smardexPair.getPriceAverage();

  await expect(
    contracts.smardexRouterTest.mint(
      contracts.smardexPair.address,
      admin.address,
      token0Amount,
      token1Amount,
      admin.address,
    ),
  )
    .to.emit(contracts.smardexPair, "Transfer")
    .withArgs(constants.AddressZero, ADDRESS_DEAD, MINIMUM_LIQUIDITY)
    .to.emit(contracts.smardexPair, "Transfer")
    .withArgs(constants.AddressZero, admin.address, expectedLiquidity.sub(MINIMUM_LIQUIDITY))
    .to.emit(contracts.smardexPair, "Sync")
    .withArgs(
      token0Amount,
      token1Amount,
      token0Amount.div(2),
      token1Amount.div(2),
      pricesAverage.priceAverage0_,
      pricesAverage.priceAverage1_,
    )
    .to.emit(contracts.smardexPair, "Mint")
    .withArgs(contracts.smardexRouterTest.address, admin.address, token0Amount, token1Amount);

  expect(await contracts.smardexPair.totalSupply()).to.eq(expectedLiquidity);
  expect(await contracts.smardexPair.balanceOf(admin.address)).to.eq(expectedLiquidity.sub(MINIMUM_LIQUIDITY));
  expect(await contracts.token0.balanceOf(contracts.smardexPair.address)).to.eq(token0Amount);
  expect(await contracts.token1.balanceOf(contracts.smardexPair.address)).to.eq(token1Amount);
  const reserves = await contracts.smardexPair.getReserves();
  expect(reserves[0]).to.eq(token0Amount);
  expect(reserves[1]).to.eq(token1Amount);
  const reservesFictive = await contracts.smardexPair.getFictiveReserves();
  expect(reservesFictive[0]).to.eq(token0Amount.div(2));
  expect(reservesFictive[1]).to.eq(token1Amount.div(2));
}

export async function secondMintAndCheck(
  contracts: Contracts,
  admin: SignerWithAddress,
  firstMintToken0: BigNumber,
  firstMintToken1: BigNumber,
  firstMintLP: BigNumber,
  secondMintToken0: BigNumber,
  secondMintToken1: BigNumber,
  secondMintLP: BigNumber,
) {
  const pricesAverage = await contracts.smardexPair.getPriceAverage();
  await expect(
    contracts.smardexRouterTest.mint(
      contracts.smardexPair.address,
      admin.address,
      secondMintToken0,
      secondMintToken1,
      admin.address,
    ),
  )
    .to.emit(contracts.smardexPair, "Transfer")
    .withArgs(constants.AddressZero, admin.address, secondMintLP)
    .to.emit(contracts.smardexPair, "Sync")
    .withArgs(
      firstMintToken0.add(secondMintToken0),
      firstMintToken1.add(secondMintToken1),
      firstMintLP.add(secondMintLP).mul(firstMintToken0.div(2)).div(firstMintLP),
      firstMintLP.add(secondMintLP).mul(firstMintToken1.div(2)).div(firstMintLP),
      pricesAverage.priceAverage0_,
      pricesAverage.priceAverage1_,
    )
    .to.emit(contracts.smardexPair, "Mint")
    .withArgs(contracts.smardexRouterTest.address, admin.address, secondMintToken0, secondMintToken1);

  expect(await contracts.smardexPair.totalSupply()).to.eq(firstMintLP.add(secondMintLP));
  expect(await contracts.smardexPair.balanceOf(admin.address)).to.eq(
    firstMintLP.sub(MINIMUM_LIQUIDITY).add(secondMintLP),
  );
  expect(await contracts.token0.balanceOf(contracts.smardexPair.address)).to.eq(firstMintToken0.add(secondMintToken0));
  expect(await contracts.token1.balanceOf(contracts.smardexPair.address)).to.eq(firstMintToken1.add(secondMintToken1));
  const reserves = await contracts.smardexPair.getReserves();
  expect(reserves[0]).to.eq(firstMintToken0.add(secondMintToken0));
  expect(reserves[1]).to.eq(firstMintToken1.add(secondMintToken1));
  const reservesFictive = await contracts.smardexPair.getFictiveReserves();
  expect(reservesFictive[0]).to.eq(firstMintLP.add(secondMintLP).mul(firstMintToken0.div(2)).div(firstMintLP));
  expect(reservesFictive[1]).to.eq(firstMintLP.add(secondMintLP).mul(firstMintToken1.div(2)).div(firstMintLP));
}

export async function burnAndCheck(
  contracts: Contracts,
  admin: SignerWithAddress,
  lpToBurn: BigNumber,
  expectedToken0: BigNumber,
  expectedToken1: BigNumber,
) {
  const pricesAverage = await contracts.smardexPair.getPriceAverage();
  const lpAdminBalanceBefore = await contracts.smardexPair.balanceOf(admin.address);
  await contracts.smardexPair.transfer(contracts.smardexPair.address, lpToBurn);

  const lpSupplyBefore = await contracts.smardexPair.totalSupply();
  const balancePairToken0Before = await contracts.token0.balanceOf(contracts.smardexPair.address);
  const balancePairToken1Before = await contracts.token1.balanceOf(contracts.smardexPair.address);
  const balanceUserToken0Before = await contracts.token0.balanceOf(admin.address);
  const balanceUserToken1Before = await contracts.token1.balanceOf(admin.address);
  const reserveFic = await contracts.smardexPair.getFictiveReserves();
  await expect(contracts.smardexPair.burn(admin.address))
    .to.emit(contracts.smardexPair, "Transfer")
    .withArgs(contracts.smardexPair.address, constants.AddressZero, lpToBurn)
    .to.emit(contracts.token0, "Transfer")
    .withArgs(contracts.smardexPair.address, admin.address, expectedToken0)
    .to.emit(contracts.token1, "Transfer")
    .withArgs(contracts.smardexPair.address, admin.address, expectedToken1)
    .to.emit(contracts.smardexPair, "Sync")
    .withArgs(
      balancePairToken0Before.sub(expectedToken0),
      balancePairToken1Before.sub(expectedToken1),
      reserveFic.fictiveReserve0_.sub(lpToBurn.mul(reserveFic.fictiveReserve0_).div(lpSupplyBefore)),
      reserveFic.fictiveReserve0_.sub(lpToBurn.mul(reserveFic.fictiveReserve1_).div(lpSupplyBefore)),
      pricesAverage.priceAverage0_,
      pricesAverage.priceAverage1_,
    )
    .to.emit(contracts.smardexPair, "Burn")
    .withArgs(admin.address, admin.address, expectedToken0, expectedToken1);

  expect(await contracts.smardexPair.balanceOf(admin.address)).to.eq(lpAdminBalanceBefore.sub(lpToBurn));
  expect(await contracts.smardexPair.totalSupply()).to.eq(lpSupplyBefore.sub(lpToBurn));
  expect(await contracts.token0.balanceOf(contracts.smardexPair.address)).to.eq(
    balancePairToken0Before.sub(expectedToken0),
  );
  expect(await contracts.token1.balanceOf(contracts.smardexPair.address)).to.eq(
    balancePairToken1Before.sub(expectedToken1),
  );
  expect(await contracts.token0.balanceOf(admin.address)).to.eq(balanceUserToken0Before.add(expectedToken0));
  expect(await contracts.token1.balanceOf(admin.address)).to.eq(balanceUserToken1Before.add(expectedToken1));
}

export const mintTestCases: BigNumber[][] = [
  [1, 4, 2],
  ["1013000", "1013000", "1013000"],
  [155, 1550, "490153037326098796459"],
].map(a => a.map(n => (typeof n === "string" ? BigNumber.from(n) : parseEther(String(n)))));

interface DoubleMint {
  firstMintToken0: BigNumber;
  firstMintToken1: BigNumber;
  firstMintLP: BigNumber;
  secondMintToken0: BigNumber;
  secondMintToken1: BigNumber;
  secondMintLP: BigNumber;
}

export const mintDoubleTestCases: DoubleMint[] = [
  {
    firstMintToken0: parseEther("155"),
    firstMintToken1: parseEther("1550"),
    firstMintLP: parseEther("490.153037326098796459"),
    secondMintToken0: parseEther("15.5"),
    secondMintToken1: parseEther("155"),
    secondMintLP: parseEther("49.015303732609879645"),
  },
  {
    firstMintToken0: parseEther("155"),
    firstMintToken1: parseEther("1550"),
    firstMintLP: parseEther("490.153037326098796459"),
    secondMintToken0: parseEther("155"),
    secondMintToken1: parseEther("155"),
    secondMintLP: parseEther("49.015303732609879645"),
  },
  {
    firstMintToken0: parseEther("155"),
    firstMintToken1: parseEther("1550"),
    firstMintLP: parseEther("490.153037326098796459"),
    secondMintToken0: parseEther("15.5"),
    secondMintToken1: parseEther("1550"),
    secondMintLP: parseEther("49.015303732609879645"),
  },
  {
    firstMintToken0: BigNumber.from("1013000"),
    firstMintToken1: BigNumber.from("1013000"),
    firstMintLP: BigNumber.from("1013000"),
    secondMintToken0: BigNumber.from("1013000"),
    secondMintToken1: BigNumber.from("1013000"),
    secondMintLP: BigNumber.from("1013000"),
  },
];
interface BurnTestData {
  mintToken0: BigNumber;
  mintToken1: BigNumber;
  burnLP: BigNumber;
  expectedToken0: BigNumber;
  expectedToken1: BigNumber;
}

export const burnTestCases: BurnTestData[] = [
  {
    mintToken0: parseEther("3"),
    mintToken1: parseEther("3"),
    burnLP: parseEther("3").sub(MINIMUM_LIQUIDITY),
    expectedToken0: parseEther("3").sub(MINIMUM_LIQUIDITY),
    expectedToken1: parseEther("3").sub(MINIMUM_LIQUIDITY),
  },
  {
    mintToken0: parseEther("101.3"),
    mintToken1: parseEther("101.3"),
    burnLP: parseEther("101.3").sub(MINIMUM_LIQUIDITY),
    expectedToken0: parseEther("101.3").sub(MINIMUM_LIQUIDITY),
    expectedToken1: parseEther("101.3").sub(MINIMUM_LIQUIDITY),
  },
  {
    mintToken0: parseEther("101.3"),
    mintToken1: parseEther("101.3"),
    burnLP: parseEther("50.65").sub(MINIMUM_LIQUIDITY),
    expectedToken0: parseEther("50.65").sub(MINIMUM_LIQUIDITY),
    expectedToken1: parseEther("50.65").sub(MINIMUM_LIQUIDITY),
  },
  {
    mintToken0: BigNumber.from("8000"),
    mintToken1: BigNumber.from("8000"),
    burnLP: constants.One,
    expectedToken0: constants.One,
    expectedToken1: constants.One,
  },
];
