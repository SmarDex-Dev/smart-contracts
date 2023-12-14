import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import {
  AutoSwapper,
  AutoSwapperL2,
  CallbackTest,
  CallbackTestV2,
  CheckBlockTest,
  ERC20Permit,
  ERC20Test,
  FakeERC20reentrancy,
  FakeERC20reentrancyV2,
  FarmingRange,
  FarmingRangeL2Arbitrum,
  RewardManagerTest,
  RewardManagerTestL2,
  RewardManagerTestL2Arbitrum,
  RouterEventEmitter,
  RouterForPairTest,
  RouterForPairTestV2,
  SmardexFactory,
  SmardexFactoryV1,
  SmardexFactoryTest,
  SmardexLibraryTest,
  SmardexLibrary,
  SmardexPair,
  SmardexPairV1,
  SmardexPairTest,
  SmardexPairTestV1,
  SmardexRouter,
  SmardexRouterV2,
  SmardexRouterTest,
  SmardexTokenTest,
  Staking,
  TetherToken,
  WETH9,
  SmardexLibraryTestV1,
  ERC20Fluid,
} from "../typechain";
import { BigNumber } from "ethers";
import { unitFixtureFarmingRange } from "./fixtures";

declare module "mocha" {
  export interface Context {
    contracts: Contracts;
    signers: Signers;
    farming: Awaited<ReturnType<typeof unitFixtureFarmingRange>>;
  }
}

export interface Contracts {
  smardexFactoryV1: SmardexFactoryV1;
  smardexFactory: SmardexFactory;
  smardexFactoryTest: SmardexFactoryTest;
  smardexLibraryTest: SmardexLibraryTest | SmardexLibraryTestV1;
  smardexLibrary: SmardexLibrary;
  smardexToken: ERC20Permit;
  smardexTokenTest: SmardexTokenTest;
  token0: ERC20Test;
  token1: ERC20Test;
  smardexPair: SmardexPair | SmardexPairV1;
  smardexPairTest: SmardexPairTest | SmardexPairTestV1;
  smardexRouter: SmardexRouter;
  smardexRouterV2: SmardexRouterV2;
  smardexRouterTest: SmardexRouterTest;
  staking: Staking;
  WETH: WETH9;
  WETHPartner: ERC20Test;
  WETHPair: SmardexPair | SmardexPairV1;
  routerEventEmitter: RouterEventEmitter;
  deflatingPair: SmardexPair;
  farming: FarmingRange | FarmingRangeL2Arbitrum;
  autoSwapper: AutoSwapper | AutoSwapperL2;
  rewardManagerTest: RewardManagerTest | RewardManagerTestL2 | RewardManagerTestL2Arbitrum;
  smardexRouterCallbackTest: CallbackTest | CallbackTestV2;
  routerForPairTest: RouterForPairTest | RouterForPairTestV2;
  fakeERC20reentrancy: FakeERC20reentrancy | FakeERC20reentrancyV2;
  stakingToken: ERC20Test;
  dummyStakingToken: ERC20Test;
  tether: TetherToken;
  checkBlockTest: CheckBlockTest;
  fluidToken0: ERC20Fluid;
  fluidToken1: ERC20Fluid;
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
