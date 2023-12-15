import { parseEther } from "ethers/lib/utils";
import { expect } from "chai";
import { SmardexLibraryTest } from "../../../typechain";

export function shouldBehaveLikeApproxEq(): void {
  it("Perfect equality", async function () {
    const values = [
      0,
      1,
      50,
      1_000_000,
      100_000_000,
      parseEther("0.01"),
      parseEther("1"),
      parseEther("100"),
      parseEther("125478.256154789652365878"),
    ];

    for (const a of values) {
      expect(await (this.contracts.smardexLibraryTest as SmardexLibraryTest).approxEq(a, a)).to.be.true;
    }
  });

  it("Approx equality", async function () {
    const values = [
      [10_000_000, 10_000_009],
      [parseEther("1.0000009"), parseEther("1")],
      [parseEther("125478.381633045807155529"), parseEther("125478.256154789652365878")],
    ];

    for (const [a, b] of values) {
      expect(await (this.contracts.smardexLibraryTest as SmardexLibraryTest).approxEq(a, b)).to.be.true;
    }
  });

  it("Not Equal", async function () {
    const values = [
      [0, 1],
      [1, 2],
      [10, 20],
      [50, 51],
      [1_000_000, 1_000_001],
      [10_000_000, 10_000_010],
      [parseEther("1.0000010"), parseEther("1")],
      [parseEther("125478.381633045807155529").add(1), parseEther("125478.256154789652365878")],
    ];

    for (const [a, b] of values) {
      expect(await (this.contracts.smardexLibraryTest as SmardexLibraryTest).approxEq(a, b)).to.be.false;
    }
  });
}
