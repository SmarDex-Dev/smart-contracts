import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { artifacts, Networks, abiPaths } from "./utils";

let rewardManagerArtifact: string = "RewardManagerWithdrawable";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { getContractAt } = hre.ethers;
  const { deploy, save } = deployments;
  const { admin } = await getNamedAccounts();

  const args: string[] = [admin];
  let farmingRangeArtifact: string = "FarmingRange";

  const networkArtifacts: Networks[] = artifacts.filter(artifact => artifact.name === hre.network.name);

  if (networkArtifacts.length > 0) {
    rewardManagerArtifact = networkArtifacts[0].rewardManagerWithdrawable;
    farmingRangeArtifact = networkArtifacts[0].farming;
  }

  const rewardManager = await deploy(rewardManagerArtifact, {
    from: admin,
    args,
    log: true,
    waitConfirmations: 2,
  });

  const rewardManagerContract = await getContractAt(rewardManagerArtifact, rewardManager.address);

  const farmingAddress = await rewardManagerContract.farming();

  await save(farmingRangeArtifact + "Withdrawable", {
    address: farmingAddress,
    abi: (await import(abiPaths[farmingRangeArtifact as keyof typeof abiPaths])).abi,
  });
};
export default func;
func.tags = ["RewardManagerWithdrawable"];
