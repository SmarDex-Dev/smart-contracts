import { utils } from "ethers";
import { solidityPack } from "ethers/lib/utils";
import { ethers } from "hardhat";

export function getCreate2Address(
  factoryAddress: string,
  [tokenA, tokenB]: [string, string],
  bytecode: string,
): string {
  const [token0, token1] = tokenA.toLowerCase() < tokenB.toLowerCase() ? [tokenA, tokenB] : [tokenB, tokenA];
  const constructorArgumentsEncoded = solidityPack(["address", "address"], [token0, token1]);
  return ethers.utils.getCreate2Address(
    factoryAddress,
    utils.keccak256(constructorArgumentsEncoded),
    utils.keccak256(bytecode),
  );
}
