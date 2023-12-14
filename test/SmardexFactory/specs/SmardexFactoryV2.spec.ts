import { SmardexPairV1__factory, SmardexPair__factory } from "../../../typechain";
import { expect } from "chai";
import { FEES_BASE, FEES_LP, FEES_POOL, MAX_UINT128 } from "../../constants";
import { constants } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { unitFixtureSmardexFactoryV1 } from "../../fixtures";
import { createPair, getCreate2Address } from "../utils";
import { deploySmardexRouter, deploySmardexRouterV2WithV1Factory } from "../../deployers";

export function shouldBehaveLikeSmardexFactoryV2(): void {
  const ownableMessage: string = "Ownable: caller is not the owner";

  it("feeTo, owner, allPairsLength", async function () {
    expect(await this.contracts.smardexFactory.feeTo()).to.eq(constants.Zero);

    expect(await this.contracts.smardexFactory.owner()).to.eq(this.signers.admin.address);

    expect(await this.contracts.smardexFactory.allPairsLength()).to.eq(0);
  });

  it("setFees", async function () {
    const factory = this.contracts.smardexFactory;

    await expect(factory.connect(this.signers.user).setFees(FEES_LP, FEES_POOL)).to.be.revertedWith(ownableMessage);
    await factory.transferOwnership(this.signers.user.address);
    expect(await factory.owner()).to.eq(this.signers.user.address);
    await expect(factory.transferOwnership(this.signers.admin.address)).to.be.revertedWith(ownableMessage);
    await factory.connect(this.signers.user).transferOwnership(this.signers.admin.address);
    await expect(factory.setFees(0, FEES_POOL)).to.be.revertedWith("SmarDex: ZERO_FEES_LP");

    const limit = FEES_BASE.div(10);

    await expect(factory.setFees(limit, 0)).to.emit(factory, "FeesChanged").withArgs(limit, 0);

    await expect(factory.setFees(limit, 1)).to.be.revertedWith("SmarDex: FEES_MAX");
    await expect(factory.setFees(MAX_UINT128, 0)).to.be.revertedWith("SmarDex: FEES_MAX");
    expect(factory.setFees(constants.MaxUint256, 0)).to.be.revertedWithPanic;
  });

  it("transferOwnership", async function () {
    await expect(
      this.contracts.smardexFactory.connect(this.signers.user).transferOwnership(this.signers.user.address),
    ).to.be.revertedWith(ownableMessage);

    await this.contracts.smardexFactory.transferOwnership(this.signers.user.address);

    expect(await this.contracts.smardexFactory.owner()).to.eq(this.signers.user.address);

    await expect(this.contracts.smardexFactory.transferOwnership(this.signers.admin.address)).to.be.revertedWith(
      ownableMessage,
    );
  });

  it("addPair", async function () {
    const factory = this.contracts.smardexFactory;
    const { factory: factoryV1 } = await loadFixture(unitFixtureSmardexFactoryV1);
    const smardexRouterOld = await deploySmardexRouterV2WithV1Factory(factoryV1, this.contracts.WETH);
    await this.contracts.token0.approve(smardexRouterOld.address, constants.MaxUint256);
    await this.contracts.token1.approve(smardexRouterOld.address, constants.MaxUint256);
    await this.contracts.smardexToken.approve(smardexRouterOld.address, constants.MaxUint256);
    const smardexRouter = await deploySmardexRouter(factory, this.contracts.WETH);
    await this.contracts.token0.approve(smardexRouter.address, constants.MaxUint256);
    await this.contracts.token1.approve(smardexRouter.address, constants.MaxUint256);
    const bytecodeV1: string = SmardexPairV1__factory.bytecode;
    const bytecodeV2: string = SmardexPair__factory.bytecode;

    // create old pair to migrate
    await createPair([this.contracts.token0.address, this.contracts.token1.address], factoryV1, bytecodeV1);
    const pairV1 = await factoryV1.getPair(this.contracts.token0.address, this.contracts.token1.address);

    // create old pair to migrate but can't because of whitelist closed
    await createPair([this.contracts.token0.address, this.contracts.smardexToken.address], factoryV1, bytecodeV1);
    const pairV1Smardex = await factoryV1.getPair(this.contracts.token0.address, this.contracts.smardexToken.address);
    await smardexRouterOld.addLiquidity(
      {
        tokenA: this.contracts.token0.address,
        tokenB: this.contracts.smardexToken.address,
        amountADesired: 100_000,
        amountBDesired: 100_000,
        amountAMin: constants.Zero,
        amountBMin: constants.Zero,
        fictiveReserveB: constants.Zero,
        fictiveReserveAMin: constants.Zero,
        fictiveReserveAMax: constants.Zero,
      },
      this.signers.admin.address,
      constants.MaxUint256,
    );

    expect(await factory.whitelistOpen()).to.be.true;

    // Guards
    await expect(factory.connect(this.signers.user).addPair(pairV1)).to.be.revertedWith(ownableMessage);
    await expect(factory.addPair(pairV1)).to.be.revertedWithCustomError(factory, "EmptyPair");

    // Add liquidity to pair before migration
    await smardexRouterOld.addLiquidity(
      {
        tokenA: this.contracts.token0.address,
        tokenB: this.contracts.token1.address,
        amountADesired: 100_000,
        amountBDesired: 100_000,
        amountAMin: constants.Zero,
        amountBMin: constants.Zero,
        fictiveReserveB: constants.Zero,
        fictiveReserveAMin: constants.Zero,
        fictiveReserveAMax: constants.Zero,
      },
      this.signers.admin.address,
      constants.MaxUint256,
    );

    // Migrate pair to new factory
    await expect(factory.addPair(pairV1))
      .to.emit(factory, "PairAdded")
      .withArgs(this.contracts.token0.address, this.contracts.token1.address, pairV1, constants.One);

    // Check migration
    expect(await factory.getPair(this.contracts.token0.address, this.contracts.token1.address)).to.eq(pairV1);
    expect(await factory.getPair(this.contracts.token1.address, this.contracts.token0.address)).to.eq(pairV1);
    const calculatedPairAddressToken0Token1 = getCreate2Address(
      factory.address,
      [this.contracts.token0.address, this.contracts.token1.address],
      bytecodeV2,
    );
    // The pair calculated with V2 bytecode is indeed different from the one we just migrated
    expect(pairV1).to.not.equal(calculatedPairAddressToken0Token1);

    // Check that same pair cannot be added twice
    await expect(factory.addPair(pairV1)).to.be.revertedWith("SmarDex: PAIR_EXISTS");

    // Add migrated pair to router whitelist
    await expect(smardexRouter.addPairToWhitelist(this.contracts.token0.address, this.contracts.token1.address)).to.not
      .be.reverted;

    // Already migrated, should revert
    await expect(factory.addPair(pairV1)).to.be.revertedWith("SmarDex: PAIR_EXISTS");

    // Close whitelist
    await factory.closeWhitelist();

    expect(await factory.whitelistOpen()).to.be.false;

    // Can't add pair because whitelist is closed
    await expect(factory.addPair(pairV1Smardex)).to.be.revertedWithCustomError(factory, "WhitelistNotOpen");

    // Creating a new pair should now be possible
    await expect(factory.createPair(this.contracts.token0.address, this.contracts.WETH.address)).to.not.be.reverted;

    // Try to use the migrated pair
    await expect(
      smardexRouter.addLiquidity(
        {
          tokenA: this.contracts.token0.address,
          tokenB: this.contracts.token1.address,
          amountADesired: 10000,
          amountBDesired: 10000,
          amountAMin: constants.Zero,
          amountBMin: constants.Zero,
          fictiveReserveB: constants.Zero,
          fictiveReserveAMin: constants.Zero,
          fictiveReserveAMax: constants.Zero,
        },
        this.signers.admin.address,
        constants.MaxUint256,
      ),
    ).to.not.be.reverted;

    const pairV1Contract = SmardexPairV1__factory.connect(pairV1, this.signers.admin);
    await pairV1Contract.approve(smardexRouter.address, constants.MaxUint256);
    const lpTokens = await pairV1Contract.balanceOf(this.signers.admin.address);
    await expect(
      smardexRouter.removeLiquidity(
        this.contracts.token0.address,
        this.contracts.token1.address,
        lpTokens.div(2),
        0,
        0,
        this.signers.admin.address,
        constants.MaxUint256,
      ),
    ).to.not.be.reverted;

    await expect(
      smardexRouter.swapExactTokensForTokens(
        10000,
        0,
        [this.contracts.token0.address, this.contracts.token1.address],
        this.signers.admin.address,
        constants.MaxUint256,
      ),
    ).to.not.be.reverted;
  });
}
