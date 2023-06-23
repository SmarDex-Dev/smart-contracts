import { expect } from "chai";
import { parseEther } from "ethers/lib/utils";

export function shouldBehaveLikeInitializeFarming(): void {
  it("revert when initialized twice", async function () {
    await this.contracts.staking.initializeFarming();

    await expect(this.contracts.staking.initializeFarming()).to.be.revertedWith(
      "Staking::initializeFarming::Farming campaign already initialized",
    );
  });

  it("revert when not initialized", async function () {
    await expect(this.contracts.staking.deposit(parseEther("10"))).to.be.revertedWith(
      "Staking::isFarmingInitialized::Farming campaign not initialized",
    );
    await expect(this.contracts.staking.withdraw(this.signers.admin.address, parseEther("10"))).to.be.revertedWith(
      "Staking::isFarmingInitialized::Farming campaign not initialized",
    );
  });
}
