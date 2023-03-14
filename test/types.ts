import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import {
  AutoSwapper,
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
  Staking,
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
  smardexToken: ERC20Permit;
  token0: ERC20Test;
  token1: ERC20Test;
  smardexPair: SmardexPair;
  smardexPair2?: SmardexPair;
  smardexPairTest: SmardexPairTest;
  smardexRouter: SmardexRouter;
  smardexRouterTest: SmardexRouterTest;
  WETH: WETH9;
  WETHPartner: ERC20Test;
  WETHPair: SmardexPair;
  routerEventEmitter: RouterEventEmitter;
  deflatingPair: SmardexPair;
  staking: Staking;
  farming: FarmingRange;
  checkBlockTest: CheckBlockTest;
  autoSwapper: AutoSwapper;
  rewardManager: RewardManager;
  smardexRouterCallbackTest: CallbackTest;
  routerForPairTest: RouterForPairTest;
  fakeERC20reentrancy: FakeERC20reentrancy;
}

export interface IFarming {
  token0: ERC20Test;
  token1: ERC20Test;
  WETH: WETH9;
  WETHPartner: ERC20Test;
  factory: SmardexFactory;
  smardexRouter: SmardexRouter;
  pair: SmardexPair;
  WETHPair: SmardexPair;
  routerEventEmitter: RouterEventEmitter;
  autoSwapper: AutoSwapper;
  smardexToken: ERC20Test;
}

export interface Misc {
  startBlock: BigNumber;
}

export interface Signers {
  admin: SignerWithAddress;
  feeTo: SignerWithAddress;
  user: SignerWithAddress;
}
