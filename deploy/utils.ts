import { BigNumber, Wallet } from "ethers";
import { ethers } from "hardhat";

export async function sendEtherTo(qty: BigNumber, adr: string, provider: any) {
  // create signer object
  const hardhatDefaultSigner = new Wallet(
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    provider,
  );

  // send one ether to us
  await hardhatDefaultSigner.sendTransaction({ value: qty, to: adr });
}

export function argsWethArbitrumGoerli(): string[] {
  return [
    "WETH",
    "WETH",
    "18",
    "0x6c411ad3e74de3e7bd422b94a27770f5b86c623b", // _l2Gateway
    "0xe39Ab88f8A4777030A534146A9Ca3B52bd5D43A3", // _l1Address ethereum: 0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"
  ];
}

export type Networks = {
  name: string;
  staking: boolean;
  autoswapper: string;
  rewardManager: string;
  farming: string;
};

export const artifacts: Networks[] = [
  {
    name: "ethereum",
    staking: true,
    autoswapper: "AutoSwapper",
    rewardManager: "RewardManager",
    farming: "FarmingRange",
  },

  {
    name: "goerli",
    staking: true,
    autoswapper: "AutoSwapper",
    rewardManager: "RewardManager",
    farming: "FarmingRange",
  },

  {
    name: "arbitrum",
    staking: false,
    autoswapper: "AutoSwapperL2",
    rewardManager: "RewardManagerL2Arbitrum",
    farming: "FarmingRangeL2Arbitrum",
  },

  {
    name: "goerli_arbitrum",
    staking: false,
    autoswapper: "AutoSwapperL2",
    rewardManager: "RewardManagerL2Arbitrum",
    farming: "FarmingRangeL2Arbitrum",
  },

  {
    name: "polygon",
    staking: false,
    autoswapper: "AutoSwapperL2",
    rewardManager: "RewardManagerL2",
    farming: "FarmingRange",
  },

  {
    name: "mumbai",
    staking: false,
    autoswapper: "AutoSwapperL2",
    rewardManager: "RewardManagerL2",
    farming: "FarmingRange",
  },

  {
    name: "bsc",
    staking: false,
    autoswapper: "AutoSwapperL2",
    rewardManager: "RewardManagerL2",
    farming: "FarmingRange",
  },

  {
    name: "bsc_testnet",
    staking: false,
    autoswapper: "AutoSwapperL2",
    rewardManager: "RewardManagerL2",
    farming: "FarmingRange",
  },
];

export async function latestBlockNumber(): Promise<number> {
  return (await ethers.provider.getBlock("latest")).number;
}

// WETH is in fact wrapped-native token
export const WETH9_addresses = {
  // mainnets
  "1": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // ethereum
  "10": "0x4200000000000000000000000000000000000006", // Optimism
  "25": "0x5C7F8A570d578ED84E63fdFA7b1eE72dEae1AE23", // Chronos
  "56": "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", // bsc
  "137": "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270", // polygon
  "250": "0x94C1e8D95F3e0d53B6d808CEb084eFE1980fAa9b", // Fantom opera
  "43114": "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7", // Avalanche C-Chain
  "42161": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1", // Arbitrum

  // testnets
  "5": "0xFa1e53C68c045589cb5BaC4B311337c9f42e2241", // goerli
  "97": "0x6d63736D09bC2826Fb584C7d3C9113A65F403344", // bsc-test
  // "1337": "0x0000000000000000000000000000000000000000", // GETH localhost
  "80001": "0xD9f382B51Ed89A85171FB6A584e4940D1CaBE538", // mumbai - polygon
  "421613": "0xe39Ab88f8A4777030A534146A9Ca3B52bd5D43A3", // arbitrum goerli
  "11155111": "0x6C1FE2de3150EDD0fE0991FED6dA01F33938F05B", // sepolia
};

export const dedicated_WETH9_mainnet = {
  "1": "WETH9", // ethereum
  "56": "WBNB", // bsc
  "137": "WMATIC", // polygon
  "42161": "aeWETH", // Arbitrum
};

export const dedicated_WETH9_testnet = {
  // testnets
  "5": "WETH9GOERLI", // goerli
  "1337": "WETH9GOERLI", // hardhat
  "97": "WBNB", // bsc-test
  "80001": "WMATIC", // mumbai - polygon
  "421613": "aeWETH", // arbitrum goerli
};

type Token = {
  name: string;
  symbol: string;
  decimals: string;
  artifact: string;
  address: string;
};

export function getTestTokenArgs(token: Token): string[] {
  return [token.name, token.symbol, token.decimals];
}

export function getTetherTokenArgs(): string[] {
  return [ethers.utils.parseEther("1000000000000000000").toString(), "USDT", "USDT", "6"];
}

export const wethAtifacts = ["WETH9", "WETH9GOERLI", "WBNB", "aeWETH", "WMATIC"];

export const chainsData = [
  {
    network: "goerli",
    tokens: [
      {
        name: "SDEX",
        symbol: "SDEX",
        decimals: "18",
        artifact: "SmardexToken",
        address: "",
      },
      {
        name: "WETH",
        symbol: "WETH",
        decimals: "18",
        artifact: "WETH9GOERLI",
        address: "",
      },
      {
        name: "USDT",
        symbol: "USDT",
        decimals: "6",
        artifact: "TetherToken",
        address: "",
      },
      {
        name: "WBTC",
        symbol: "WBTC",
        decimals: "8",
        artifact: "TestToken",
        address: "",
      },
    ],
    pairs: [
      {
        tokenA: "SDEX",
        amountA: "100000000000000000000",
        tokenB: "WETH",
        amountB: "265249807852173",
        address: "",
      },
      {
        tokenA: "SDEX",
        amountA: "18868240000000000000000000",
        tokenB: "USDT",
        amountB: "100000000000",
        address: "",
      },
      {
        tokenA: "WETH",
        amountA: "161915708414432",
        tokenB: "WBTC",
        amountB: "16191570",
        address: "",
      },
    ],
  },
  {
    network: "bsc_testnet",
    tokens: [
      {
        name: "SDEX",
        symbol: "SDEX",
        decimals: "18",
        artifact: "SmardexToken",
        address: "",
      },
      {
        name: "WBNB",
        symbol: "WBNB",
        decimals: "18",
        artifact: "WBNB",
        address: "",
      },
      {
        name: "USDT",
        symbol: "USDT",
        decimals: "18",
        artifact: "TestToken",
        address: "",
      },
      {
        name: "BTCB",
        symbol: "BTCB",
        decimals: "18",
        artifact: "TestToken",
        address: "",
      },
      {
        name: "ETH",
        symbol: "ETH",
        decimals: "18",
        artifact: "TestToken",
        address: "",
      },
    ],
    pairs: [
      {
        tokenA: "SDEX",
        amountA: "18868240000000000000000000",
        tokenB: "USDT",
        amountB: "100000000000000000000000",
        address: "",
      },
      {
        tokenA: "WBNB",
        amountA: "60000000000000",
        tokenB: "USDT",
        amountB: "14300400000000000",
        address: "",
      },
      {
        tokenA: "SDEX",
        amountA: "18868240000000000000000000",
        tokenB: "BTCB",
        amountB: "3262300000000000000",
        address: "",
      },
      {
        tokenA: "SDEX",
        amountA: "100000000000000000000000",
        tokenB: "ETH",
        amountB: "265249807852173000",
        address: "",
      },
    ],
  },
  {
    network: "goerli_arbitrum",
    tokens: [
      {
        name: "SDEX",
        symbol: "SDEX",
        decimals: "18",
        artifact: "SmardexToken",
        address: "",
      },
      {
        name: "WETH",
        symbol: "WETH",
        decimals: "18",
        artifact: "aeWETH",
        address: "",
      },
      {
        name: "USDC",
        symbol: "USDC",
        decimals: "6",
        artifact: "TestToken",
        address: "",
      },
      {
        name: "WBTC",
        symbol: "WBTC",
        decimals: "8",
        artifact: "TestToken",
        address: "",
      },
      {
        name: "ARB",
        symbol: "ARB",
        decimals: "18",
        artifact: "TestToken",
        address: "",
      },
    ],
    pairs: [
      {
        tokenA: "SDEX",
        amountA: "18868240000000000000000000",
        tokenB: "USDC",
        amountB: "100000000000",
        address: "",
      },
      {
        tokenA: "SDEX",
        amountA: "100000000000000000000",
        tokenB: "WETH",
        amountB: "265249807852173",
        address: "",
      },

      {
        tokenA: "SDEX",
        amountA: "18868240000000000000000000",
        tokenB: "WBTC",
        amountB: "326230000",
        address: "",
      },
      {
        tokenA: "ARB",
        amountA: "111000000000000000000000",
        tokenB: "USDC",
        amountB: "100000000000",
        address: "",
      },
    ],
  },
  {
    network: "mumbai",
    tokens: [
      {
        name: "SDEX",
        symbol: "SDEX",
        decimals: "18",
        artifact: "SmardexToken",
        address: "",
      },
      {
        name: "WMATIC",
        symbol: "WMATIC",
        decimals: "18",
        artifact: "WMATIC",
        address: "",
      },
      {
        name: "USDC",
        symbol: "USDC",
        decimals: "6",
        artifact: "TestToken",
        address: "",
      },
      {
        name: "WBTC",
        symbol: "WBTC",
        decimals: "8",
        artifact: "TestToken",
        address: "",
      },
      {
        name: "WETH",
        symbol: "WETH",
        decimals: "18",
        artifact: "TestToken",
        address: "",
      },
    ],
    pairs: [
      {
        tokenA: "SDEX",
        amountA: "18868240000000000000000000",
        tokenB: "USDC",
        amountB: "100000000000",
        address: "",
      },
      {
        tokenA: "SDEX",
        amountA: "100000000000000000000000",
        tokenB: "WETH",
        amountB: "265249807852173000",
        address: "",
      },
      {
        tokenA: "SDEX",
        amountA: "18868240000000000000000000",
        tokenB: "WBTC",
        amountB: "326230000",
        address: "",
      },
      {
        tokenA: "WMATIC",
        amountA: "151355994455448",
        tokenB: "USDC",
        amountB: "100",
        address: "",
      },
    ],
  },
];

// help parse mainnet deployments by chain id
export const mainnets: string[] = [
  "1", // ethereum
  "42161", // arbitrum
  "56", // bsc
  "137", // polygon
];

export const smardexTokens = {
  [mainnets[0]]: "0x5DE8ab7E27f6E7A1fFf3E5B337584Aa43961BEeF", // ethereum
  [mainnets[1]]: "0xabD587f2607542723b17f14d00d99b987C29b074", // arbitrum
  [mainnets[2]]: "0xFdc66A08B0d0Dc44c17bbd471B88f49F50CdD20F", // bsc
  [mainnets[3]]: "0x6899fAcE15c14348E1759371049ab64A3a06bFA6", // polygon
};
export default function () {
  console.log("DONE");
}
