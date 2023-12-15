import { parseEther } from "ethers/lib/utils";
import { expect } from "chai";
import { FEES_BASE, FEES_LP, FEES_TOTAL_REVERSED } from "../../constants";
import { SmardexLibraryTestV1 } from "../../../typechain";

export function shouldBehaveLikeApplyKConstRuleInV1(): void {
  it("with logic", async function () {
    const amountOut = parseEther("8");
    const reserveIn = parseEther("5");
    const reserveOut = parseEther("25");
    const fictiveReserveIn = parseEther("10");
    const fictiveReserveOut = parseEther("17");

    const numerator = fictiveReserveIn.mul(amountOut).mul(FEES_BASE);
    const denominator = fictiveReserveOut.sub(amountOut).mul(FEES_TOTAL_REVERSED);

    const computedAmountIn = numerator.div(denominator).add(1);
    const amountInWithFeeLp = FEES_TOTAL_REVERSED.add(FEES_LP).mul(computedAmountIn).div(FEES_BASE);

    const result = await (this.contracts.smardexLibraryTest as SmardexLibraryTestV1).applyKConstRuleIn(
      amountOut,
      reserveIn,
      reserveOut,
      fictiveReserveIn,
      fictiveReserveOut,
    );
    expect(computedAmountIn).to.be.eq(result[0]);
    expect(reserveIn.add(amountInWithFeeLp)).to.be.eq(result[1]);
    expect(reserveOut.sub(amountOut)).to.be.eq(result[2]);
    expect(fictiveReserveIn.add(amountInWithFeeLp)).to.be.eq(result[3]);
    expect(fictiveReserveOut.sub(amountOut)).to.be.eq(result[4]);
  });
}
