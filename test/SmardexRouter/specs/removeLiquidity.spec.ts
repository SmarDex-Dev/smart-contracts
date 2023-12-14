import { parseEther } from "ethers/lib/utils";
import { constants } from "ethers";
import { expect } from "chai";
import { MAX_UINT128, MINIMUM_LIQUIDITY } from "../../constants";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { addLiquidity } from "../utils";

export function shouldBehaveLikeRemoveLiquidity(): void {
  const token0Amount = parseEther("1");
  const token1Amount = parseEther("4");
  const expectedLiquidity = parseEther("2");
  const amountToReceiveToken0 = token0Amount.sub(500);
  const amountToReceiveToken1 = token1Amount.sub(2000);

  beforeEach(async function () {
    await this.contracts.smardexPair.approve(this.contracts.smardexRouter.address, constants.MaxUint256);
  });

  it("simple test", async function () {
    await addLiquidity(
      token0Amount,
      token1Amount,
      this.contracts.token0,
      this.contracts.token1,
      this.contracts.smardexRouter,
      this.signers.admin.address,
    );

    await expect(
      this.contracts.smardexRouter.removeLiquidity(
        this.contracts.token0.address,
        this.contracts.token1.address,
        expectedLiquidity.sub(MINIMUM_LIQUIDITY),
        0,
        0,
        this.signers.admin.address,
        constants.MaxUint256,
      ),
    )
      .to.emit(this.contracts.smardexPair, "Transfer")
      .withArgs(
        this.signers.admin.address,
        this.contracts.smardexPair.address,
        expectedLiquidity.sub(MINIMUM_LIQUIDITY),
      )
      .to.emit(this.contracts.smardexPair, "Transfer")
      .withArgs(this.contracts.smardexPair.address, constants.AddressZero, expectedLiquidity.sub(MINIMUM_LIQUIDITY))
      .to.emit(this.contracts.token0, "Transfer")
      .withArgs(this.contracts.smardexPair.address, this.signers.admin.address, amountToReceiveToken0)
      .to.emit(this.contracts.token1, "Transfer")
      .withArgs(this.contracts.smardexPair.address, this.signers.admin.address, amountToReceiveToken1)
      .to.emit(this.contracts.smardexPair, "Sync")
      .withArgs(500, 2000, anyValue, anyValue, 0, 0)
      .to.emit(this.contracts.smardexPair, "Burn")
      .withArgs(
        this.contracts.smardexRouter.address,
        this.signers.admin.address,
        amountToReceiveToken0,
        amountToReceiveToken1,
      );

    expect(await this.contracts.smardexPair.balanceOf(this.signers.admin.address)).to.eq(0);
    const totalSupplyToken0 = await this.contracts.token0.totalSupply();
    const totalSupplyToken1 = await this.contracts.token1.totalSupply();
    expect(await this.contracts.token0.balanceOf(this.signers.admin.address)).to.eq(totalSupplyToken0.sub(500));
    expect(await this.contracts.token1.balanceOf(this.signers.admin.address)).to.eq(totalSupplyToken1.sub(2000));
  });

  it("should revert when insufficient amount received", async function () {
    await addLiquidity(
      token0Amount,
      token1Amount,
      this.contracts.token0,
      this.contracts.token1,
      this.contracts.smardexRouter,
      this.signers.admin.address,
    );

    await expect(
      this.contracts.smardexRouter.removeLiquidity(
        this.contracts.token0.address,
        this.contracts.token1.address,
        expectedLiquidity.sub(MINIMUM_LIQUIDITY),
        amountToReceiveToken0.add(1),
        0,
        this.signers.admin.address,
        constants.MaxUint256,
      ),
    ).to.be.revertedWith("SmarDexRouter: INSUFFICIENT_A_AMOUNT");

    await expect(
      this.contracts.smardexRouter.removeLiquidity(
        this.contracts.token0.address,
        this.contracts.token1.address,
        expectedLiquidity.sub(MINIMUM_LIQUIDITY),
        0,
        amountToReceiveToken1.add(1),
        this.signers.admin.address,
        constants.MaxUint256,
      ),
    ).to.be.revertedWith("SmarDexRouter: INSUFFICIENT_B_AMOUNT");

    await expect(
      this.contracts.smardexRouter.removeLiquidity(
        this.contracts.token0.address,
        this.contracts.token1.address,
        expectedLiquidity.sub(MINIMUM_LIQUIDITY),
        amountToReceiveToken0,
        amountToReceiveToken1,
        this.signers.admin.address,
        constants.MaxUint256,
      ),
    ).to.not.be.reverted;
  });

  it("trying to set a fictive reserve to 0 by burn", async function () {
    await this.contracts.token0.approve(this.contracts.smardexRouter.address, constants.MaxUint256);
    await this.contracts.token1.approve(this.contracts.smardexRouter.address, constants.MaxUint256);
    await this.contracts.smardexPair.approve(this.contracts.smardexRouter.address, constants.MaxUint256);

    await this.contracts.smardexRouter.addLiquidity(
      {
        tokenA: this.contracts.token0.address,
        tokenB: this.contracts.token1.address,
        amountADesired: parseEther("0.000000000000001001"),
        amountBDesired: parseEther("0.000000000000001001"),
        amountAMin: 1,
        amountBMin: 1,
        fictiveReserveB: 0,
        fictiveReserveAMin: 0,
        fictiveReserveAMax: 0,
      },
      this.signers.admin.address,
      constants.MaxUint256,
    );

    const userLP = await this.contracts.smardexPair.balanceOf(this.signers.admin.address);

    await expect(
      this.contracts.smardexRouter.removeLiquidity(
        this.contracts.token0.address,
        this.contracts.token1.address,
        userLP,
        0,
        0,
        this.signers.admin.address,
        constants.MaxUint256,
      ),
    ).to.not.be.revertedWith("SmarDex: FICTIVE_RESERVES_TOO_LOW");

    const ficRes = await this.contracts.smardexPair.getFictiveReserves();

    expect(ficRes.fictiveReserve0_).to.be.eq("500");
    expect(ficRes.fictiveReserve1_).to.be.eq("500");
  });

  it("trying to set a fictive reserve to 0 by burn 2", async function () {
    await this.contracts.token0.mint(this.signers.admin.address, MAX_UINT128);
    await this.contracts.token1.mint(this.signers.admin.address, MAX_UINT128);
    await this.contracts.token0.approve(this.contracts.smardexRouter.address, constants.MaxUint256);
    await this.contracts.token1.approve(this.contracts.smardexRouter.address, constants.MaxUint256);
    await this.contracts.smardexPair.approve(this.contracts.smardexRouter.address, constants.MaxUint256);

    await this.contracts.smardexRouter.addLiquidity(
      {
        tokenA: this.contracts.token0.address,
        tokenB: this.contracts.token1.address,
        amountADesired: MAX_UINT128,
        amountBDesired: MAX_UINT128,
        amountAMin: 1,
        amountBMin: 1,
        fictiveReserveB: 0,
        fictiveReserveAMin: 0,
        fictiveReserveAMax: 0,
      },
      this.signers.admin.address,
      constants.MaxUint256,
    );

    const userLP = await this.contracts.smardexPair.balanceOf(this.signers.admin.address);

    await expect(
      this.contracts.smardexRouter.removeLiquidity(
        this.contracts.token0.address,
        this.contracts.token1.address,
        userLP,
        0,
        0,
        this.signers.admin.address,
        constants.MaxUint256,
      ),
    ).to.not.be.revertedWith("SmarDex: FICTIVE_RESERVES_TOO_LOW");

    const ficRes = await this.contracts.smardexPair.getFictiveReserves();

    expect(ficRes.fictiveReserve0_).to.be.eq("500");
    expect(ficRes.fictiveReserve1_).to.be.eq("500");
  });

  it("trying to set a fictive reserve to 0 by burn 3", async function () {
    await this.contracts.token1.mint(this.signers.admin.address, constants.MaxUint256.sub(parseEther("10000000")));
    await this.contracts.token0.approve(this.contracts.smardexRouter.address, constants.MaxUint256);
    await this.contracts.token1.approve(this.contracts.smardexRouter.address, constants.MaxUint256);
    await this.contracts.smardexPair.approve(this.contracts.smardexRouter.address, constants.MaxUint256);

    await this.contracts.smardexRouter.addLiquidity(
      {
        tokenA: this.contracts.token0.address,
        tokenB: this.contracts.token1.address,
        amountADesired: parseEther("0.000000000000000002"),
        amountBDesired: MAX_UINT128.mul(2),
        amountAMin: 1,
        amountBMin: 1,
        fictiveReserveB: 0,
        fictiveReserveAMin: 0,
        fictiveReserveAMax: 0,
      },
      this.signers.admin.address,
      constants.MaxUint256,
    );

    const userLP = await this.contracts.smardexPair.balanceOf(this.signers.admin.address);

    await expect(
      this.contracts.smardexRouter.removeLiquidity(
        this.contracts.token0.address,
        this.contracts.token1.address,
        userLP,
        0,
        0,
        this.signers.admin.address,
        constants.MaxUint256,
      ),
    ).to.not.be.revertedWith("SmarDex: FICTIVE_RESERVES_TOO_LOW");

    const ficRes = await this.contracts.smardexPair.getFictiveReserves();

    expect(ficRes.fictiveReserve0_).to.be.eq("1");
    // expect(ficRes.fictiveReserve1_).to.be.eq(MAX_UINT128);
  });
}
