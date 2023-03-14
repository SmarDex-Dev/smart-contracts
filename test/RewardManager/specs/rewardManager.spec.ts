import { expect } from "chai";
import { constants } from "ethers";
import { parseEther } from "ethers/lib/utils";
import { FarmingRange__factory } from "../../../typechain";
import { INITIAL_BONUS_REWARD_PER_BLOCK } from "../../FarmingRange/testData";

export function shouldBehaveLikeRewardManager() {
  describe("Constructor and init", async function () {
    it("should have deployed address for Staking", async function () {
      expect(await this.contracts.rewardManager.staking()).to.not.eq(constants.AddressZero);
    });
    it("should have deployed address for Farming with owner set", async function () {
      const farmingAddress = await this.contracts.rewardManager.farming();
      expect(farmingAddress).to.not.eq(constants.AddressZero);
      const farmingContract = FarmingRange__factory.connect(farmingAddress, this.signers.admin);
      expect(await farmingContract.owner()).to.eq(this.signers.admin.address);
    });
    context("When reward Manager is a contract", function () {
      it("should be able to add reward info and approve reward tokens on reward Manager", async function () {
        const farmingAddress = await this.contracts.rewardManager.farming();
        const farmingContract = FarmingRange__factory.connect(farmingAddress, this.signers.admin);
        await this.contracts.smardexToken.transfer(this.contracts.rewardManager.address, parseEther("10000"));

        const balance = await this.contracts.smardexToken.balanceOf(this.contracts.rewardManager.address);

        expect((await farmingContract.campaignInfo(0)).rewardToken).to.eq(this.contracts.smardexToken.address);

        // add the first reward info
        expect(
          await this.contracts.smardexToken.allowance(this.contracts.rewardManager.address, farmingContract.address),
        ).to.eq(0);
        await farmingContract.addRewardInfo(0, this.misc.startBlock.add(11).toString(), INITIAL_BONUS_REWARD_PER_BLOCK);
        //If allowance if more than 0 then resetAllowance worked
        expect(
          await this.contracts.smardexToken.allowance(this.contracts.rewardManager.address, farmingContract.address),
        ).to.eq(constants.MaxUint256);
        // and then reward info added should work smoothly
        await farmingContract.addRewardInfo(
          0,
          this.misc.startBlock.add(20).toString(),
          INITIAL_BONUS_REWARD_PER_BLOCK.add(1),
        );
        //and balance should be diminished on rewardmanager
        const balance_after = await this.contracts.smardexToken.balanceOf(this.contracts.rewardManager.address);
        expect(balance_after).to.be.lt(balance);
      });

      it("should be able to call resetAllowance for the token rewarded in a campaign and set the allowance to max", async function () {
        const farmingAddress = await this.contracts.rewardManager.farming();
        const farmingContract = FarmingRange__factory.connect(farmingAddress, this.signers.admin);

        expect(
          await this.contracts.smardexToken.allowance(this.contracts.rewardManager.address, farmingContract.address),
        ).to.eq(0);

        await this.contracts.rewardManager.resetAllowance(0);
        expect(
          await this.contracts.smardexToken.allowance(this.contracts.rewardManager.address, farmingContract.address),
        ).to.eq(constants.MaxUint256);
      });

      it("should revert when calling resetAllowance to an non existent campaign id", async function () {
        await expect(this.contracts.rewardManager.resetAllowance(1)).to.revertedWith(
          "RewardHolder:campaignId:wrong campaign ID",
        );
      });
    });
    context("When reward Manager does not have reward tokens", function () {
      it("should be able to add reward info and approve reward tokens on reward Manager", async function () {
        const farmingAddress = await this.contracts.rewardManager.farming();
        const farmingContract = FarmingRange__factory.connect(farmingAddress, this.signers.admin);

        expect((await farmingContract.campaignInfo(0)).rewardToken).to.eq(this.contracts.smardexToken.address);
        // we dont have tokens !
        await expect(
          farmingContract.addRewardInfo(0, this.misc.startBlock.add(11).toString(), INITIAL_BONUS_REWARD_PER_BLOCK),
        ).to.be.reverted;
      });
    });
    it("should have reward Manager in farming contract", async function () {
      const farmingAddress = await this.contracts.rewardManager.farming();
      expect(farmingAddress).to.not.eq(constants.AddressZero);
      const farmingContract = FarmingRange__factory.connect(farmingAddress, this.signers.admin);
      expect(await farmingContract.rewardManager()).to.eq(this.contracts.rewardManager.address);
    });
  });
}
