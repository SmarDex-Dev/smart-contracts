import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import {
  AutoSwapper,
  AutoSwapperL2,
  CallbackTest,
  ERC20Permit,
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
  SmardexLibrary,
  SmardexPair,
  SmardexPairTest,
  SmardexRouter,
  SmardexRouterTest,
  SmardexTokenTest,
  Staking,
  TetherToken,
  WETH9,
} from "../typechain";
import { BigNumber } from "ethers";
import { UnitFixtureFarmingRange } from "./fixtures";

declare module "mocha" {
  export interface Context {
    contracts: Contracts;
    signers: Signers;
    farming: UnitFixtureFarmingRange;
  }
}

export interface Contracts {
  smardexFactory: SmardexFactory;
  smardexFactoryTest: SmardexFactoryTest;
  smardexLibraryTest: SmardexLibraryTest;
  smardexLibrary: SmardexLibrary;
  smardexToken: ERC20Permit;
  smardexTokenTest: SmardexTokenTest;
  token0: ERC20Test;
  token1: ERC20Test;
  smardexPair: SmardexPair;
  smardexPair2?: SmardexPair;
  smardexPairTest: SmardexPairTest;
  smardexRouter: SmardexRouter;
  smardexRouterTest: SmardexRouterTest;
  staking: Staking;
  WETH: WETH9;
  WETHPartner: ERC20Test;
  WETHPair: SmardexPair;
  routerEventEmitter: RouterEventEmitter;
  deflatingPair: SmardexPair;
  farming: FarmingRange | FarmingRangeL2Arbitrum;
  autoSwapper: AutoSwapper | AutoSwapperL2;
  rewardManagerTest: RewardManagerTest | RewardManagerTestL2 | RewardManagerTestL2Arbitrum;
  smardexRouterCallbackTest: CallbackTest;
  routerForPairTest: RouterForPairTest;
  fakeERC20reentrancy: FakeERC20reentrancy;
  stakingToken: ERC20Test;
  dummyStakingToken: ERC20Test;
  tether: TetherToken;
}

export interface Misc {
  startBlock: BigNumber;
  targetAddress: string;
}

export interface Signers {
  admin: SignerWithAddress;
  feeTo: SignerWithAddress;
  user: SignerWithAddress;
  user2: SignerWithAddress;
}
