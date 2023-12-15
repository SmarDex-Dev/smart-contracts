import { MAX_UINT128, MINIMUM_LIQUIDITY } from "../../constants";
import { addLiquidity, burnAndCheck, burnTestCases } from "../utils";
import { BigNumber, constants } from "ethers";
import { parseEther } from "ethers/lib/utils";
import { expect } from "chai";

export function shouldBehaveLikeBurn(): void {
  burnTestCases.forEach((burnTestCase, i) => {
    it(`simple burn after mint ${i + 1}`, async function () {
      const { mintToken0, mintToken1, burnLP, expectedToken0, expectedToken1 } = burnTestCase;
      await addLiquidity(this.contracts, this.signers.admin, mintToken0, mintToken1);
      await burnAndCheck(this.contracts, this.signers.admin, burnLP, expectedToken0, expectedToken1);
    });
  });

  burnTestCases.forEach((burnTestCase, i) => {
    it(`mint and burn successively ${i + 1}`, async function () {
      const { mintToken0, mintToken1, burnLP, expectedToken0, expectedToken1 } = burnTestCase;
      await addLiquidity(this.contracts, this.signers.admin, mintToken0, mintToken1);
      await burnAndCheck(this.contracts, this.signers.admin, burnLP, expectedToken0, expectedToken1);

      await addLiquidity(this.contracts, this.signers.admin, mintToken0, mintToken1);
      await burnAndCheck(this.contracts, this.signers.admin, burnLP, expectedToken0, expectedToken1);
    });
  });

  it("max mintable values", async function () {
    const mintToken0 = MAX_UINT128;
    const mintToken1 = MAX_UINT128;
    const burnLP = MAX_UINT128.sub(MINIMUM_LIQUIDITY);
    const expectedToken0 = MAX_UINT128.sub(MINIMUM_LIQUIDITY);
    const expectedToken1 = MAX_UINT128.sub(MINIMUM_LIQUIDITY);

    await addLiquidity(this.contracts, this.signers.admin, mintToken0, mintToken1);

    await burnAndCheck(this.contracts, this.signers.admin, burnLP, expectedToken0, expectedToken1);
  });

  it("burn should revert when no liquidity to burn", async function () {
    const mintToken0 = BigNumber.from("1013000");
    const mintToken1 = BigNumber.from("1013000");

    await addLiquidity(this.contracts, this.signers.admin, mintToken0, mintToken1);
    await expect(this.contracts.smardexPair.burn(this.signers.admin.address)).to.be.revertedWith(
      "SmarDex: INSUFFICIENT_LIQUIDITY_BURNED",
    );
  });
}
