import { ethers } from "hardhat";
import { expect } from "chai";
import { constants } from "ethers";

export function shouldBehaveLikeFarmingConstructor() {
  describe("#constructor()", async function () {
    it("should revert when parameter not defined", async function () {
      const factory = await ethers.getContractFactory("FarmingRange");
      await expect(factory.deploy(constants.AddressZero)).to.be.revertedWith(
        "FarmingRange::constructor::Reward manager is not defined",
      );
    });
  });
}
