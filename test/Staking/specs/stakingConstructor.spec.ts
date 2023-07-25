import { ethers } from "hardhat";
import { expect } from "chai";
import { constants } from "ethers";

export function shouldBehaveLikeStakingConstructor() {
  it("should revert when parameter not defined", async function () {
    const factory = await ethers.getContractFactory("Staking");
    await expect(factory.deploy(constants.AddressZero, constants.AddressZero)).to.be.revertedWith(
      "Staking::constructor::Smardex token is not defined",
    );
    await expect(factory.deploy(this.contracts.smardexTokenTest.address, constants.AddressZero)).to.be.revertedWith(
      "Staking::constructor::Farming is not defined",
    );
  });
}
