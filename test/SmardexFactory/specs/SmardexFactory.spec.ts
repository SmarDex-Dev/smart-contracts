import { expect } from "chai";
import { getCreate2Address } from "../utils";
import { constants } from "ethers/lib/ethers";
import { SmardexFactory, SmardexPair, SmardexPair__factory } from "../../../typechain";
import { ethers } from "hardhat";

const TEST_ADDRESSES: [string, string] = [
  "0x1000000000000000000000000000000000000000",
  "0x2000000000000000000000000000000000000000",
];

export function shouldBehaveLikeUniswapV2Factory(): void {
  it("feeTo, feeToSetter, allPairsLength", async function () {
    expect(await this.contracts.smardexFactory.feeTo()).to.eq(constants.Zero);
    expect(await this.contracts.smardexFactory.feeToSetter()).to.eq(this.signers.admin.address);
    expect(await this.contracts.smardexFactory.allPairsLength()).to.eq(0);
  });

  async function createPair(tokens: [string, string], smardexFactory: SmardexFactory) {
    const create2Address = getCreate2Address(smardexFactory.address, tokens, SmardexPair__factory.bytecode);
    await expect(smardexFactory.createPair(...tokens))
      .to.emit(smardexFactory, "PairCreated")
      .withArgs(TEST_ADDRESSES[0], TEST_ADDRESSES[1], create2Address, constants.One);

    await expect(smardexFactory.createPair(tokens[0], tokens[1])).to.be.revertedWith("SmarDex: PAIR_EXISTS");
    await expect(smardexFactory.createPair(tokens[1], tokens[0])).to.be.revertedWith("SmarDex: PAIR_EXISTS");
    await expect(smardexFactory.createPair(tokens[0], tokens[0])).to.be.revertedWith("SmarDex: IDENTICAL_ADDRESSES");
    await expect(smardexFactory.createPair(tokens[0], constants.AddressZero)).to.be.revertedWith(
      "SmarDex: ZERO_ADDRESS",
    );
    expect(await smardexFactory.getPair(tokens[0], tokens[1])).to.eq(create2Address);
    expect(await smardexFactory.getPair(tokens[1], tokens[0])).to.eq(create2Address);
    expect(await smardexFactory.allPairs(0)).to.eq(create2Address);
    expect(await smardexFactory.allPairsLength()).to.eq(1);

    const poolContractFactory = await ethers.getContractFactory("SmardexPair");
    const pair: SmardexPair = poolContractFactory.attach(create2Address);
    expect(await pair.factory()).to.eq(smardexFactory.address);
    expect(await pair.token0()).to.eq(TEST_ADDRESSES[0]);
    expect(await pair.token1()).to.eq(TEST_ADDRESSES[1]);
  }

  it("createPair", async function () {
    await createPair(TEST_ADDRESSES, this.contracts.smardexFactory);
  });

  it("createPair:reverse", async function () {
    await createPair(TEST_ADDRESSES.slice().reverse() as [string, string], this.contracts.smardexFactory);
  });

  it("setFeeTo", async function () {
    await expect(
      this.contracts.smardexFactory.connect(this.signers.user).setFeeTo(this.signers.user.address),
    ).to.be.revertedWith("SmarDex: FORBIDDEN");
    await this.contracts.smardexFactory.setFeeTo(this.signers.admin.address);
    expect(await this.contracts.smardexFactory.feeTo()).to.eq(this.signers.admin.address);
  });

  it("setFeeToSetter", async function () {
    await expect(
      this.contracts.smardexFactory.connect(this.signers.user).setFeeToSetter(this.signers.user.address),
    ).to.be.revertedWith("SmarDex: FORBIDDEN");
    await this.contracts.smardexFactory.setFeeToSetter(this.signers.user.address);
    expect(await this.contracts.smardexFactory.feeToSetter()).to.eq(this.signers.user.address);
    await expect(this.contracts.smardexFactory.setFeeToSetter(this.signers.admin.address)).to.be.revertedWith(
      "SmarDex: FORBIDDEN",
    );
  });
}
