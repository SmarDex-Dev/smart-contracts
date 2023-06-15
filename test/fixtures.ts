import type { Signer } from "@ethersproject/abstract-signer";
import { BigNumber, constants } from "ethers";
import {
  CallbackTest,
  CheckBlockTest,
  ERC20Permit,
  ERC20Test,
  FakeERC20reentrancy,
  FarmingRange,
  RewardManager,
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
  WETH9,
} from "../typechain";
import {
  deployAutoSwapper,
  deployCallbackTestRouter,
  deployCheckBlockTest,
  deployERC20Test,
  deployFakeERC20reentrancy,
  deployFarmingRange,
  deployOrderedPairOfERC20,
  deployRewardManager,
  deployRouterEventEmitter,
  deployRouterForPairTest,
  deploySmardexFactory,
  deploySmardexFactoryTest,
  deploySmardexLibraryTest,
  deploySmardexPair,
  deploySmardexPairTest,
  deploySmardexRouter,
  deploySmardexRouterTest,
  deploySmardexToken,
  deployStaking,
  deployWETH9,
} from "./deployers";
import { parseEther } from "ethers/lib/utils";
import { advanceBlockTo, latestBlockNumber } from "./helpers/time";
import { IFarming } from "./types";
import { ethers } from "hardhat";

type UnitFixtureSmardexFactory = {
  smardexToken: ERC20Permit;
  factory: SmardexFactory;
};

export async function unitFixtureSmardexFactory(): Promise<UnitFixtureSmardexFactory> {
  const signers = await ethers.getSigners();
  const smardexToken: ERC20Permit = await deployERC20Test(parseEther("10000"));
  const factory: SmardexFactory = await deploySmardexFactory(await signers[0].getAddress());

  return {
    smardexToken,
    factory,
  };
}

type UnitFixtureSmardexLibraryTest = {
  smardexLibraryTest: SmardexLibraryTest;
};

export async function unitFixtureSmardexLibraryTest(): Promise<UnitFixtureSmardexLibraryTest> {
  const smardexLibraryTest: SmardexLibraryTest = await deploySmardexLibraryTest();
  return { smardexLibraryTest };
}

type UnitFixtureRouterForPairTest = {
  factory: SmardexFactoryTest;
  smardexPairTest: SmardexPairTest;
  token0: ERC20Test;
  token1: ERC20Test;
  routerForPairTest: RouterForPairTest;
  WETH: WETH9;
};

export async function unitFixtureSmardexPairTest(): Promise<UnitFixtureRouterForPairTest> {
  const signers = await ethers.getSigners();
  const factory = await deploySmardexFactoryTest(await signers[0].getAddress());
  const [token0, token1] = await deployOrderedPairOfERC20(constants.MaxUint256);
  const smardexPairTest = await deploySmardexPairTest(factory, token0, token1);
  const WETH = await deployWETH9();
  const routerForPairTest = await deployRouterForPairTest(factory, WETH);
  return { factory, smardexPairTest, token0, token1, routerForPairTest, WETH };
}

type UnitFixtureRouterTest = {
  token0: ERC20Test;
  token1: ERC20Test;
  factory: SmardexFactory;
  pair: SmardexPair;
  smardexRouterTest: SmardexRouterTest;
  smardexRouterCallbackTest: CallbackTest;
  WETH: WETH9;
};

export async function unitFixtureSmardexRouterTest(): Promise<UnitFixtureRouterTest> {
  const signers = await ethers.getSigners();
  const [token0, token1] = await deployOrderedPairOfERC20(constants.MaxUint256);
  const factory = await deploySmardexFactory(await signers[0].getAddress());
  const pair = await deploySmardexPair(factory, token0, token1);
  const WETH = await deployWETH9();
  const smardexRouterTest = await deploySmardexRouterTest(factory, WETH);
  const smardexRouterCallbackTest = await deployCallbackTestRouter(factory, WETH);

  return {
    token0,
    token1,
    factory,
    pair,
    smardexRouterTest,
    smardexRouterCallbackTest,
    WETH,
  };
}

type UnitFixtureSmardexRouter = {
  token0: ERC20Test;
  token1: ERC20Test;
  WETH: WETH9;
  WETHPartner: ERC20Test;
  factory: SmardexFactory;
  smardexRouter: SmardexRouter;
  pair: SmardexPair;
  WETHPair: SmardexPair;
  routerEventEmitter: RouterEventEmitter;
};

export async function unitFixtureSmardexRouter(): Promise<UnitFixtureSmardexRouter> {
  const signers = await ethers.getSigners();
  const [token0, token1] = await deployOrderedPairOfERC20(parseEther("10000000"));
  const WETH = await deployWETH9();
  const WETHPartner = await deployERC20Test(parseEther("10000000"));
  const factory = await deploySmardexFactory(await signers[0].getAddress());
  const smardexRouter = await deploySmardexRouter(factory, WETH);
  const pair = await deploySmardexPair(factory, token0, token1);
  const routerEventEmitter = await deployRouterEventEmitter();

  const WETHPair = await deploySmardexPair(factory, WETH, WETHPartner);

  return {
    token0,
    token1,
    WETH,
    WETHPartner,
    factory,
    smardexRouter,
    pair,
    WETHPair,
    routerEventEmitter,
  };
}

type UnitFixtureCallbackTest = {
  token0: ERC20Test;
  token1: ERC20Test;
  WETH: WETH9;
  factory: SmardexFactory;
  smardexRouter: SmardexRouter;
  smardexRouterCallbackTest: CallbackTest;
  pair: SmardexPair;
  fakeERC20reentrancy: FakeERC20reentrancy;
};

export async function unitFixtureCallbackTest(): Promise<UnitFixtureCallbackTest> {
  const signers = await ethers.getSigners();
  const [token0, token1] = await deployOrderedPairOfERC20(parseEther("10000000"));
  const WETH = await deployWETH9();
  await WETH.deposit({ value: parseEther("10") });
  const factory = await deploySmardexFactory(await signers[0].getAddress());
  const smardexRouter = await deploySmardexRouter(factory, WETH);
  const smardexRouterCallbackTest = await deployCallbackTestRouter(factory, WETH);
  const fakeERC20reentrancy = await deployFakeERC20reentrancy(factory, WETH);
  const pair = await deploySmardexPair(factory, token0, token1);

  return {
    token0,
    token1,
    factory,
    smardexRouter,
    smardexRouterCallbackTest,
    pair,
    fakeERC20reentrancy,
    WETH,
  };
}

export async function unitFixtureTokensAndPairWithFactory(factory: SmardexFactory) {
  const [token0, token1] = await deployOrderedPairOfERC20(parseEther("10000000"));
  const pair = await deploySmardexPair(factory, token0, token1);

  return {
    token0,
    token1,
    pair,
  };
}

export type UnitFixtureFarmingRange = {
  farmingRange: FarmingRange;
  farmingRangeAsDeployer: FarmingRange;
  farmingRangeAsAlice: FarmingRange;
  farmingRangeAsBob: FarmingRange;
  farmingRangeAsCat: FarmingRange;
  stakingTokenAsDeployer: ERC20Test;
  stakingTokenAsAlice: ERC20Test;
  stakingTokenAsBob: ERC20Test;
  stakingTokenAsCat: ERC20Test;
  rewardTokenAsDeployer: SmardexTokenTest;
  rewardToken2AsDeployer: SmardexTokenTest;
  stakingToken: ERC20Test;
  rewardToken: SmardexTokenTest;
  rewardToken2: SmardexTokenTest;
  mockedBlock: BigNumber;
};

export async function unitFixtureFarmingRange(): Promise<UnitFixtureFarmingRange> {
  const signers = await ethers.getSigners();
  const [deployer, alice, bob, cat] = signers;

  const stakingToken = await deployERC20Test(constants.Zero);
  const rewardToken2 = await deploySmardexToken("ERC20reward2", "RWD2", constants.Zero);
  const rewardToken = await deploySmardexToken("ERC20reward", "RWD", constants.Zero);
  const farmingRange = await deployFarmingRange(deployer);
  const rewardTokenAsDeployer = rewardToken.connect(deployer);
  const rewardToken2AsDeployer = rewardToken2.connect(deployer);
  await rewardTokenAsDeployer.approve(farmingRange.address, constants.MaxUint256);
  await rewardToken2AsDeployer.approve(farmingRange.address, constants.MaxUint256);
  const mockedBlock = await latestBlockNumber();
  await advanceBlockTo(mockedBlock.add(1).toNumber());

  const farmingRangeAsDeployer = farmingRange.connect(deployer);
  const farmingRangeAsAlice = farmingRange.connect(alice);
  const farmingRangeAsBob = farmingRange.connect(bob);
  const farmingRangeAsCat = farmingRange.connect(cat);

  const stakingTokenAsDeployer = stakingToken.connect(deployer);

  const stakingTokenAsAlice = stakingToken.connect(alice);
  const stakingTokenAsBob = stakingToken.connect(bob);
  const stakingTokenAsCat = stakingToken.connect(cat);

  return {
    farmingRange,
    farmingRangeAsDeployer,
    farmingRangeAsAlice,
    farmingRangeAsBob,
    farmingRangeAsCat,
    stakingTokenAsDeployer,
    stakingTokenAsAlice,
    stakingTokenAsBob,
    stakingTokenAsCat,
    rewardTokenAsDeployer,
    rewardToken2AsDeployer,
    stakingToken,
    rewardToken,
    rewardToken2,
    mockedBlock,
  };
}

export async function unitFixtureCampaignWith2rewards(
  farming: UnitFixtureFarmingRange,
  signer: Signer,
  initialBonusPerBlock: BigNumber,
  expect?: (val: any, message?: string | undefined) => Chai.Assertion,
): Promise<BigNumber> {
  const mintedRewardPhase1 = initialBonusPerBlock.mul(farming.mockedBlock.add(11).sub(farming.mockedBlock.add(8)));
  const mintedRewardPhase2 = initialBonusPerBlock
    .add(1)
    .mul(farming.mockedBlock.add(20).sub(farming.mockedBlock.add(11)));
  const mintedReward = mintedRewardPhase1.add(mintedRewardPhase2);
  await farming.rewardTokenAsDeployer.mint(await signer.getAddress(), mintedReward);

  await initializeFarmingCampaign(
    farming.mockedBlock,
    initialBonusPerBlock,
    initialBonusPerBlock.add(1),
    farming.farmingRange,
    farming.stakingToken.address,
    farming.rewardToken.address,
  );
  const length = await farming.farmingRangeAsDeployer.rewardInfoLen(0);
  expect?.(length).to.eq(2);

  return length;
}

type UnitFixtureStaking = {
  smardexTokenTest: SmardexTokenTest;
  staking: Staking;
  farming: FarmingRange;
  startBlockFarming: BigNumber;
  checkBlockTest: CheckBlockTest;
};

export async function unitFixtureStaking(): Promise<UnitFixtureStaking> {
  const signers = await ethers.getSigners();
  const deployer = signers[0];
  const smardexTokenTest: SmardexTokenTest = await deploySmardexToken(
    "Smardex Token Test",
    "SDEX",
    parseEther("10000"),
  );
  const farming = await deployFarmingRange(deployer);
  const staking: Staking = await deployStaking(smardexTokenTest.address, farming.address);
  const checkBlockTest: CheckBlockTest = await deployCheckBlockTest(staking.address, smardexTokenTest.address);

  await smardexTokenTest.approve(staking.address, constants.MaxUint256);
  await smardexTokenTest.approve(farming.address, constants.MaxUint256);

  //total campaign cost : 21 SDEX
  //1st: block 8 - 10 : 1 SDEX * 3
  //2st: block 11 - 20 : 2 SDEX * 9
  const startBlockFarming = (await latestBlockNumber()).add(10);
  await initializeFarmingCampaign(
    startBlockFarming,
    parseEther("1"),
    parseEther("2"),
    farming,
    staking.address,
    smardexTokenTest.address,
  );

  return {
    smardexTokenTest,
    staking,
    farming,
    startBlockFarming,
    checkBlockTest,
  };
}

async function initializeFarmingCampaign(
  startBlock: BigNumber,
  initialBonusPerBlock: BigNumber,
  nextPeriodRewardPerBlock: BigNumber,
  farming: FarmingRange,
  stakingTokenAddress: string,
  rewardTokenAddress: string,
) {
  await farming.addCampaignInfo(stakingTokenAddress, rewardTokenAddress, startBlock.add(8).toString());
  // set reward info limit
  await farming.setRewardInfoLimit(2);
  // add the first reward info
  await farming.addRewardInfo(0, startBlock.add(11).toString(), initialBonusPerBlock);

  await farming.addRewardInfo(0, startBlock.add(20).toString(), nextPeriodRewardPerBlock);
}

export async function unitFixtureAutoSwapper(): Promise<IFarming> {
  const fixture = await unitFixtureSmardexRouter();
  return {
    ...fixture,
    smardexToken: fixture.token0,
    autoSwapper: await deployAutoSwapper(fixture.factory.address, fixture.token0.address, fixture.factory.address),
  };
}

export type UnitFixtureRewardManager = {
  stakingToken: ERC20Test;
  rewardManager: RewardManager;
  mockedBlock: BigNumber;
};

export async function unitFixtureRewardManager(): Promise<UnitFixtureRewardManager> {
  const signers = await ethers.getSigners();
  const stakingToken = await deployERC20Test(parseEther("10000"));
  const mockedBlock = await latestBlockNumber();
  await advanceBlockTo(mockedBlock.add(1).toNumber());
  const rewardManager = await deployRewardManager(signers[0], stakingToken.address, (await latestBlockNumber()).add(1));

  return {
    rewardManager,
    stakingToken,
    mockedBlock,
  };
}
