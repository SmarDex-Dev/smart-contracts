import { parseEther } from "ethers/lib/utils";
import { expect } from "chai";
import { FEES_BASE, FEES_LP, FEES_TOTAL_REVERSED } from "../../constants";

export function shouldBehaveLikeApplyKConstRuleOut(): void {
  it("with logic", async function () {
    const amountIn = parseEther("17");
    const reserveIn = parseEther("5");
    const reserveOut = parseEther("25");
    const fictiveReserveIn = parseEther("10");
    const fictiveReserveOut = parseEther("8");

    const amountInWithFee = amountIn.mul(FEES_TOTAL_REVERSED);
    const numerator = amountInWithFee.mul(fictiveReserveOut);
    const denominator = fictiveReserveIn.mul(FEES_BASE).add(amountInWithFee);

    const computedAmountOut = numerator.div(denominator);

    const amountInWithFeeLp = FEES_LP.mul(amountIn).add(amountInWithFee).div(FEES_BASE);

    const result = await this.contracts.smardexLibraryTest.applyKConstRuleOut(
      amountIn,
      reserveIn,
      reserveOut,
      fictiveReserveIn,
      fictiveReserveOut,
    );
    expect(computedAmountOut).to.be.eq(result[0]);
    expect(reserveIn.add(amountInWithFeeLp)).to.be.eq(result[1]);
    expect(reserveOut.sub(computedAmountOut)).to.be.eq(result[2]);
    expect(fictiveReserveIn.add(amountInWithFeeLp)).to.be.eq(result[3]);
    expect(fictiveReserveOut.sub(computedAmountOut)).to.be.eq(result[4]);
  });
}
