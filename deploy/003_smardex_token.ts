import { parseEther } from "ethers/lib/utils";
import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { sendEtherTo, mainnets, smardexTokens } from "./utils";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, getChainId } = hre;
  const { getContractFactory } = hre.ethers;
  const { deploy, save } = deployments;

  const { admin } = await getNamedAccounts();
  const chainId: string = await getChainId();

  // to prevent useless deployment
  if (!mainnets.includes(chainId)) {
    // send 1 ether to admin if we are on localhost project
    if (hre.network.name === "localhost" && admin !== "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266") {
      await sendEtherTo(parseEther("1"), admin, hre.ethers.provider);
    }

    await deploy("SmardexToken", {
      from: admin,
      args: ["SmarDex Token", "SDEX", parseEther("10000000000")], // 10 billion
      log: true,
    });
  } else {
    const smardexToken = await getContractFactory(chainId === "1" ? "SmardexToken" : "SmardexTokenL2");

    await save("SmardexToken", {
      address: smardexTokens[chainId],
      abi: JSON.parse(smardexToken.interface.format("json") as string),
    });
  }
};
export default func;
func.tags = ["SmardexToken"];
