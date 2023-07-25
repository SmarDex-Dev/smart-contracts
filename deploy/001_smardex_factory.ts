import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { sendEtherTo } from "./utils";
import { parseEther } from "ethers/lib/utils";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy, save } = deployments;

  const { admin } = await getNamedAccounts();
  console.log("deployment address:", admin);
  const network: string = hre.network.name;

  // check if block start properly set
  if (network !== "hardhat") {
    if (network === "localhost" && admin !== "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266") {
      await sendEtherTo(parseEther("1"), admin, hre.ethers.provider);
    }

    // comment this line when done in 004_reward_manager.ts
    throw "do not forget to specify the staking farming blockStart !";
  }

  await deploy("SmardexFactory", {
    from: admin,
    args: [],
    log: true,
  });

  const smardexPairFactory = await hre.ethers.getContractFactory("SmardexPair");

  await save("SmardexPair", {
    address: hre.ethers.constants.AddressZero,
    abi: JSON.parse(smardexPairFactory.interface.format("json") as string),
  });
};

export default func;
func.tags = ["SmardexFactory"];
