import { DeployFunction, DeployResult, DeployOptions } from "hardhat-deploy/types";
import { Contract } from "ethers";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import {
  WETH9_addresses,
  dedicated_WETH9_mainnet,
  dedicated_WETH9_testnet,
  argsWethArbitrumGoerli,
  updateHashV1,
  abiPaths,
} from "./utils";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, getChainId } = hre;
  const { getContractAt } = hre.ethers;
  const { deploy, save } = deployments;
  const { admin } = await getNamedAccounts();
  const chainId = await getChainId();
  let WETH: DeployResult | Contract;
  let wethArtifact: string = "WETH9GOERLI";

  const factoryArtifact: string = "SmardexFactory";
  const factory = await deployments.get(factoryArtifact);

  // WETH settings
  const dedicated_WETH9 = {
    ...dedicated_WETH9_mainnet,
    ...dedicated_WETH9_testnet,
  };

  if (chainId in dedicated_WETH9) {
    wethArtifact = dedicated_WETH9[chainId as keyof typeof dedicated_WETH9_testnet];
  }

  // weth should be testnet or unregistered
  if (chainId in dedicated_WETH9_testnet || !(chainId in WETH9_addresses)) {
    // weth deploy and save
    WETH = await deploy(wethArtifact, {
      from: admin,
      args: [],
      log: true,
      proxy:
        wethArtifact === "aeWETH"
          ? {
              owner: admin,
              proxyContract: "OpenZeppelinTransparentProxy",
              execute: {
                methodName: "initialize",
                args: argsWethArbitrumGoerli(),
              },
            }
          : false,
    });
  } else {
    // weth save only
    WETH = await getContractAt(wethArtifact, WETH9_addresses[chainId as keyof typeof WETH9_addresses]);

    await save(wethArtifact, {
      address: WETH.address,
      abi: (await import(abiPaths[wethArtifact as keyof typeof abiPaths])).abi,
    });
  }

  const isV1Pair = await updateHashV1(hre);
  const routerArtifact: string = isV1Pair ? "SmardexRouterV2" : "SmardexRouter";

  // Current SmardexRouter
  let options: DeployOptions = {
    from: admin,
    args: [factory.address, WETH.address],
    log: true,
  };

  // SmardexRouter deployment
  // will come from precompiled
  // bytecode compliant with Factory V1
  if (chainId === "1" && isV1Pair) {
    options = {
      ...options,
      args: [factory.address, WETH9_addresses["1"]],
    };
  }

  await deploy(routerArtifact, options);
};
export default func;
func.tags = ["SmardexRouter"];
