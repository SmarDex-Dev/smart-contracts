import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { saveDeployment } from "./utils";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { getContractAt } = hre.ethers;
  const { deploy, saveDotFile } = deployments;

  const { admin } = await getNamedAccounts();

  const sdex = await deployments.get("SmardexToken");

  // SPECIFY THIS PARAMETER BEFORE DEPLOYING !!
  const startBlockStaking: number = 0;

  const rewardManager = await deploy("RewardManager", {
    from: admin,
    args: [admin, sdex.address, startBlockStaking],
    log: true,
    autoMine: true, // speed up deployment on local network (ganache, hardhat), no effect on live networks
  });

  const rewardManagerContract = await getContractAt("RewardManager", rewardManager.address);

  const stakingAddress = await rewardManagerContract.staking();
  const stakingArtifact = await deployments.getArtifact("Staking");
  await saveDeployment(
    "Staking",
    JSON.stringify({ address: stakingAddress, abi: stakingArtifact.abi }, undefined, 2),
    saveDotFile,
  );

  const farmingAddress = await rewardManagerContract.farming();
  const farmingArtifact = await deployments.getArtifact("FarmingRange");
  await saveDeployment(
    "FarmingRange",
    JSON.stringify({ address: farmingAddress, abi: farmingArtifact.abi }, undefined, 2),
    saveDotFile,
  );
};
export default func;
func.tags = ["RewardManager"];
