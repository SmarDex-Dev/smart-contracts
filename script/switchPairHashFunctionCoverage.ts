import { readFile, writeFile } from "fs/promises";

export async function switchPairHashFunctionCoverage() {
  const poolAddressPath = __dirname + "/../contracts/periphery/libraries/PoolAddress.sol";
  const routerTestPath = __dirname + "/../contracts/periphery/test/SmardexRouterTest.sol";
  const routerForPairTestPath = __dirname + "/../contracts/periphery/test/RouterForPairTest.sol";
  try {
    const poolAddressData = await readFile(poolAddressPath, "utf8");
    const routerTestData = await readFile(routerTestPath, "utf8");
    const routerForPairData = await readFile(routerForPairTestPath, "utf8");

    let poolAddressResult;
    let routerTestResult;
    let routerForPairResult;

    if (routerTestData.includes("public pure returns")) {
      poolAddressResult = poolAddressData.replace("function pairFor(", "function pairForByHash(");
      poolAddressResult = poolAddressResult.replace("function pairForByStorage(", "function pairFor(");

      routerForPairResult = routerForPairData.replace("PoolAddress.pairForByStorage(", "PoolAddress.pairFor(");
      routerForPairResult = routerForPairResult.replace("PoolAddress.pairForByStorage(", "PoolAddress.pairFor(");

      routerTestResult = routerTestData.replace("public pure returns", "public view returns");
    } else {
      poolAddressResult = poolAddressData.replace("function pairFor(", "function pairForByStorage(");
      poolAddressResult = poolAddressResult.replace("function pairForByHash(", "function pairFor(");

      routerForPairResult = routerForPairData.replace("PoolAddress.pairFor(", "PoolAddress.pairForByStorage(");
      routerForPairResult = routerForPairResult.replace("PoolAddress.pairFor(", "PoolAddress.pairForByStorage(");

      routerTestResult = routerTestData.replace("public view returns", "public pure returns");
    }
    await writeFile(poolAddressPath, poolAddressResult, "utf8");
    await writeFile(routerTestPath, routerTestResult, "utf8");
    await writeFile(routerForPairTestPath, routerForPairResult, "utf8");
  } catch (error) {
    console.error(error);
  }
}
