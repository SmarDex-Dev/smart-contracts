import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { artifacts, Networks } from "./utils";

let rewardManagerArtifact: string = "RewardManager";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { getContractAt } = hre.ethers;
  const { deploy, save } = deployments;
  const { admin } = await getNamedAccounts();

  const sdex = await deployments.get("SmardexToken");

  // SPECIFY THIS PARAMETER BEFORE DEPLOYING !!
  const startBlockStaking: number = 0; // 0 will revert if the staking is to be deployed
  const args: string[] = [admin];
  let farmingRangeArtifact: string = "FarmingRange";
  let staking: boolean = true;

  const networkArtifacts: Networks[] = artifacts.filter(artifact => artifact.name === hre.network.name);

  if (networkArtifacts.length > 0) {
    staking = networkArtifacts[0].staking;
    rewardManagerArtifact = networkArtifacts[0].rewardManager;
    farmingRangeArtifact = networkArtifacts[0].farming;
  }

  if (staking) {
    args.push(sdex.address);
    args.push(startBlockStaking.toString());
  }

  const rewardManager = await deploy(rewardManagerArtifact, {
    from: admin,
    args,
    log: true,
  });

  const rewardManagerContract = await getContractAt(rewardManagerArtifact, rewardManager.address);

  if (staking) {
    const stakingAddress = await rewardManagerContract.staking();
    const stakingArtifact = await deployments.getArtifact("Staking");

    await save("Staking", {
      address: stakingAddress,
      abi: stakingArtifact.abi,
    });
  }

  const farmingAddress = await rewardManagerContract.farming();
  const farmingArtifact = await deployments.getArtifact(farmingRangeArtifact);

  await save(farmingRangeArtifact, {
    address: farmingAddress,
    abi: farmingArtifact.abi,
  });
};
export default func;
func.tags = [rewardManagerArtifact];
