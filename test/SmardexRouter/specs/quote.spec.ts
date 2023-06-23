import { expect } from "chai";
import { SmardexPairStateTestData } from "../utils";
import { parseEther } from "ethers/lib/utils";

export function shouldBehaveLikeSmardexRouterQuote(): void {
  const TEST_QUOTE_1: SmardexPairStateTestData = {
    reserve0: parseEther("2.83940659633663"),
    reserve1: parseEther("14332.429776822463866034"),
    fictiveReserve0: parseEther("4.29357548962959"),
    fictiveReserve1: parseEther("21672.6161290169"),
  };

  const TEST_QUOTE_2: SmardexPairStateTestData = {
    reserve0: parseEther("2.83940659633663"),
    reserve1: parseEther("2.83940659633663"),
    fictiveReserve0: parseEther("21672.6161290169"),
    fictiveReserve1: parseEther("21672.6161290169"),
  };

  const TEST_QUOTE_3: SmardexPairStateTestData = {
    reserve0: parseEther("2.83940659633663"),
    reserve1: parseEther("0.000562516610572040"),
    fictiveReserve0: parseEther("21672.6161290169"),
    fictiveReserve1: parseEther("4.29357548962959"),
  };

  it("reserve0 < reserve1", async function () {
    expect(
      await this.contracts.smardexRouter.quote(
        TEST_QUOTE_1.reserve0,
        TEST_QUOTE_1.fictiveReserve0,
        TEST_QUOTE_1.fictiveReserve1,
      ),
    ).to.be.equals(TEST_QUOTE_1.reserve1);
  });

  it("reserve0 = reserve1", async function () {
    expect(
      await this.contracts.smardexRouter.quote(
        TEST_QUOTE_2.reserve0,
        TEST_QUOTE_2.fictiveReserve0,
        TEST_QUOTE_2.fictiveReserve1,
      ),
    ).to.be.equals(TEST_QUOTE_2.reserve1);
  });

  it("reserve0 > reserve1", async function () {
    expect(
      await this.contracts.smardexRouter.quote(
        TEST_QUOTE_3.reserve0,
        TEST_QUOTE_3.fictiveReserve0,
        TEST_QUOTE_3.fictiveReserve1,
      ),
    ).to.be.equals(TEST_QUOTE_3.reserve1);
  });
  it("quote", async function () {
    expect(await this.contracts.smardexRouter.quote(1, 100, 200)).to.eq(2);
    expect(await this.contracts.smardexRouter.quote(2, 200, 100)).to.eq(1);
    await expect(this.contracts.smardexRouter.quote(0, 100, 200)).to.be.revertedWith(
      "SmardexHelper: INSUFFICIENT_AMOUNT",
    );
    await expect(this.contracts.smardexRouter.quote(1, 0, 200)).to.be.revertedWith(
      "SmardexHelper: INSUFFICIENT_LIQUIDITY",
    );
    await expect(this.contracts.smardexRouter.quote(1, 100, 0)).to.be.revertedWith(
      "SmardexHelper: INSUFFICIENT_LIQUIDITY",
    );
  });
}
