import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { artifacts, Networks, abiPaths } from "./utils";
import { startBlockStaking } from "./params";

let rewardManagerArtifact: string = "RewardManager";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { getContractAt } = hre.ethers;
  const { deploy, save } = deployments;
  const { admin } = await getNamedAccounts();

  const sdex = await deployments.get("SmardexToken");

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
    args.push(startBlockStaking().toString());
  }

  const rewardManager = await deploy(rewardManagerArtifact, {
    from: admin,
    args,
    log: true,
    waitConfirmations: 2,
  });

  const rewardManagerContract = await getContractAt(rewardManagerArtifact, rewardManager.address);

  if (staking) {
    const stakingAddress = await rewardManagerContract.staking();

    await save("Staking", {
      address: stakingAddress,
      abi: (await import(abiPaths["Staking" as keyof typeof abiPaths])).abi,
    });
  }

  const farmingAddress = await rewardManagerContract.farming();

  await save(farmingRangeArtifact, {
    address: farmingAddress,
    abi: (await import(abiPaths[farmingRangeArtifact as keyof typeof abiPaths])).abi,
  });
};
export default func;
func.tags = ["RewardManager"];
