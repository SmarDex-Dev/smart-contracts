import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { artifacts, Networks } from "./utils";

let autoSwapperArtifact: string = "AutoSwapper";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { getContractAt } = hre.ethers;
  const { admin } = await getNamedAccounts();
  const chainId: string = await hre.getChainId();
  const factory = await deployments.get("SmardexFactory");
  const sdex = await deployments.get("SmardexToken");
  const router = await deployments.get("SmardexRouter");

  let staking: boolean = true;
  let rewardManagerArtifact: string = "RewardManager";
  let stakingAddress: string = "";
  const args: string[] = [factory.address, sdex.address];

  const networkArtifacts: Networks[] = artifacts.filter(artifact => artifact.name === hre.network.name);

  if (networkArtifacts.length > 0) {
    staking = networkArtifacts[0].staking;
    rewardManagerArtifact = networkArtifacts[0].rewardManager;
    autoSwapperArtifact = networkArtifacts[0].autoswapper;
  }

  const rewardManager = await deployments.get(rewardManagerArtifact);
  const rewardManagerContract = await getContractAt(rewardManagerArtifact, rewardManager.address);

  if (staking) {
    stakingAddress = await rewardManagerContract.staking();
    console.log("Staking deployed in", stakingAddress);
    args.push(stakingAddress);
  }

  args.push(router.address);

  const farmingAddress: string = await rewardManagerContract.farming();
  console.log("Farming deployed in", farmingAddress);

  const autoSwapper = await deploy(autoSwapperArtifact, {
    from: admin,
    args,
    log: true,
  });

  // prevent seeFeeToo without ownership on ethereum mainnet
  if (chainId !== "1") {
    const factoryContract = await getContractAt("SmardexFactory", factory.address);
    await (await factoryContract.setFeeTo(autoSwapper.address)).wait();
  }
};
export default func;
func.tags = ["AutoSwapper"];
