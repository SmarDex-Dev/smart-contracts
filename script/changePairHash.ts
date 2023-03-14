import { HardhatRuntimeEnvironment } from "hardhat/types";
import { writeFile, readFile } from "fs/promises";
import { keccak256 } from "ethers/lib/utils";

export async function changePairHash(_args: undefined, _hre: HardhatRuntimeEnvironment) {
  const contractFactory = await _hre.ethers.getContractFactory("SmardexPair");

  const smardexLibFile = __dirname + "/../contracts/periphery/libraries/PoolAddress.sol";
  console.log("🚜 -> file: changePairHash.ts:8 -> changePairHash -> PoolAddress", smardexLibFile);
  try {
    const data = await readFile(smardexLibFile, "utf8");
    const newHash = 'hex"' + keccak256(contractFactory.bytecode).slice(2) + '"';
    const oldHash = data?.match(/hex"((?!(ff)).+)"/g)?.[0];

    if (oldHash === newHash) {
      console.log("Hash did not change, no need to replace");
      return;
    }

    console.log("🚜 -> file: changePairHash.ts:12 -> changePairHash -> oldHash", oldHash);
    console.log("🚜 -> file: changePairHash.ts:11 -> changePairHash -> newHash", newHash);

    const result = data.replace(/hex"((?!(ff)).+)"/g, newHash);

    await writeFile(smardexLibFile, result, "utf8");
  } catch (error) {
    console.error(error);
  }
}
