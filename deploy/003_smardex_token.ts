import { parseEther } from "ethers/lib/utils";
import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { sendEtherTo } from "./utils";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;

  const { admin } = await getNamedAccounts();

  // send 1 ether to admin if we are on localhost project
  if (hre.network.name === "localhost" && admin !== "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266") {
    await sendEtherTo(parseEther("1"), admin, hre.ethers.provider);
  }

  await deploy("SmardexToken", {
    from: admin,
    args: ["SmarDex Token", "SDEX", parseEther("10000000000")], // 10 billion
    log: true,
    autoMine: true, // speed up deployment on local network (ganache, hardhat), no effect on live networks
  });
};
export default func;
func.tags = ["SmardexToken"];
