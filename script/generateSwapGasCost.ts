import { HardhatRuntimeEnvironment } from "hardhat/types";
import { reset, setBalance } from "@nomicfoundation/hardhat-network-helpers";
import { ERC20Test, SmardexRouter } from "../typechain";
import { writeFile } from "node:fs/promises";

const MAX_HOPS = 6;

const networks = {
  ethereum: process.env.URL_ETH_MAINNET || "https://ethereum.publicnode.com/",
  polygon: process.env.URL_POLYGON || "https://polygon-rpc.com/",
  bsc: process.env.URL_BSC || "https://bsc-dataseed.binance.org/",
  arbitrum: process.env.URL_ARBITRUM || "https://arb1.arbitrum.io/rpc",
  base: process.env.URL_BASE || "https://mainnet.base.org",
};

type GasData = {
  swapETHForExactTokens: number;
  swapExactETHForTokens: number;
  swapExactTokensForETH: number;
  swapExactTokensForTokens: number;
  swapTokensForExactETH: number;
  swapTokensForExactTokens: number;
};

type NetworkGasData = {
  hop: GasData;
  nextHop: GasData;
};

type Output = {
  [key in keyof typeof networks]?: NetworkGasData;
};

export async function generateSwapGasCost(_args: undefined, hre: HardhatRuntimeEnvironment) {
  const { ethers } = hre;
  const signers = await ethers.getSigners();
  const out: Output = {};
  for (const [network, url] of Object.entries(networks)) {
    await reset(url);
    console.log("forked", network, "at height", await ethers.provider.getBlockNumber());
    await setBalance(signers[0].address, "0x52B7D2DCC80CD2E4000000");
    const routerAddress = await getDeployedAddress(network, "SmardexRouter");
    const router = await ethers.getContractAt("SmardexRouter", routerAddress);

    const tokens = await deployTokens(router, hre);

    const hopsData = await Promise.all([...Array(MAX_HOPS).keys()].map(i => getGasData(router, i + 1, tokens, hre)));
    const avgHop: GasData = {
      swapETHForExactTokens: 0,
      swapExactETHForTokens: 0,
      swapExactTokensForETH: 0,
      swapExactTokensForTokens: 0,
      swapTokensForExactETH: 0,
      swapTokensForExactTokens: 0,
    };
    for (let i = 1; i <= hopsData.length - 1; i++) {
      for (const key of Object.keys(hopsData[i]) as (keyof GasData)[]) {
        avgHop[key] = avgHop[key] + (hopsData[i][key] - hopsData[i - 1][key]);
      }
    }
    for (const key of Object.keys(avgHop) as (keyof GasData)[]) {
      avgHop[key] = Math.round(avgHop[key] / (hopsData.length - 1));
    }
    out[network as keyof typeof networks] = {
      hop: hopsData[0],
      nextHop: avgHop,
    };
  }
  await writeFile("cache/gas_usage.json", JSON.stringify(out));
  console.log("Data written to file at cache/gas_usage.json");
}

async function getGasData(
  router: SmardexRouter,
  hops: number,
  tokens: ERC20Test[],
  hre: HardhatRuntimeEnvironment,
): Promise<GasData> {
  const wethAddress = await router.WETH();
  const tokensSlice = tokens.slice(0, hops).map(t => t.address);
  const allTokens = tokens.slice(0, hops + 1).map(t => t.address);
  return {
    swapETHForExactTokens: (await getGasUsedAverage(router, [wethAddress, ...tokensSlice], false, hre)).toNumber(),
    swapExactETHForTokens: (await getGasUsedAverage(router, [wethAddress, ...tokensSlice], true, hre)).toNumber(),
    swapExactTokensForETH: (await getGasUsedAverage(router, [...tokensSlice, wethAddress], true, hre)).toNumber(),
    swapExactTokensForTokens: (await getGasUsedAverage(router, allTokens, true, hre)).toNumber(),
    swapTokensForExactETH: (await getGasUsedAverage(router, [...tokensSlice, wethAddress], false, hre)).toNumber(),
    swapTokensForExactTokens: (await getGasUsedAverage(router, allTokens, false, hre)).toNumber(),
  };
}

async function getGasUsedAverage(
  router: SmardexRouter,
  path: string[],
  exactInput: boolean,
  hre: HardhatRuntimeEnvironment,
) {
  // first run is discarded because storage needs to get initialized
  await getGasUsed(router, path, exactInput, hre); // ignored
  return getGasUsed(router, path, exactInput, hre);
}

async function getGasUsed(router: SmardexRouter, path: string[], exactInput: boolean, hre: HardhatRuntimeEnvironment) {
  const { ethers } = hre;
  const { MaxUint256 } = ethers.constants;
  const signers = await ethers.getSigners();
  const wethAddress = await router.WETH();
  let tx;
  if (exactInput) {
    if (path[0] === wethAddress) {
      tx = await router.swapExactETHForTokens(0, path, signers[0].address, MaxUint256, { value: randomAmount(hre) });
    } else if (path[path.length - 1] === wethAddress) {
      tx = await router.swapExactTokensForETH(randomAmount(hre), 0, path, signers[0].address, MaxUint256);
    } else {
      tx = await router.swapExactTokensForTokens(randomAmount(hre), 0, path, signers[0].address, MaxUint256);
    }
  } else {
    if (path[0] === wethAddress) {
      const amount = randomAmount(hre);
      tx = await router.swapETHForExactTokens(amount, path, signers[0].address, MaxUint256, {
        value: amount.mul(2),
      });
    } else if (path[path.length - 1] === wethAddress) {
      tx = await router.swapTokensForExactETH(randomAmount(hre), MaxUint256, path, signers[0].address, MaxUint256);
    } else {
      tx = await router.swapTokensForExactTokens(randomAmount(hre), MaxUint256, path, signers[0].address, MaxUint256);
    }
  }
  return (await tx.wait()).gasUsed;
}

async function deployTokens(router: SmardexRouter, hre: HardhatRuntimeEnvironment) {
  const { ethers } = hre;
  const { MaxUint256 } = ethers.constants;
  const { parseEther } = ethers.utils;
  const signers = await ethers.getSigners();
  const tokenFactory = await hre.ethers.getContractFactory("ERC20Test");
  const tokens = await Promise.all(
    [...Array(MAX_HOPS + 1).keys()].map(() => {
      return tokenFactory.deploy(MaxUint256);
    }),
  );
  await Promise.all(tokens.map(token => token.deployed()));
  await Promise.all(tokens.map(token => token.approve(router.address, MaxUint256)));
  await Promise.all(
    tokens.map(token =>
      router.addLiquidityETH(
        {
          token: token.address,
          amountTokenDesired: parseEther("100000"),
          amountTokenMin: 0,
          amountETHMin: 0,
          fictiveReserveETH: 0,
          fictiveReserveTokenMin: 0,
          fictiveReserveTokenMax: 0,
        },
        signers[0].address,
        MaxUint256,
        {
          value: parseEther("100000"),
        },
      ),
    ),
  );
  await Promise.all(
    Array.from(slidingWindow(tokens, 2)).map(([tokenA, tokenB]) => {
      return router.addLiquidity(
        {
          tokenA: tokenA.address,
          tokenB: tokenB.address,
          amountADesired: parseEther("100000"),
          amountBDesired: parseEther("100000"),
          amountAMin: 0,
          amountBMin: 0,
          fictiveReserveB: 0,
          fictiveReserveAMin: 0,
          fictiveReserveAMax: 0,
        },
        signers[0].address,
        MaxUint256,
      );
    }),
  );
  return tokens;
}

async function getDeployedAddress(network: string, contractName: string): Promise<string> {
  try {
    return (await import(`../deployments/${network}/${contractName}.json`)).address;
  } catch (e) {
    throw new Error(`Error while fetching addresses, maybe you didn't deployed the ${contractName} on ${network} ?`);
  }
}

function randomAmount(hre: HardhatRuntimeEnvironment) {
  return hre.ethers.utils.parseEther((Math.floor(Math.random() * 10) + 1).toString());
}

function* slidingWindow(inputArray: any[], size: number) {
  for (let index = 0; index + size <= inputArray.length; index++) {
    yield inputArray.slice(index, index + size);
  }
}
