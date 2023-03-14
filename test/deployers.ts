import { BigNumber, Signer } from "ethers";
import { ethers } from "hardhat";
import {
  AutoSwapper,
  CheckBlockTest,
  CallbackTest,
  DoubleSwapRouter,
  ERC20Test,
  FarmingRange,
  RewardManager,
  RouterEventEmitter,
  SmardexFactory,
  SmardexFactoryTest,
  SmardexLibraryTest,
  SmardexPair,
  SmardexPairTest,
  SmardexRouter,
  SmardexTokenTest,
  Staking,
  WETH9,
  SmardexRouterTest,
  RouterForPairTest,
} from "../typechain";

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

export async function deploySmardexFactory(feeToSetter: string): Promise<SmardexFactory> {
  const contractFactory = await ethers.getContractFactory("SmardexFactory", {});
  const smardexFactory = await contractFactory.deploy(feeToSetter);
  await smardexFactory.deployed();

  return smardexFactory;
}

export async function deploySmardexFactoryTest(feeToSetter: string): Promise<SmardexFactoryTest> {
  const contractFactoryTest = await ethers.getContractFactory("SmardexFactoryTest", {});
  const smardexFactoryTest = await contractFactoryTest.deploy(feeToSetter);
  await smardexFactoryTest.deployed();

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

export async function deploySmardexToken(name: string, symbol: string, supply: number): Promise<SmardexTokenTest> {
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

export async function deployStaking(smardexTokenAddress: string, farmingAddress: string): Promise<Staking> {
  const contractStaking = await ethers.getContractFactory("Staking", {});
  const Staking = await contractStaking.deploy(smardexTokenAddress, farmingAddress);
  await Staking.deployed();

  return Staking;
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

export async function deployAutoSwapper(
  factoryAddress: string,
  sdexTokenAddress: string,
  stakingContractAddress: string,
): Promise<AutoSwapper> {
  const factory = await ethers.getContractFactory("AutoSwapper");
  const autoSwapper = await factory.deploy(factoryAddress, sdexTokenAddress, stakingContractAddress);
  await autoSwapper.deployed();

  return autoSwapper;
}

export async function deployRewardManager(
  farmingOwner: Signer,
  smardexTokenAddress: string,
  campaignBlock: BigNumber,
): Promise<RewardManager> {
  const factory = await ethers.getContractFactory("RewardManager");
  const rewardManager = await factory.deploy(await farmingOwner.getAddress(), smardexTokenAddress, campaignBlock);
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

export async function deployFakeERC20reentrancy(smardexFactory: SmardexFactory, WETH: WETH9) {
  const factory = await ethers.getContractFactory("FakeERC20reentrancy");
  const fakeERC20contract = await factory.deploy(smardexFactory.address, WETH.address);
  await fakeERC20contract.deployed();

  return fakeERC20contract;
}
