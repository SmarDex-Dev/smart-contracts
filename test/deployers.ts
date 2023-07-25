import { BigNumber, Signer } from "ethers";
import { ethers, network } from "hardhat";
import {
  ArbSysCoreTest,
  AutoSwapper,
  AutoSwapperL2,
  CallbackTest,
  CheckBlockTest,
  DoubleSwapRouter,
  ERC20Test,
  FakeERC20reentrancy,
  FarmingRange,
  FarmingRangeL2Arbitrum,
  RewardManagerTest,
  RewardManagerTestL2,
  RewardManagerTestL2Arbitrum,
  RouterEventEmitter,
  RouterForPairTest,
  SmardexFactory,
  SmardexFactoryTest,
  SmardexLibraryTest,
  SmardexPair,
  SmardexPairTest,
  SmardexRouter,
  SmardexRouterTest,
  SmardexTokenTest,
  Staking,
  TetherToken,
  WETH9,
} from "../typechain";
import { parseEther } from "ethers/lib/utils";

import { ADDRESS_100, FEES_LP, FEES_POOL } from "./constants";

export async function deployOrderedPairOfERC20(totalSupply: BigNumber): Promise<[ERC20Test, ERC20Test]> {
  const token0 = await deployERC20Test(totalSupply);
  const token1 = await deployERC20Test(totalSupply);

  if (BigNumber.from(token0.address).gt(BigNumber.from(token1.address))) {
    return [token1, token0];
  } else {
    return [token0, token1];
  }
}

export async function deployERC20Test(total_supply: BigNumber): Promise<ERC20Test> {
  const contractErc20 = await ethers.getContractFactory("ERC20Test", {});
  const erc20 = await contractErc20.deploy(total_supply);
  await erc20.deployed();

  return erc20;
}

export async function deploySmardexFactory(): Promise<SmardexFactory> {
  const contractFactory = await ethers.getContractFactory("SmardexFactory");
  const smardexFactory = await contractFactory.deploy();
  await smardexFactory.deployed();
  await smardexFactory.setFees(FEES_LP, FEES_POOL);

  return smardexFactory;
}

export async function deploySmardexFactoryTest(): Promise<SmardexFactoryTest> {
  const contractFactoryTest = await ethers.getContractFactory("SmardexFactoryTest", {});
  const smardexFactoryTest = await contractFactoryTest.deploy();
  await smardexFactoryTest.deployed();
  await smardexFactoryTest.setFees(FEES_LP, FEES_POOL);

  return smardexFactoryTest;
}

export async function deploySmardexLibraryTest(): Promise<SmardexLibraryTest> {
  const contractSmardexLibrary = await ethers.getContractFactory("SmardexLibraryTest", {});
  const smardexLibraryTest = await contractSmardexLibrary.deploy();
  await smardexLibraryTest.deployed();

  return smardexLibraryTest;
}

export async function deploySmardexPair(
  smardexFactory: SmardexFactory,
  token0: ERC20Test | WETH9,
  token1: ERC20Test | WETH9,
): Promise<SmardexPair> {
  await smardexFactory.createPair(token0.address, token1.address);
  const smardexPairAddress = await smardexFactory.getPair(token0.address, token1.address);
  const contractPair = await ethers.getContractFactory("SmardexPair", {});
  return contractPair.attach(smardexPairAddress);
}

export async function deploySmardexPairTest(
  smardexFactoryTest: SmardexFactoryTest,
  token0: ERC20Test | WETH9,
  token1: ERC20Test | WETH9,
): Promise<SmardexPairTest> {
  await smardexFactoryTest.createPairTest(token0.address, token1.address);
  const smardexPairTestAddress = await smardexFactoryTest.getPair(token0.address, token1.address);
  const contractPairTest = await ethers.getContractFactory("SmardexPairTest", {});

  return contractPairTest.attach(smardexPairTestAddress);
}

export async function deployWETH9(): Promise<WETH9> {
  const contractWETH9 = await ethers.getContractFactory("WETH9", {});
  const weth = await contractWETH9.deploy();
  await weth.deployed();

  return weth;
}

export async function deploySmardexRouterTest(smardexFactory: SmardexFactory, weth: WETH9): Promise<SmardexRouterTest> {
  const contractRouterTest = await ethers.getContractFactory("SmardexRouterTest", {});
  const routerTest = await contractRouterTest.deploy(smardexFactory.address, weth.address);
  await routerTest.deployed();

  return routerTest;
}

export async function deploySmardexRouter(smardexFactory: SmardexFactory, weth: WETH9): Promise<SmardexRouter> {
  const contractSmardexRouter = await ethers.getContractFactory("SmardexRouter", {});
  const smardexRouter = await contractSmardexRouter.deploy(smardexFactory.address, weth.address);
  await smardexRouter.deployed();

  return smardexRouter;
}

export async function deployRouterEventEmitter(): Promise<RouterEventEmitter> {
  const contractRouterEventEmitter = await ethers.getContractFactory("RouterEventEmitter", {});
  const routerEventEmitter = await contractRouterEventEmitter.deploy();
  await routerEventEmitter.deployed();

  return routerEventEmitter;
}

export async function deploySmardexToken(name: string, symbol: string, supply: BigNumber): Promise<SmardexTokenTest> {
  const contractSmardexToken = await ethers.getContractFactory("SmardexTokenTest", {});
  const smardexToken = await contractSmardexToken.deploy(name, symbol, supply);
  await smardexToken.deployed();

  return smardexToken;
}

export async function deployFarmingRange(deployer: Signer): Promise<FarmingRange> {
  const factory = await ethers.getContractFactory("FarmingRange");
  const farmingRange = await factory.deploy(await deployer.getAddress());
  await farmingRange.deployed();

  return farmingRange;
}

async function deployArbSysCore(): Promise<ArbSysCoreTest> {
  const factory = await ethers.getContractFactory("ArbSysCoreTest");
  const currentCode = await network.provider.send("eth_getCode", [ADDRESS_100]);

  if (currentCode.length <= 2) {
    const arbSysCoreTest = await factory.deploy();
    await arbSysCoreTest.deployed();
    const arbSysCoreCode = await network.provider.send("eth_getCode", [arbSysCoreTest.address]);

    await network.provider.send("hardhat_setCode", [ADDRESS_100, arbSysCoreCode]);
  }

  return factory.attach(ADDRESS_100);
}

export async function deployFarmingRangeL2Arbitrum(deployer: Signer): Promise<FarmingRangeL2Arbitrum> {
  await deployArbSysCore();
  const factory = await ethers.getContractFactory("FarmingRangeL2Arbitrum");
  const farmingRangeArbitrum = await factory.deploy(await deployer.getAddress());
  await farmingRangeArbitrum.deployed();

  return farmingRangeArbitrum;
}

export async function deployAutoSwapperL1(
  factoryAddress: string,
  sdexTokenAddress: string,
  stakingContractAddress: string,
): Promise<AutoSwapper> {
  const factory = await ethers.getContractFactory("AutoSwapper");
  const autoSwapper = await factory.deploy(factoryAddress, sdexTokenAddress, stakingContractAddress);
  await autoSwapper.deployed();

  return autoSwapper;
}

export async function deployAutoSwapperL2(factoryAddress: string, sdexTokenAddress: string): Promise<AutoSwapperL2> {
  const factory = await ethers.getContractFactory("AutoSwapperL2");
  const autoSwapper = await factory.deploy(factoryAddress, sdexTokenAddress);
  await autoSwapper.deployed();

  return autoSwapper;
}

export async function deployRewardManagerTest(
  farmingOwner: Signer,
  smardexTokenAddress: string,
  campaignBlock: number,
): Promise<RewardManagerTest> {
  const factory = await ethers.getContractFactory("RewardManagerTest");

  const rewardManager = await factory.deploy(await farmingOwner.getAddress(), smardexTokenAddress, campaignBlock);

  await rewardManager.deployed();

  return rewardManager;
}

export async function deployRewardManagerTestL2(farmingOwner: Signer): Promise<RewardManagerTestL2> {
  const factory = await ethers.getContractFactory("RewardManagerTestL2");
  const rewardManager = await factory.deploy(await farmingOwner.getAddress());
  await rewardManager.deployed();

  return rewardManager;
}

export async function deployRewardManagerTestL2Arbitrum(farmingOwner: Signer): Promise<RewardManagerTestL2Arbitrum> {
  await deployArbSysCore();
  const factory = await ethers.getContractFactory("RewardManagerTestL2Arbitrum");
  const rewardManager = await factory.deploy(await farmingOwner.getAddress());
  await rewardManager.deployed();

  return rewardManager;
}

export async function deployDoubleSwapRouter(): Promise<DoubleSwapRouter> {
  const factory = await ethers.getContractFactory("DoubleSwapRouter");
  const doubleSwapRouter = await factory.deploy();
  await doubleSwapRouter.deployed();

  return doubleSwapRouter;
}

export async function deployCallbackTestRouter(smardexFactory: SmardexFactory, WETH: WETH9): Promise<CallbackTest> {
  const factory = await ethers.getContractFactory("CallbackTest");
  const mintCallbackTestRouter = await factory.deploy(smardexFactory.address, WETH.address);
  await mintCallbackTestRouter.deployed();

  return mintCallbackTestRouter;
}

export async function deployRouterForPairTest(smardexFactory: SmardexFactory, WETH: WETH9): Promise<RouterForPairTest> {
  const factory = await ethers.getContractFactory("RouterForPairTest");
  const routerForPairTest = await factory.deploy(smardexFactory.address, WETH.address);
  await routerForPairTest.deployed();

  return routerForPairTest;
}

export async function deployFakeERC20reentrancy(
  smardexFactory: SmardexFactory,
  WETH: WETH9,
): Promise<FakeERC20reentrancy> {
  const factory = await ethers.getContractFactory("FakeERC20reentrancy");
  const fakeERC20contract = await factory.deploy(smardexFactory.address, WETH.address);
  await fakeERC20contract.deployed();

  return fakeERC20contract;
}

export async function deployTetherToken(): Promise<TetherToken> {
  const factory = await ethers.getContractFactory("TetherToken");
  const tetherToken = await factory.deploy(parseEther("1000"), "Tether USD", "USDT", 6);
  await tetherToken.deployed();

  return tetherToken;
}

export async function deployCheckBlockTest(
  stakingAddress: string,
  smardexTokenAddress: string,
): Promise<CheckBlockTest> {
  const factory = await ethers.getContractFactory("CheckBlockTest", {});
  const checkBlockTest = await factory.deploy(stakingAddress, smardexTokenAddress);
  await checkBlockTest.deployed();

  return checkBlockTest;
}

export async function deployStaking(smardexTokenAddress: string, farmingAddress: string): Promise<Staking> {
  const contractStaking = await ethers.getContractFactory("Staking", {});
  const Staking = await contractStaking.deploy(smardexTokenAddress, farmingAddress);
  await Staking.deployed();

  return Staking;
}
