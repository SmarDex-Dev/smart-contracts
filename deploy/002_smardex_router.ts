import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { saveDeployment } from "./utils";

// WETH is in fact wrapped-native token
const WETH9_addresses = {
  // mainnets
  "1": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // ethereum
  "10": "0x4200000000000000000000000000000000000006", // Optimism
  "25": "0x5C7F8A570d578ED84E63fdFA7b1eE72dEae1AE23", // Chronos
  "56": "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", // bsc
  "137": "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270", // polygon
  "250": "0x94C1e8D95F3e0d53B6d808CEb084eFE1980fAa9b", // Fantom opera
  "43114": "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7", // Avalanche C-Chain
  "42161": "0xB45bc75fd9812BD0bc25042Bfed46e487cB141ed", // Arbitrum

  // testnets
  "5": "0xFa1e53C68c045589cb5BaC4B311337c9f42e2241", // goerli
  "97": "0x6d63736D09bC2826Fb584C7d3C9113A65F403344", // bsc-test
  "1337": "0x0000000000000000000000000000000000000000", // GETH localhost
  "80001": "0xD9f382B51Ed89A85171FB6A584e4940D1CaBE538", // mumbai - polygon
  "11155111": "0x6C1FE2de3150EDD0fE0991FED6dA01F33938F05B", // sepolia
};

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, getChainId } = hre;
  const { getContractAt } = hre.ethers;
  const { deploy, saveDotFile } = deployments;

  const { admin } = await getNamedAccounts();
  const factory = await deployments.get("SmardexFactory");
  const chainId = await getChainId();

  let WETH;
  if (chainId in WETH9_addresses) {
    WETH = await getContractAt("WETH9", WETH9_addresses[chainId as keyof typeof WETH9_addresses]);
    const WETHArtifact = await deployments.getArtifact("WETH9");
    await saveDeployment(
      "WETH9",
      JSON.stringify({ address: WETH.address, abi: WETHArtifact.abi }, undefined, 2),
      saveDotFile,
    );
  } else {
    WETH = await deploy("WETH9", {
      from: admin,
      args: [],
      log: true,
      autoMine: true, // speed up deployment on local network (ganache, hardhat), no effect on live networks
    });
  }

  await deploy("SmardexRouter", {
    from: admin,
    args: [factory.address, WETH.address],
    log: true,
    autoMine: true, // speed up deployment on local network (ganache, hardhat), no effect on live networks
  });
};
export default func;
func.tags = ["SmardexRouter"];
