import { parseEther } from "ethers/lib/utils";
import { expect } from "chai";
import { sqrt } from "../utils";
import { FEES_BASE, FEES_LP, FEES_POOL, FEES_TOTAL_REVERSED } from "../../constants";

export function shouldBehaveLikeComputeFirstTradeQtyOut(): void {
  it("when _fictiveReserveOut * _priceAverageIn < _fictiveReserveIn * _priceAverageOut", async function () {
    const amountOut = parseEther("17");
    const fictiveReserveIn = parseEther("50");
    const fictiveReserveOut = parseEther("8");
    const priceAverageIn = parseEther("10");
    const priceAverageOut = parseEther("10");

    const result = await this.contracts.smardexLibraryTest.computeFirstTradeQtyOut(
      amountOut,
      fictiveReserveIn,
      fictiveReserveOut,
      priceAverageIn,
      priceAverageOut,
    );
    expect(amountOut).to.be.eq(result);
  });

  it("when _fictiveReserveOut * _priceAverageIn > _fictiveReserveIn * _priceAverageOut but no sqrt needed", async function () {
    const amountOut = parseEther("1");
    const fictiveReserveIn = parseEther("2510");
    const fictiveReserveOut = parseEther("2500");
    const priceAverageIn = parseEther("43");
    const priceAverageOut = parseEther("41");

    const result = await this.contracts.smardexLibraryTest.computeFirstTradeQtyOut(
      amountOut,
      fictiveReserveIn,
      fictiveReserveOut,
      priceAverageIn,
      priceAverageOut,
    );
    expect(amountOut).to.be.eq(result);
  });

  it("when _fictiveReserveOut * _priceAverageIn > _fictiveReserveIn * _priceAverageOut with sqrt needed", async function () {
    const amountOut = parseEther("17");
    const fictiveReserveIn = parseEther("5");
    const fictiveReserveOut = parseEther("25");
    const priceAverageIn = parseEther("10");
    const priceAverageOut = parseEther("8");

    const result = await this.contracts.smardexLibraryTest.computeFirstTradeQtyOut(
      amountOut,
      fictiveReserveIn,
      fictiveReserveOut,
      priceAverageIn,
      priceAverageOut,
    );
    const fictiveReserveOutPredictedFees = fictiveReserveIn.mul(FEES_LP).mul(priceAverageOut).div(priceAverageIn);
    const toAdd = fictiveReserveOut.mul(FEES_TOTAL_REVERSED).mul(2).add(fictiveReserveOutPredictedFees);
    const toDiv = FEES_TOTAL_REVERSED.mul(2);
    const inSqrt = fictiveReserveOutPredictedFees
      .mul(fictiveReserveOut)
      .mul(4)
      .mul(FEES_TOTAL_REVERSED.mul(FEES_BASE.sub(FEES_POOL)))
      .div(FEES_LP)
      .add(fictiveReserveOutPredictedFees.mul(fictiveReserveOutPredictedFees));

    const firstAmountOut = toAdd.sub(sqrt(inSqrt)).div(toDiv);
    expect(firstAmountOut).to.be.eq(result);
  });

  it("with values", async function () {
    const values = [
      {
        amountOut: parseEther("1"),
        fictiveReserveIn: parseEther("51232.8575373919"),
        fictiveReserveOut: parseEther("8.09435352361766"),
        priceAverageIn: parseEther("8179.15409880139"),
        priceAverageOut: parseEther("1"),
        firstTradeQtyOut: parseEther("0.973627975529608052"),
      },
      {
        amountOut: parseEther("2"),
        fictiveReserveIn: parseEther("51232.8575373919"),
        fictiveReserveOut: parseEther("8.09435352361766"),
        priceAverageIn: parseEther("8179.15409880139"),
        priceAverageOut: parseEther("1"),
        firstTradeQtyOut: parseEther("0.973627975529608052"),
      },
      {
        amountOut: parseEther("10"),
        fictiveReserveIn: parseEther("24581.2259890568"),
        fictiveReserveOut: parseEther("12.4347215469229"),
        priceAverageIn: parseEther("8080.96396833419"),
        priceAverageOut: parseEther("1"),
        firstTradeQtyOut: parseEther("6.283758542863163637"),
      },
    ];

    for (const value of values) {
      const result = await this.contracts.smardexLibraryTest.computeFirstTradeQtyOut(
        value.amountOut,
        value.fictiveReserveIn,
        value.fictiveReserveOut,
        value.priceAverageIn,
        value.priceAverageOut,
      );
      expect(result).to.be.eq(value.firstTradeQtyOut);
    }
  });
}
