import "hardhat-deploy";
import "hardhat-tracer";
import "@nomicfoundation/hardhat-toolbox";

import { resolve } from "path";
import { config as dotenvConfig } from "dotenv";
import { HardhatUserConfig, task } from "hardhat/config";

// Tasks
import { changePairHash } from "./script/changePairHash";
import { changePairHashForV1pair } from "./script/changePairHashForV1pair";
import { generateSwapGasCost } from "./script/generateSwapGasCost";
import { switchPairHashFunctionCoverage } from "./script/switchPairHashFunctionCoverage";

dotenvConfig({ path: resolve(__dirname, "./.env") });
const mnemonic: string | undefined = process.env.MNEMONIC;
const privateKey: string | undefined = process.env.PRIVATE_KEY;

if (mnemonic === undefined && !privateKey) {
  throw '\nerror, mnemonic or private key not found, maybe you forgot to add a ".env" file ?\n\n';
}

task("changehash", "change the hash of SmardexPair in library for pure getter", changePairHash);
task(
  "changehashforv1",
  "change the hash of SmardexPairV1 in library for pure getter",
  changePairHashForV1pair,
).addParam("deployment", "is it for deployment");

task("switchhash", "switch the function to use for pair hash", switchPairHashFunctionCoverage);
task("generateSwapGasCost", "Generate gas cost for pair by every configuration possible", generateSwapGasCost);

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.17",
        settings: {
          metadata: {
            // Not including the metadata hash
            // https://github.com/paulrberg/hardhat-template/issues/31
            bytecodeHash: "none",
          },
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.6.11",
        settings: {
          optimizer: {
            enabled: false,
            runs: 200,
          },
        },
      },
      {
        version: "0.6.6",
        settings: {
          optimizer: {
            enabled: false,
            runs: 200,
          },
        },
      },
      {
        version: "0.4.18",
        settings: {
          optimizer: {
            enabled: false,
            runs: 200,
          },
        },
      },
      {
        version: "0.4.17",
        settings: {
          optimizer: {
            enabled: false,
            runs: 200,
          },
        },
      },
    ],
  },
  namedAccounts: {
    admin: 0,
  },
  networks: {
    hardhat: {
      live: false,
      saveDeployments: true,
      tags: ["test"],
      accounts: {
        accountsBalance: "20000000000000000000000",
      },
      allowUnlimitedContractSize: true,
      chainId: 1337,
      forking: process.env.FORKING_URL
        ? {
            url: process.env.FORKING_URL,
            blockNumber: process.env.FORKING_BLOCK_NUMBER ? Number(process.env.FORKING_BLOCK_NUMBER) : undefined,
          }
        : undefined,

      mining: {
        mempool: {
          order: "fifo",
        },
      },
    },
    tenderly: {
      chainId: 1,
      url: "",
    },
    ethereum: {
      url: process.env.URL_ETH_MAINNET || "",
      accounts: mnemonic ? { mnemonic } : [privateKey || ""],
    },
    goerli: {
      url: process.env.URL_GOERLI || "",
      accounts: mnemonic ? { mnemonic } : [privateKey || ""],
    },
    arbitrum: {
      url: process.env.URL_ARBITRUM || "",
      accounts: mnemonic ? { mnemonic } : [privateKey || ""],
    },
    goerli_arbitrum: {
      url: process.env.URL_GOERLI_ARBITRUM || "",
      accounts: mnemonic ? { mnemonic } : [privateKey || ""],
    },
    polygon: {
      url: process.env.URL_POLYGON || "",
      accounts: mnemonic ? { mnemonic } : [privateKey || ""],
    },
    mumbai: {
      url: process.env.URL_MUMBAI || "",
      accounts: mnemonic ? { mnemonic } : [privateKey || ""],
    },
    bsc: {
      url: process.env.URL_BSC || "",
      accounts: mnemonic ? { mnemonic } : [privateKey || ""],
    },
    bsc_testnet: {
      url: process.env.URL_BSC_TESTNET || "",
      accounts: mnemonic ? { mnemonic } : [privateKey || ""],
    },
    base: {
      url: process.env.URL_BASE || "",
      accounts: mnemonic ? { mnemonic } : [privateKey || ""],
    },
    base_testnet: {
      url: process.env.URL_BASE_TESTNET || "",
      accounts: mnemonic ? { mnemonic } : [privateKey || ""],
    },
    localhost: {
      url: "http://0.0.0.0:8545",
      accounts: mnemonic ? { mnemonic } : [privateKey || ""],
    },
  },
  gasReporter: {
    enabled: !!JSON.parse(String(process.env.REPORT_GAS || false).toLowerCase()),
    currency: "USD",
    gasPrice: process.env.GAS_PRICE ? Number(process.env.GAS_PRICE) : undefined,
    coinmarketcap: process.env.COINMARKETCAP_API_KEY || "",
    gasPriceApi: process.env.ETHERSCAN_API_KEY || "",
    src: "./contracts",
  },
  paths: {
    artifacts: "./artifacts",
    deploy: "./deploy",
    deployments: "./deployments",
    cache: "./cache",
    sources: "./contracts",
    tests: "./test",
  },
  typechain: {
    outDir: "typechain",
    target: "ethers-v5",
  },
  etherscan: {
    apiKey: {
      mainnet: process.env.ETHERSCAN_API_KEY || "",
      goerli: process.env.ETHERSCAN_API_KEY || "",
      polygon: process.env.POLYGONSCAN_API_KEY || "",
      bsc: process.env.BSCSCAN_API_KEY || "",
      arbitrumOne: process.env.ARBISCAN_API_KEY || "",
      base: process.env.BASESCAN_API_KEY || "",
    },
    customChains: [
      {
        network: "base",
        chainId: 8453,
        urls: {
          apiURL: "https://api.basescan.org/api",
          browserURL: "https://basescan.org",
        },
      },
    ],
  },
  mocha: {
    timeout: 100000000,
  },
};

export default config;
