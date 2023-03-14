import { parseEther } from "ethers/lib/utils";
import { constants } from "ethers";
import { MINIMUM_LIQUIDITY } from "../../constants";
import { WETHPairInitialize } from "../utils";
import { getPermitSignature } from "../../utils";

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
}
