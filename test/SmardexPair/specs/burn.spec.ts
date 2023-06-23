import { parseEther } from "ethers/lib/utils";
import { MAX_UINT128, MINIMUM_LIQUIDITY } from "../../constants";
import { addLiquidity, burnAndCheck } from "../utils";
import { BigNumber } from "ethers";
import { expect } from "chai";
import { constants } from "ethers/lib/ethers";

export function shouldBehaveLikeBurn(): void {
  interface BurnTestData {
    mintToken0: BigNumber;
    mintToken1: BigNumber;
    burnLP: BigNumber;
    expectedToken0: BigNumber;
    expectedToken1: BigNumber;
  }

  const burnTestCases: BurnTestData[] = [
    {
      mintToken0: parseEther("3"),
      mintToken1: parseEther("3"),
      burnLP: parseEther("3").sub(MINIMUM_LIQUIDITY),
      expectedToken0: parseEther("3").sub(MINIMUM_LIQUIDITY),
      expectedToken1: parseEther("3").sub(MINIMUM_LIQUIDITY),
    },
    {
      mintToken0: parseEther("101.3"),
      mintToken1: parseEther("101.3"),
      burnLP: parseEther("101.3").sub(MINIMUM_LIQUIDITY),
      expectedToken0: parseEther("101.3").sub(MINIMUM_LIQUIDITY),
      expectedToken1: parseEther("101.3").sub(MINIMUM_LIQUIDITY),
    },
    {
      mintToken0: parseEther("101.3"),
      mintToken1: parseEther("101.3"),
      burnLP: parseEther("50.65").sub(MINIMUM_LIQUIDITY),
      expectedToken0: parseEther("50.65").sub(MINIMUM_LIQUIDITY),
      expectedToken1: parseEther("50.65").sub(MINIMUM_LIQUIDITY),
    },
    {
      mintToken0: BigNumber.from("8000"),
      mintToken1: BigNumber.from("8000"),
      burnLP: constants.One,
      expectedToken0: constants.One,
      expectedToken1: constants.One,
    },
  ];

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
