import { ethers } from "hardhat";
import { expect } from "chai";
import { constants } from "ethers";

export function shouldBehaveLikeFarmingRangeConstructorL2Arbitrum() {
  describe("#constructor()", async function () {
    it("should revert when parameter not defined", async function () {
      const factory = await ethers.getContractFactory("FarmingRangeL2Arbitrum");
      await expect(factory.deploy(constants.AddressZero)).to.be.revertedWith(
        "FarmingRange::constructor::Reward manager is not defined",
      );
    });
  });
}
