import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { saveDeployment, sendEtherTo } from "./utils";
import { parseEther } from "ethers/lib/utils";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy, saveDotFile } = deployments;

  const { admin } = await getNamedAccounts();
  console.log("deployement address:", admin);

  if (hre.network.name !== "hardhat") {
    if (hre.network.name === "localhost" && admin !== "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266") {
      await sendEtherTo(parseEther("1"), admin, hre.ethers.provider);
    }

    // comment this line when done in 004_reward_manager.ts
    throw "do not forget to specify the staking farming blockStart ! in the file deploy/004_reward_manager.ts";
  }

  await deploy("SmardexFactory", {
    from: admin,
    args: [admin],
    log: true,
    autoMine: true, // speed up deployment on local network (ganache, hardhat), no effect on live networks
  });

  const smardexPairFactory = await hre.ethers.getContractFactory("SmardexPair");
  await saveDeployment(
    "SmardexPair",
    JSON.stringify({ abi: JSON.parse(smardexPairFactory.interface.format("json") as string) }, undefined, 2),
    saveDotFile,
  );
};
export default func;
func.tags = ["SmardexFactory"];
