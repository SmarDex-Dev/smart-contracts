import { readFile, writeFile } from "fs/promises";

export async function switchPairHashFunctionCoverage() {
  // Construct the path of the files
  const poolAddress1Path = __dirname + "/../contracts/periphery/libraries/PoolAddress.sol";
  const poolAddress2Path = __dirname + "/../contracts/periphery/test/peripheryV2WithV1/libraries/PoolAddressV1.sol";

  try {
    // Load the files contents
    let poolAddress1Result = await readFile(poolAddress1Path, "utf8");
    let poolAddress2Result = await readFile(poolAddress2Path, "utf8");

    if (!poolAddress1Result.includes(".creationCode")) {
      // Update poolAddress1
      poolAddress1Result = poolAddress1Result.replace(
        'import "./PoolHelpers.sol";',
        'import "./PoolHelpers.sol";\nimport "../../core/SmardexPair.sol";',
      );
      poolAddress1Result = poolAddress1Result.replace(
        'hex"c762a0f9885cc92b9fd8eef224b75997682b634460611bc0f2138986e20b653f"',
        "keccak256(type(SmardexPair).creationCode)",
      );

      // Update poolAddress2
      poolAddress2Result = poolAddress2Result.replace(
        'import "./PoolHelpersV1.sol";',
        'import "./PoolHelpersV1.sol";\nimport "../../../../core/test/coreV1/SmardexPairV1.sol";',
      );
      poolAddress2Result = poolAddress2Result.replace(
        'hex"6d32bf72ec5cc02d3e64eaf60f63b064ca3cd98c7661d933bab660a552327576"',
        "keccak256(type(SmardexPairV1).creationCode)",
      );
    } else {
      // Update poolAddress1
      poolAddress1Result = poolAddress1Result.replace('\nimport "../../core/SmardexPair.sol";', "");
      poolAddress1Result = poolAddress1Result.replace(
        "keccak256(type(SmardexPair).creationCode)",
        'hex"c762a0f9885cc92b9fd8eef224b75997682b634460611bc0f2138986e20b653f"',
      );

      // Update poolAddress2
      poolAddress2Result = poolAddress2Result.replace('\nimport "../../../../core/test/coreV1/SmardexPairV1.sol";', "");
      poolAddress2Result = poolAddress2Result.replace(
        "keccak256(type(SmardexPairV1).creationCode)",
        'hex"6d32bf72ec5cc02d3e64eaf60f63b064ca3cd98c7661d933bab660a552327576"',
      );
    }

    // Write the files
    await writeFile(poolAddress1Path, poolAddress1Result, "utf8");
    await writeFile(poolAddress2Path, poolAddress2Result, "utf8");
  } catch (error) {
    console.error(error);
  }
}
