import { parseEther } from "ethers/lib/utils";
import { constants } from "ethers";
import { MINIMUM_LIQUIDITY } from "../../constants";
import { WETHPairInitialize } from "../utils";
import { getPermitSignature } from "../../utils";
import { expect } from "chai";

export function shouldBehaveLikeRemoveLiquidityETHWithPermit(): void {
  it("removeLiquidityETHWithPermit", async function () {
    const WETHPartnerAmount = parseEther("1");
    const ETHAmount = parseEther("4");
    await WETHPairInitialize.call(this, WETHPartnerAmount, ETHAmount);

    const expectedLiquidity = parseEther("2");

    const { v, r, s } = await getPermitSignature(
      this.signers.admin,
      this.contracts.WETHPair,
      this.contracts.smardexRouter.address,
      expectedLiquidity.sub(MINIMUM_LIQUIDITY),
    );

    await this.contracts.smardexRouter.removeLiquidityETHWithPermit(
      this.contracts.WETHPartner.address,
      expectedLiquidity.sub(MINIMUM_LIQUIDITY),
      0,
      0,
      this.signers.admin.address,
      constants.MaxUint256,
      false,
      v,
      r,
      s,
    );
  });

  it("griefing attack should fail", async function () {
    const WETHPartnerAmount = parseEther("1");
    const ETHAmount = parseEther("4");
    await WETHPairInitialize.call(this, WETHPartnerAmount, ETHAmount);

    const expectedLiquidity = parseEther("2");

    const { v, r, s } = await getPermitSignature(
      this.signers.admin,
      this.contracts.WETHPair,
      this.contracts.smardexRouter.address,
      expectedLiquidity.sub(MINIMUM_LIQUIDITY),
    );

    // attacker frontruns and validates the permit before the user transaction can be mined

    await this.contracts.WETHPair.connect(this.signers.user).permit(
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
      this.contracts.smardexRouter.removeLiquidityETHWithPermit(
        this.contracts.WETHPartner.address,
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
