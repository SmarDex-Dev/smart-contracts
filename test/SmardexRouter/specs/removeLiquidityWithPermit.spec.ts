import { parseEther } from "ethers/lib/utils";
import { constants } from "ethers";
import { expect } from "chai";
import { MINIMUM_LIQUIDITY } from "../../constants";
import { addLiquidity } from "../utils";
import { getPermitSignature } from "../../utils";

export function shouldBehaveLikeRemoveLiquidityWithPermit(): void {
  it("removeLiquidityWithPermit", async function () {
    const token0Amount = parseEther("1");
    const token1Amount = parseEther("4");
    await addLiquidity(
      token0Amount,
      token1Amount,
      this.contracts.token0,
      this.contracts.token1,
      this.contracts.smardexRouter,
      this.signers.admin.address,
    );

    const expectedLiquidity = parseEther("2");

    const { v, r, s } = await getPermitSignature(
      this.signers.admin,
      this.contracts.smardexPair,
      this.contracts.smardexRouter.address,
      expectedLiquidity.sub(MINIMUM_LIQUIDITY),
    );

    await expect(
      this.contracts.smardexRouter.removeLiquidityWithPermit(
        this.contracts.token0.address,
        this.contracts.token1.address,
        expectedLiquidity.sub(MINIMUM_LIQUIDITY),
        0,
        0,
        this.signers.admin.address,
        constants.MaxUint256,
        false,
        v,
        r,
        s,
      ),
    ).to.not.be.reverted;
  });

  it("griefing attack should fail", async function () {
    const token0Amount = parseEther("1");
    const token1Amount = parseEther("4");
    await addLiquidity(
      token0Amount,
      token1Amount,
      this.contracts.token0,
      this.contracts.token1,
      this.contracts.smardexRouter,
      this.signers.admin.address,
    );

    const expectedLiquidity = parseEther("2");

    const { v, r, s } = await getPermitSignature(
      this.signers.admin,
      this.contracts.smardexPair,
      this.contracts.smardexRouter.address,
      expectedLiquidity.sub(MINIMUM_LIQUIDITY),
    );

    // attacker frontruns and validates the permit before the user transaction can be mined

    await this.contracts.smardexPair
      .connect(this.signers.user)
      .permit(
        this.signers.admin.address,
        this.contracts.smardexRouter.address,
        expectedLiquidity.sub(MINIMUM_LIQUIDITY),
        constants.MaxUint256,
        v,
        r,
        s,
      );

    // This would revert with the old implementation
    await expect(
      this.contracts.smardexRouter.removeLiquidityWithPermit(
        this.contracts.token0.address,
        this.contracts.token1.address,
        expectedLiquidity.sub(MINIMUM_LIQUIDITY),
        0,
        0,
        this.signers.admin.address,
        constants.MaxUint256,
        false,
        v,
        r,
        s,
      ),
    ).to.not.be.reverted;
  });
}
