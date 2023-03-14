import { parseEther } from "ethers/lib/utils";
import { expect } from "chai";

export function shouldBehaveLikeComputeFictiveReserves(): void {
  it("when _reserveOut * _fictiveReserveIn < _reserveIn * _fictiveReserveOut", async function () {
    const reserveIn = parseEther("25");
    const reserveOut = parseEther("10");
    const fictiveReserveIn = parseEther("5");
    const fictiveReserveOut = parseEther("20");

    const tmp = reserveOut.mul(reserveOut).div(fictiveReserveOut).mul(fictiveReserveIn).div(reserveIn);
    let newReserveIn = tmp
      .mul(fictiveReserveIn)
      .div(fictiveReserveOut)
      .add(reserveOut.mul(fictiveReserveIn).div(fictiveReserveOut));
    let newReserveOut = reserveOut.add(tmp);

    newReserveIn = newReserveIn.div(4);
    newReserveOut = newReserveOut.div(4);

    const result = await this.contracts.smardexLibraryTest.computeFictiveReserves(
      reserveIn,
      reserveOut,
      fictiveReserveIn,
      fictiveReserveOut,
    );
    expect(newReserveIn).to.be.eq(result[0]);
    expect(newReserveOut).to.be.eq(result[1]);
  });

  it("when _reserveOut * _fictiveReserveIn >= _reserveIn * _fictiveReserveOut", async function () {
    const reserveIn = parseEther("5");
    const reserveOut = parseEther("25");
    const fictiveReserveIn = parseEther("10");
    const fictiveReserveOut = parseEther("8");

    let newReserveIn = fictiveReserveIn.mul(reserveOut).div(fictiveReserveOut).add(reserveIn);
    let newReserveOut = reserveIn.mul(fictiveReserveOut).div(fictiveReserveIn).add(reserveOut);

    newReserveIn = newReserveIn.div(4);
    newReserveOut = newReserveOut.div(4);

    const result = await this.contracts.smardexLibraryTest.computeFictiveReserves(
      reserveIn,
      reserveOut,
      fictiveReserveIn,
      fictiveReserveOut,
    );
    expect(newReserveIn).to.be.eq(result[0]);
    expect(newReserveOut).to.be.eq(result[1]);
  });

  it("with values", async function () {
    const values = [
      {
        reserveIn: parseEther("119492.838392173"),
        reserveOut: parseEther("13.8734347337491"),
        fictiveReserveIn: parseEther("58241.5115530842"),
        fictiveReserveOut: parseEther("7.12072554808806"),
        expectedReserveIn: parseEther("55307.329030031163856016"),
        expectedReserveOut: parseEther("6.761986430618317504"),
      },
      {
        reserveIn: parseEther("13.8648858013497"),
        reserveOut: parseEther("119555.797951391"),
        fictiveReserveIn: parseEther("6.45902911917269"),
        fictiveReserveOut: parseEther("52950.0738018244"),
        expectedReserveIn: parseEther("7.112176615688650553"),
        expectedReserveOut: parseEther("58304.471112302341135376"),
      },
      {
        reserveIn: parseEther("12.6684204629556"),
        reserveOut: parseEther("103877.534648498"),
        fictiveReserveIn: parseEther("6.33283756965643"),
        fictiveReserveOut: parseEther("51951.1238260364"),
        expectedReserveIn: parseEther("6.329892508211233858"),
        expectedReserveOut: parseEther("51926.964158252125695036"),
      },
    ];

    for (const value of values) {
      const result = await this.contracts.smardexLibraryTest.computeFictiveReserves(
        value.reserveIn,
        value.reserveOut,
        value.fictiveReserveIn,
        value.fictiveReserveOut,
      );
      expect(value.expectedReserveIn).to.be.eq(result[0]);
      expect(value.expectedReserveOut).to.be.eq(result[1]);
    }
  });
}
