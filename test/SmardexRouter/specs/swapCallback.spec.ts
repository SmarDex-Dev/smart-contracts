import { expect } from "chai";
import { constants } from "ethers";
import { getSwapEncodedData } from "../../utils";
import { hexConcat } from "ethers/lib/utils";

export function shouldBehaveLikeSwapCallback() {
  it("swap callback should fail when no amount in parameters", async function () {
    await expect(this.contracts.smardexRouter.smardexSwapCallback(0, 0, constants.HashZero)).to.be.revertedWith(
      "SmardexRouter: Callback Invalid amount",
    );
  });

  it("swap callback should fail when not called by pair", async function () {
    await expect(
      this.contracts.smardexRouter.smardexSwapCallback(
        10000,
        100000,
        getSwapEncodedData(
          this.signers.admin.address,
          hexConcat([this.contracts.token0.address, this.contracts.token1.address]),
        ),
      ),
    ).to.be.revertedWith("SmarDexRouter: INVALID_PAIR");
  });
}
