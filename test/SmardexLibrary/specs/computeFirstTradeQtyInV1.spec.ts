import { parseEther } from "ethers/lib/utils";
import { expect } from "chai";
import { sqrt } from "../../utils";
import { FEES_BASE, FEES_LP, FEES_POOL, FEES_TOTAL_REVERSED } from "../../constants";
import { SmardexLibraryTestV1 } from "../../../typechain";
export function shouldBehaveLikeComputeFirstTradeQtyInV1(): void {
  it("when _fictiveReserveOut * _priceAverageIn < _fictiveReserveIn * _priceAverageOut", async function () {
    const amountIn = parseEther("5");
    const fictiveReserveIn = parseEther("50");
    const fictiveReserveOut = parseEther("8");
    const priceAverageIn = parseEther("10");
    const priceAverageOut = parseEther("10");

    const result = await (this.contracts.smardexLibraryTest as SmardexLibraryTestV1).computeFirstTradeQtyIn(
      amountIn,
      fictiveReserveIn,
      fictiveReserveOut,
      priceAverageIn,
      priceAverageOut,
    );
    expect(amountIn).to.be.eq(result);
  });

  it("when _fictiveReserveOut * _priceAverageIn > _fictiveReserveIn * _priceAverageOut but no sqrt needed", async function () {
    const amountIn = parseEther("1");
    const fictiveReserveIn = parseEther("2500");
    const fictiveReserveOut = parseEther("2510");
    const priceAverageIn = parseEther("41");
    const priceAverageOut = parseEther("43");

    const result = await (this.contracts.smardexLibraryTest as SmardexLibraryTestV1).computeFirstTradeQtyIn(
      amountIn,
      fictiveReserveIn,
      fictiveReserveOut,
      priceAverageIn,
      priceAverageOut,
    );
    expect(amountIn).to.be.eq(result);
  });

  it("when _fictiveReserveOut * _priceAverageIn > _fictiveReserveIn * _priceAverageOut with sqrt needed", async function () {
    const amountIn = parseEther("17");
    const fictiveReserveIn = parseEther("5");
    const fictiveReserveOut = parseEther("25");
    const priceAverageIn = parseEther("10");
    const priceAverageOut = parseEther("8");

    let firstAmountOut = amountIn;

    const result = await (this.contracts.smardexLibraryTest as SmardexLibraryTestV1).computeFirstTradeQtyIn(
      amountIn,
      fictiveReserveIn,
      fictiveReserveOut,
      priceAverageIn,
      priceAverageOut,
    );

    const toSub = fictiveReserveIn.mul(FEES_BASE.add(FEES_TOTAL_REVERSED).sub(FEES_POOL));
    const toDiv = FEES_TOTAL_REVERSED.add(FEES_LP).mul(2);
    const inSqrt = fictiveReserveIn
      .mul(fictiveReserveOut)
      .mul(4)
      .div(priceAverageOut)
      .mul(priceAverageIn)
      .mul(FEES_TOTAL_REVERSED.mul(FEES_BASE.sub(FEES_POOL)))
      .add(fictiveReserveIn.mul(fictiveReserveIn).mul(FEES_LP.mul(FEES_LP)));

    if (inSqrt.lt(toSub.add(amountIn.mul(toDiv)).pow(2))) {
      firstAmountOut = sqrt(inSqrt).sub(toSub).div(toDiv);
    }

    expect(firstAmountOut).to.be.eq(result);
  });

  it("with values", async function () {
    const values = [
      {
        amountIn: parseEther("5"),
        fictiveReserveIn: parseEther("7.019550548110200"),
        fictiveReserveOut: parseEther("57860.36577503600"),
        priceAverageIn: parseEther("1"),
        priceAverageOut: parseEther("8196.46329884885"),
        firstTradeQtyIn: parseEther("0.019785294002649701"),
      },
      {
        amountIn: parseEther("2"),
        fictiveReserveIn: parseEther("6.414499702251450"),
        fictiveReserveOut: parseEther("52873.08588953010"),
        priceAverageIn: parseEther("1"),
        priceAverageOut: parseEther("8196.92611670422"),
        firstTradeQtyIn: parseEther("0.017898342044338691"),
      },
      {
        amountIn: parseEther("1"),
        fictiveReserveIn: parseEther("6.441406027101710"),
        fictiveReserveOut: parseEther("53094.86786642850"),
        priceAverageIn: parseEther("1"),
        priceAverageOut: parseEther("8197.83791416109"),
        firstTradeQtyIn: parseEther("0.017614278762289423"),
      },
    ];

    for (const value of values) {
      const result = await (this.contracts.smardexLibraryTest as SmardexLibraryTestV1).computeFirstTradeQtyIn(
        value.amountIn,
        value.fictiveReserveIn,
        value.fictiveReserveOut,
        value.priceAverageIn,
        value.priceAverageOut,
      );
      expect(result).to.be.eq(value.firstTradeQtyIn);
    }
  });
}
