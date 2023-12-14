import { utils } from "ethers";
import { solidityPack } from "ethers/lib/utils";
import { ethers } from "hardhat";
import { expect } from "chai";
import { SmardexFactory, SmardexFactoryV1, SmardexPair } from "../../typechain";
import { constants } from "ethers/lib/ethers";

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

export async function createPair(
  tokens: [string, string],
  smardexFactory: SmardexFactory | SmardexFactoryV1,
  bytecode: string,
) {
  const [token0, token1] = tokens[0].toLowerCase() < tokens[1].toLowerCase() ? tokens : tokens.slice().reverse();
  const create2Address = getCreate2Address(smardexFactory.address, tokens, bytecode);
  const allPairsLengthBefore = await smardexFactory.allPairsLength();
  await expect(smardexFactory.createPair(...tokens))
    .to.emit(smardexFactory, "PairCreated")
    .withArgs(token0, token1, create2Address, allPairsLengthBefore.add(1));

  await expect(smardexFactory.createPair(tokens[0], tokens[1])).to.be.revertedWith("SmarDex: PAIR_EXISTS");
  await expect(smardexFactory.createPair(tokens[1], tokens[0])).to.be.revertedWith("SmarDex: PAIR_EXISTS");
  await expect(smardexFactory.createPair(tokens[0], tokens[0])).to.be.revertedWith("SmarDex: IDENTICAL_ADDRESSES");
  await expect(smardexFactory.createPair(tokens[0], constants.AddressZero)).to.be.revertedWith("SmarDex: ZERO_ADDRESS");
  expect(await smardexFactory.getPair(tokens[0], tokens[1])).to.eq(create2Address);
  expect(await smardexFactory.getPair(tokens[1], tokens[0])).to.eq(create2Address);
  expect(await smardexFactory.allPairs(allPairsLengthBefore)).to.eq(create2Address);
  expect(await smardexFactory.allPairsLength()).to.eq(allPairsLengthBefore.add(1));

  const poolContractFactory = await ethers.getContractFactory("SmardexPair");
  const pair: SmardexPair = poolContractFactory.attach(create2Address);
  expect(await pair.factory()).to.eq(smardexFactory.address);
  expect(await pair.token0()).to.eq(token0);
  expect(await pair.token1()).to.eq(token1);
}

export const TEST_ADDRESSES: [string, string] = [
  "0x1000000000000000000000000000000000000000",
  "0x2000000000000000000000000000000000000000",
];
