import { expect } from "chai";
import { parseEther } from "ethers/lib/utils";
import { MINIMUM_SHARES, parseShare } from "../utils";

export function shouldBehaveLikeCheckUserBlock(): void {
  beforeEach(async function () {
    await this.contracts.staking.initializeFarming();
  });

  it("pass in 2 different transactions", async function () {
    await this.contracts.staking.deposit(parseEther("10"));
    await this.contracts.staking.withdraw(this.signers.admin.address, parseShare(parseEther("10")).sub(MINIMUM_SHARES));
  });

  it("revert when in one transaction", async function () {
    await this.contracts.smardexTokenTest.transfer(this.contracts.checkBlockTest.address, parseEther("10"));
    await expect(this.contracts.checkBlockTest.exploitStaking(parseEther("10"))).to.be.revertedWith(
      "Staking::checkUserBlock::User already called deposit or withdraw this block",
    );
  });
}
