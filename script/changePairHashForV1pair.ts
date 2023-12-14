import { HardhatRuntimeEnvironment } from "hardhat/types";
import { writeFile, readFile } from "fs/promises";
import { keccak256 } from "ethers/lib/utils";

export async function changePairHashForV1pair(deployment: any, _hre: HardhatRuntimeEnvironment) {
  const contractFactory = await _hre.ethers.getContractFactory("SmardexPairV1");
  const smardexLibFile = __dirname + "/../contracts/periphery/test/peripheryV2WithV1/libraries/PoolAddressV1.sol";
  console.log("🚜 -> file: changePairHashForV1pair.ts:8 -> changePairHash -> PoolAddressV1", smardexLibFile);
  try {
    const data = await readFile(smardexLibFile, "utf8");
    const newHash = eval(deployment.deployment)
      ? 'hex"b477a06204165d50e6d795c7c216306290eff5d6015f8b65bb46002a8775b548"'
      : 'hex"' + keccak256(contractFactory.bytecode).slice(2) + '"';

    const oldHash = data?.match(/hex"((?!(ff)).+)"/g)?.[0];

    if (oldHash === newHash) {
      console.log("Hash did not change, no need to replace");
      return;
    }

    console.log("🚜 -> file: changePairHashForV1pair.ts:12 -> changePairHashForV1pair -> oldHash", oldHash);
    console.log("🚜 -> file: changePairHashForV1pair.ts:11 -> changePairHashForV1pair -> newHash", newHash);

    const result = data.replace(/hex"((?!(ff)).+)"/g, newHash);

    await writeFile(smardexLibFile, result, "utf8");
  } catch (error) {
    console.error(error);
  }
}
