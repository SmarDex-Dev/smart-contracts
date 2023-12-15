import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { sendEtherTo, abiPaths } from "./utils";
import { parseEther } from "ethers/lib/utils";
import { isV1Pair } from "./params";

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
  }

  await deploy("SmardexFactory", {
    from: admin,
    args: [],
    log: true,
  });

  // pair artifact
  const pairArtifact = isV1Pair ? "SmardexPairV1" : "SmardexPair";

  await save(pairArtifact, {
    address: hre.ethers.constants.AddressZero,
    abi: (await import(abiPaths[pairArtifact as keyof typeof abiPaths])).abi,
  });
};

export default func;
func.tags = ["SmardexFactory"];
