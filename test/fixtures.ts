import type { Signer } from "@ethersproject/abstract-signer";
import { BigNumber, constants } from "ethers";
import { solidityPack, getAddress } from "ethers/lib/utils";
import { FarmingRange, SmardexFactory, SmardexFactoryV1, ERC20Test } from "../typechain";

import {
  deployAutoSwapperL1,
  deployAutoSwapperL2,
  deployCallbackTestRouter,
  deployCallbackTestRouterV2,
  deployCheckBlockTest,
  deployERC20Test,
  deployFakeERC20reentrancy,
  deployFakeERC20reentrancyV2,
  deployFarmingRange,
  deployFarmingRangeL2Arbitrum,
  deployOrderedPairOfERC20,
  deployRewardManagerTest,
  deployRewardManagerTestL2,
  deployRewardManagerTestL2Arbitrum,
  deployRouterEventEmitter,
  deployRouterForPairTest,
  deployRouterForPairTestV2,
  deploySmardexFactory,
  deploySmardexFactoryV1,
  deploySmardexFactoryTest,
  deploySmardexFactoryTestV1,
  deploySmardexLibraryTestV1,
  deploySmardexLibraryTest,
  deploySmardexPair,
  deploySmardexPairV1,
  deploySmardexPairTest,
  deploySmardexPairTestV1,
  deploySmardexRouter,
  deploySmardexRouterV2WithV1Factory,
  deploySmardexRouterTest,
  deploySmardexRouterTestV2,
  deploySmardexToken,
  deployStaking,
  deployTetherToken,
  deployWETH9,
  deployV1Pair,
  deployOrderedPairFluid,
  deploySmardexPairFluid,
} from "./deployers";

import { keccak256, parseEther } from "ethers/lib/utils";
import { advanceBlockTo, latest, latestBlockNumber } from "./helpers/time";
import { ethers } from "hardhat";
import { latestBlockNumberL2Arbitrum } from "./utils";

async function unitFixtureCommon(amount: BigNumber) {
  const [token0, token1] = await deployOrderedPairOfERC20(amount);
  const WETH = await deployWETH9();

  return {
    token0,
    token1,
    WETH,
  };
}

export async function unitFixtureSmardexFactory() {
  const smardexToken = await deployERC20Test(parseEther("10000"));
  const { token0, token1, WETH } = await unitFixtureCommon(constants.MaxUint256);
  const factory = await deploySmardexFactory();

  return {
    smardexToken,
    factory,
    token0,
    token1,
    WETH,
  };
}

export async function unitFixtureSmardexFactoryV1() {
  const smardexToken = await deployERC20Test(parseEther("10000"));
  const { token0, token1, WETH } = await unitFixtureCommon(constants.MaxUint256);
  const factory = await deploySmardexFactoryV1();

  return {
    smardexToken,
    factory,
    token0,
    token1,
    WETH,
  };
}

export async function unitFixtureSmardexLibraryTestV2() {
  const [admin] = await ethers.getSigners();
  const smardexLibraryTest = await deploySmardexLibraryTest();
  const smardexWETH = await deployWETH9();

  const smardexFactory = await deploySmardexFactory();
  await smardexFactory.closeWhitelist();
  const smardexRouter = await deploySmardexRouter(smardexFactory, smardexWETH);

  const [token0, token1] = await deployOrderedPairOfERC20(constants.MaxUint256);
  const amount0 = parseEther("1500000");
  const amount1 = parseEther("10000");
  await token0.approve(smardexRouter.address, amount0);
  await token1.approve(smardexRouter.address, amount1);

  const smardexPair = await deploySmardexPair(smardexFactory, token0, token1);

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

  return {
    smardexLibraryTest,
    smardexRouter,
    smardexPair,
    token0,
    token1,
  };
}

export async function unitFixtureSmardexLibraryTestV1() {
  const [admin] = await ethers.getSigners();
  const smardexLibraryTest = await deploySmardexLibraryTestV1();
  const smardexWETH = await deployWETH9();

  const smardexFactory = await deploySmardexFactoryV1();
  const smardexRouter = await deploySmardexRouterV2WithV1Factory(smardexFactory, smardexWETH);

  const [token0, token1] = await deployOrderedPairOfERC20(constants.MaxUint256);
  const amount0 = parseEther("1500000");
  const amount1 = parseEther("10000");
  await token0.approve(smardexRouter.address, amount0);
  await token1.approve(smardexRouter.address, amount1);

  const smardexPair = await deploySmardexPairV1(smardexFactory, token0, token1);

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

  return {
    smardexLibraryTest,
    smardexRouter,
    smardexPair,
    token0,
    token1,
  };
}

export async function unitFixtureSmardexPairTest() {
  const { token0, token1, WETH } = await unitFixtureCommon(constants.MaxUint256);
  const factory = await deploySmardexFactoryTest();
  await factory.closeWhitelist();

  const routerForPairTest = await deployRouterForPairTest(factory, WETH);

  const smardexRouterTest = await deploySmardexRouterTest(factory, WETH);

  const smardexPairTest = await deploySmardexPairTest(factory, token0, token1);

  return {
    factory,
    smardexPairTest,
    token0,
    token1,
    routerForPairTest,
    smardexRouterTest,
    WETH,
  };
}

export async function unitFixtureSmardexPairTestV1() {
  const { token0, token1, WETH } = await unitFixtureCommon(constants.MaxUint256);
  const factory = await deploySmardexFactoryTestV1();

  const routerForPairTest = await deployRouterForPairTestV2(factory, WETH);
  const smardexRouterTest = await deploySmardexRouterTestV2(factory, WETH);
  const smardexPairTest = await deploySmardexPairTestV1(factory, token0, token1);

  return {
    factory,
    smardexPairTest,
    token0,
    token1,
    routerForPairTest,
    smardexRouterTest,
    WETH,
  };
}

export async function unitFixtureSmardexRouterTest() {
  const { token0, token1, WETH } = await unitFixtureCommon(constants.MaxUint256);

  const factory = await deploySmardexFactory();
  await factory.closeWhitelist();
  const pair = await deploySmardexPair(factory, token0, token1);

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

async function determinePairAddress(token0: ERC20Test, token1: ERC20Test, factory: SmardexFactory) {
  const salt = keccak256(solidityPack(["address", "address"], [token0.address, token1.address]));
  const pairFactory = await ethers.getContractFactory("SmardexPair");
  return getAddress(
    "0x" +
      keccak256(
        solidityPack(
          ["bytes1", "address", "bytes32", "bytes32"],
          ["0xFF", factory.address, salt, keccak256(pairFactory.bytecode)],
        ),
      ).slice(26, constants.HashZero.length),
  );
}

export async function unitFixtureSmardexPairTwoTokenInBefore() {
  const { token0, token1, WETH } = await unitFixtureCommon(constants.MaxUint256);

  const factory = await deploySmardexFactory();
  await factory.closeWhitelist();
  const expectedPairAddress = await determinePairAddress(token0, token1, factory);

  await (await token0.transfer(expectedPairAddress, parseEther("1"))).wait();
  await (await token1.transfer(expectedPairAddress, parseEther("10"))).wait();

  const pair = await deploySmardexPair(factory, token0, token1);

  if (pair.address !== expectedPairAddress) throw new Error("wrong pair address");

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

export async function unitFixtureSmardexPairOneTokenInBefore() {
  const { token0, token1, WETH } = await unitFixtureCommon(constants.MaxUint256);

  const factory = await deploySmardexFactory();
  await factory.closeWhitelist();
  const expectedPairAddress = await determinePairAddress(token0, token1, factory);

  await (await token1.transfer(expectedPairAddress, parseEther("10"))).wait();
  const pair = await deploySmardexPair(factory, token0, token1);

  if (pair.address !== expectedPairAddress) throw new Error("wrong pair address");

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

export async function unitFixtureSmardexRouterTestV1() {
  const { token0, token1, WETH } = await unitFixtureCommon(constants.MaxUint256);

  const factory = await deploySmardexFactoryV1();

  const pair = await deploySmardexPairV1(factory, token0, token1);

  const smardexRouterTest = await deploySmardexRouterTestV2(factory, WETH);

  const smardexRouterCallbackTest = await deployCallbackTestRouterV2(factory, WETH);

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

export async function unitFixtureSmardexRouter() {
  const amount = parseEther("10000000");
  const { token0, token1, WETH } = await unitFixtureCommon(amount);
  const WETHPartner = await deployERC20Test(amount);
  const routerEventEmitter = await deployRouterEventEmitter();

  const factory = await deploySmardexFactory();
  await factory.closeWhitelist();
  const smardexRouter = await deploySmardexRouter(factory, WETH);

  const pair = await deploySmardexPair(factory, token0, token1);

  const WETHPair = await deploySmardexPair(factory, WETH, WETHPartner);

  const sdex = await deploySmardexToken("Smardex Token Test", "SDEX", parseEther("10000"));

  const farming = await deploySmardexFactory();

  const staking = await deployStaking(sdex.address, farming.address);

  const autoSwapper = await deployAutoSwapperL1(factory.address, sdex.address, staking.address, smardexRouter.address);

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
    autoSwapper,
  };
}

export async function unitFixtureSmardexRouterV2WithFactoryV1() {
  const amount = parseEther("10000000");
  const { token0, token1, WETH } = await unitFixtureCommon(amount);
  const WETHPartner = await deployERC20Test(amount);
  const routerEventEmitter = await deployRouterEventEmitter();

  const factory = await deploySmardexFactoryV1();

  const smardexRouter = await deploySmardexRouterV2WithV1Factory(factory, WETH);

  const pair = await deploySmardexPairV1(factory, token0, token1);

  const WETHPair = await deploySmardexPairV1(factory, WETH, WETHPartner);

  const sdex = await deploySmardexToken("Smardex Token Test", "SDEX", parseEther("10000"));

  const farming = await deploySmardexFactoryV1();

  const staking = await deployStaking(sdex.address, farming.address);

  const autoSwapper = await deployAutoSwapperL1(factory.address, sdex.address, staking.address, smardexRouter.address);

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
    autoSwapper,
  };
}

export async function unitFixtureSmardexRouterWhitelist() {
  const { token0, token1, WETH } = await unitFixtureCommon(constants.MaxUint256);
  const factoryV1 = await deploySmardexFactoryV1();
  const factory = await deploySmardexFactoryTest();
  const smardexRouterV2 = await deploySmardexRouterV2WithV1Factory(factoryV1, WETH);
  const smardexRouterTest = await deploySmardexRouterTest(factory, WETH);

  const pair = await deployV1Pair(token0, token1, factoryV1, smardexRouterV2);
  // Add liquidity to pair
  await smardexRouterV2.addLiquidity(
    {
      tokenA: token0.address,
      tokenB: token1.address,
      amountADesired: 100_000,
      amountBDesired: 100_000,
      amountAMin: constants.Zero,
      amountBMin: constants.Zero,
      fictiveReserveB: constants.Zero,
      fictiveReserveAMin: constants.Zero,
      fictiveReserveAMax: constants.Zero,
    },
    (
      await ethers.getSigners()
    )[0].address,
    constants.MaxUint256,
  );
  // Migrate pair to new factory
  await factory.addPair(pair.address);

  return {
    token0,
    token1,
    WETH,
    factoryV1,
    factory,
    smardexRouterV2,
    smardexRouterTest,
    pair,
  };
}

export async function unitFixtureCallbackTest() {
  const { token0, token1, WETH } = await unitFixtureCommon(parseEther("10000000"));
  await WETH.deposit({ value: parseEther("10") });
  const factory = await deploySmardexFactory();
  await factory.closeWhitelist();
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

export async function unitFixtureCallbackTestV1() {
  const { token0, token1, WETH } = await unitFixtureCommon(parseEther("10000000"));
  await WETH.deposit({ value: parseEther("10") });
  const factory = await deploySmardexFactoryV1();

  const smardexRouter = await deploySmardexRouterV2WithV1Factory(factory, WETH);

  const smardexRouterCallbackTest = await deployCallbackTestRouterV2(factory, WETH);
  const fakeERC20reentrancy = await deployFakeERC20reentrancyV2(factory, WETH);
  const pair = await deploySmardexPairV1(factory, token0, token1);

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

export async function unitFixtureTokensAndPairWithFactory(factory: SmardexFactory | SmardexFactoryV1) {
  const [token0, token1] = await deployOrderedPairOfERC20(parseEther("10000000"));
  const pair = await deploySmardexPair(factory, token0, token1);

  return {
    token0,
    token1,
    pair,
  };
}

async function setupFarmingRangeTokens() {
  const signers = await ethers.getSigners();
  const [deployer, alice, bob, cat] = signers;
  const stakingToken = await deployERC20Test(constants.Zero);
  const rewardToken2 = await deploySmardexToken("ERC20reward2", "RWD2", constants.Zero);
  const rewardToken = await deploySmardexToken("ERC20reward", "RWD", constants.Zero);
  const rewardTokenAsDeployer = rewardToken.connect(deployer);
  const rewardToken2AsDeployer = rewardToken2.connect(deployer);
  const stakingTokenAsDeployer = stakingToken.connect(deployer);
  const stakingTokenAsAlice = stakingToken.connect(alice);
  const stakingTokenAsBob = stakingToken.connect(bob);
  const stakingTokenAsCat = stakingToken.connect(cat);

  return {
    stakingTokenAsDeployer,
    stakingTokenAsAlice,
    stakingTokenAsBob,
    stakingTokenAsCat,
    rewardTokenAsDeployer,
    rewardToken2AsDeployer,
    stakingToken,
    rewardToken,
    rewardToken2,
    deployer,
    alice,
    bob,
    cat,
  };
}

export async function unitFixtureFarmingRange() {
  const tokens = await setupFarmingRangeTokens();
  const farmingRange = await deployFarmingRange(tokens.deployer);
  const signers = await setupFarmingRangeSigners(tokens, farmingRange);

  return {
    ...tokens,
    farmingRange,
    ...signers,
  };
}

export async function unitFixtureFarmingRangeL2Arbitrum() {
  const tokens = await setupFarmingRangeTokens();
  const farmingRangeL2Arbitrum = await deployFarmingRangeL2Arbitrum(tokens.deployer);
  const signers = await setupFarmingRangeSigners(tokens, farmingRangeL2Arbitrum);

  return {
    ...tokens,
    farmingRange: farmingRangeL2Arbitrum,
    ...signers,
  };
}

async function setupFarmingRangeSigners(
  fixtures: Awaited<ReturnType<typeof setupFarmingRangeTokens>>,
  farmingRange: FarmingRange,
) {
  await fixtures.rewardTokenAsDeployer.approve(farmingRange.address, constants.MaxUint256);
  await fixtures.rewardToken2AsDeployer.approve(farmingRange.address, constants.MaxUint256);
  const mockedBlock = await latestBlockNumber();
  await advanceBlockTo(mockedBlock.add(1).toNumber());

  const farmingRangeAsDeployer = farmingRange.connect(fixtures.deployer);
  const farmingRangeAsAlice = farmingRange.connect(fixtures.alice);
  const farmingRangeAsBob = farmingRange.connect(fixtures.bob);
  const farmingRangeAsCat = farmingRange.connect(fixtures.cat);

  return {
    farmingRangeAsDeployer,
    farmingRangeAsAlice,
    farmingRangeAsBob,
    farmingRangeAsCat,
    mockedBlock,
  };
}

export async function unitFixtureCampaignWith2rewards(
  farming: Awaited<ReturnType<typeof unitFixtureFarmingRange>>,
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

export async function unitFixtureStaking() {
  const signers = await ethers.getSigners();
  const deployer = signers[0];
  const smardexTokenTest = await deploySmardexToken("Smardex Token Test", "SDEX", parseEther("10000"));
  const farming = await deployFarmingRange(deployer);
  const staking = await deployStaking(smardexTokenTest.address, farming.address);
  const checkBlockTest = await deployCheckBlockTest(staking.address, smardexTokenTest.address);

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
  await farming.addCampaignInfo(stakingTokenAddress, rewardTokenAddress, startBlock.add(8));
  // add the first reward info
  await farming.addRewardInfo(0, startBlock.add(11), initialBonusPerBlock);

  await farming.addRewardInfo(0, startBlock.add(20), nextPeriodRewardPerBlock);
}

async function unitFixtureAutoSwapperData() {
  const fixtures = await unitFixtureSmardexRouter();
  return {
    ...fixtures,
    smardexToken: fixtures.token0,
  };
}

export async function unitFixtureAutoSwapperL1() {
  const fixtures = await unitFixtureAutoSwapperData();
  const autoSwapper = await deployAutoSwapperL1(
    fixtures.factory.address,
    fixtures.token0.address,
    fixtures.factory.address,
    fixtures.smardexRouter.address,
  );

  return {
    ...fixtures,
    autoSwapper,
  };
}

export async function unitFixtureAutoSwapperL2() {
  const fixtures = await unitFixtureAutoSwapperData();
  const autoSwapper = await deployAutoSwapperL2(
    fixtures.factory.address,
    fixtures.token0.address,
    fixtures.smardexRouter.address,
  );
  return {
    ...fixtures,
    autoSwapper,
  };
}

async function unitFixtureRewardManagerData() {
  const stakingToken = await deployERC20Test(parseEther("10000"));
  const tether = await deployTetherToken();

  return {
    stakingToken,
    tether,
  };
}

export async function unitFixtureRewardManagerTestL1() {
  const fixtures = await unitFixtureRewardManagerData();
  const mockedBlock = await latestBlockNumber();
  const rewardManagerTest = await deployRewardManagerTest(
    (
      await ethers.getSigners()
    )[0],
    fixtures.stakingToken.address,
    mockedBlock.add(2).toNumber(),
  );

  return {
    ...fixtures,
    rewardManagerTest,
    mockedBlock,
  };
}

export async function unitFixtureRewardManagerTestL2() {
  const fixtures = await unitFixtureRewardManagerData();
  const mockedBlock = await latestBlockNumber();
  const rewardManagerTest = await deployRewardManagerTestL2((await ethers.getSigners())[0]);
  const farmingAddress = await rewardManagerTest.farming();
  const farmingFactory = await ethers.getContractFactory("FarmingRange");
  const farming = farmingFactory.attach(farmingAddress);
  await farming.addCampaignInfo(fixtures.stakingToken.address, fixtures.stakingToken.address, mockedBlock.add(3));

  return {
    ...fixtures,
    rewardManagerTest,
    mockedBlock,
  };
}

export async function unitFixtureRewardManagerTestL2Arbitrum() {
  const fixtures = await unitFixtureRewardManagerData();
  const rewardManagerTest = await deployRewardManagerTestL2Arbitrum((await ethers.getSigners())[0]);
  const mockedBlock = await latestBlockNumberL2Arbitrum();
  const farmingAddress = await rewardManagerTest.farming();
  const farmingFactory = await ethers.getContractFactory("FarmingRangeL2Arbitrum");
  const farming = farmingFactory.attach(farmingAddress);
  await farming.addCampaignInfo(fixtures.stakingToken.address, fixtures.stakingToken.address, mockedBlock.add(3));

  return {
    ...fixtures,
    rewardManagerTest,
    mockedBlock,
  };
}

async function unitFixtureFluid(amount: BigNumber) {
  const [fluidToken0, fluidToken1] = await deployOrderedPairFluid(amount);
  const WETH = await deployWETH9();

  return {
    fluidToken0,
    fluidToken1,
    WETH,
  };
}

export async function unitFixtureSmardexRouterFluid() {
  const { fluidToken0, fluidToken1, WETH } = await unitFixtureFluid(constants.MaxUint256);

  const factoryTest = await deploySmardexFactoryTest();
  await factoryTest.closeWhitelist();
  const pairTest = await deploySmardexPairFluid(factoryTest, fluidToken0, fluidToken1);

  const smardexRouterTest = await deploySmardexRouterTest(factoryTest, WETH);
  await smardexRouterTest.addPairToWhitelist(fluidToken0.address, fluidToken1.address);

  return {
    fluidToken0,
    fluidToken1,
    factoryTest,
    pairTest,
    smardexRouterTest,
    WETH,
  };
}
