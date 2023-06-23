import "@nomicfoundation/hardhat-toolbox";
import "hardhat-deploy";

import { changePairHash } from "./script/changePairHash";

import { resolve } from "path";
import { config as dotenvConfig } from "dotenv";
import { HardhatUserConfig, task, types } from "hardhat/config";
import { switchPairHashFunctionCoverage } from "./script/switchPairHashFunctionCoverage";

dotenvConfig({ path: resolve(__dirname, "./.env") });
const mnemonic: string | undefined = process.env.MNEMONIC;
const privateKey: string | undefined = process.env.PRIVATE_KEY;

if (mnemonic === undefined && !privateKey) {
  throw '\nerror, mnemonic or private key not found, maybe you forgot to add a ".env" file ?\n\n';
}

task("changehash", "change the hash of SmardexPair in library for pure getter", changePairHash);
task("switchhash", "switch the function to use for pair hash", switchPairHashFunctionCoverage);

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
            runs: 999999,
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
    eth_mainnet: {
      url: process.env.URL_ETH_MAINNET || "",
      accounts: mnemonic ? { mnemonic } : [privateKey || ""],
    },
    goerli: {
      url: process.env.URL_GOERLI || "",
      accounts: mnemonic ? { mnemonic } : [privateKey || ""],
    },
    mumbai: {
      url: process.env.URL_MUMBAI || "",
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
      goerli: process.env.ETHERSCAN_API_KEY || "",
    },
  },
};

export default config;
