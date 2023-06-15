import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { getContractAt } = hre.ethers;

  const { admin } = await getNamedAccounts();

  const factory = await deployments.get("SmardexFactory");
  const sdex = await deployments.get("SmardexToken");
  const rewardManager = await deployments.get("RewardManager");

  const rewardManagerContract = await getContractAt("RewardManager", rewardManager.address);
  const stakingAddress = await rewardManagerContract.staking();
  const famingAddress = await rewardManagerContract.farming();

  console.log("Staking deployed in", stakingAddress);
  console.log("Farming deployed in", famingAddress);

  const autoSwapper = await deploy("AutoSwapper", {
    from: admin,
    args: [factory.address, sdex.address, stakingAddress],
    log: true,
    autoMine: true, // speed up deployment on local network (ganache, hardhat), no effect on live networks
  });

  const factoryContract = await getContractAt("SmardexFactory", factory.address);
  await factoryContract.setFeeTo(autoSwapper.address);
};
export default func;
func.tags = ["AutoSwapper"];
