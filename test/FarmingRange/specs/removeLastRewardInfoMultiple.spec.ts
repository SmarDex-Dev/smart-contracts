import { expect } from "chai";
import { INITIAL_BONUS_REWARD_PER_BLOCK } from "../utils";
import { unitFixtureCampaignWith2rewards } from "../../fixtures";

export function shouldBehaveLikeRemoveLastRewardInfoMultiple() {
  describe("#removeLastRewardInfoMultiple()", async function () {
    context("With valid parameters", async function () {
      it("should remove last reward info from campaign", async function () {
        await unitFixtureCampaignWith2rewards(this.farming, this.signers.admin, INITIAL_BONUS_REWARD_PER_BLOCK, expect);
        const balBefore = await this.farming.rewardToken.balanceOf(this.signers.admin.address);

        await expect(this.farming.farmingRangeAsDeployer.removeLastRewardInfoMultiple(0, 1))
          .to.emit(this.farming.farmingRangeAsDeployer, "RemoveRewardInfo")
          .withArgs(0, 1);

        const length = await this.farming.farmingRangeAsDeployer.rewardInfoLen(0);
        expect(length).to.eq(1);
        expect(await this.farming.rewardToken.balanceOf(this.signers.admin.address)).to.be.gt(balBefore);
      });
      it("should remove last multiple rewards info from campaign", async function () {
        await unitFixtureCampaignWith2rewards(this.farming, this.signers.admin, INITIAL_BONUS_REWARD_PER_BLOCK, expect);
        const balBefore = await this.farming.rewardToken.balanceOf(this.signers.admin.address);

        await expect(this.farming.farmingRangeAsDeployer.removeLastRewardInfoMultiple(0, 2))
          .to.emit(this.farming.farmingRangeAsDeployer, "RemoveRewardInfo")
          .withArgs(0, 1)
          .and.to.emit(this.farming.farmingRangeAsDeployer, "RemoveRewardInfo")
          .withArgs(0, 0);

        const length = await this.farming.farmingRangeAsDeployer.rewardInfoLen(0);
        expect(length).to.eq(0);
        expect(await this.farming.rewardToken.balanceOf(this.signers.admin.address)).to.be.gt(balBefore);
      });
    });
    context("With invalid parameters", async function () {
      it("should revert the tx since caller != owner", async function () {
        await unitFixtureCampaignWith2rewards(this.farming, this.signers.admin, INITIAL_BONUS_REWARD_PER_BLOCK, expect);
        const balBefore = await this.farming.rewardToken.balanceOf(this.signers.admin.address);

        await expect(this.farming.farmingRangeAsAlice.removeLastRewardInfoMultiple(0, 1)).to.be.revertedWith(
          "Ownable: caller is not the owner",
        );

        const length = await this.farming.farmingRangeAsDeployer.rewardInfoLen(0);
        expect(length).to.eq(2);
        expect(await this.farming.rewardToken.balanceOf(this.signers.admin.address)).to.be.eq(balBefore);
      });
      it("should revert the tx since too many rewards info to remove", async function () {
        const length = await unitFixtureCampaignWith2rewards(
          this.farming,
          this.signers.admin,
          INITIAL_BONUS_REWARD_PER_BLOCK,
        );
        expect(length).to.eq(2);

        await expect(this.farming.farmingRangeAsDeployer.removeLastRewardInfoMultiple(0, 3)).to.be.revertedWith(
          "FarmingRange::updateCampaignsRewards::no rewardInfoLen",
        );
      });
      it("should revert the tx since an array of predefined campaigns is out of bound", async function () {
        await unitFixtureCampaignWith2rewards(this.farming, this.signers.admin, INITIAL_BONUS_REWARD_PER_BLOCK);

        await expect(this.farming.farmingRangeAsDeployer.removeLastRewardInfoMultiple(1, 1)).to.be.reverted;
      });
      it("should revert the tx since _number = 0", async function () {
        await unitFixtureCampaignWith2rewards(this.farming, this.signers.admin, INITIAL_BONUS_REWARD_PER_BLOCK);

        await expect(this.farming.farmingRangeAsDeployer.removeLastRewardInfoMultiple(0, 0)).to.be.revertedWith(
          "FarmingRange::removeLastRewardInfoMultiple::number should be > 0",
        );
      });
      it("should revert since there is no Reward Info in array", async function () {
        await this.farming.farmingRangeAsDeployer.addCampaignInfo(
          this.farming.stakingToken.address,
          this.farming.rewardToken.address,
          this.farming.mockedBlock.add(8),
        );

        let length = await this.farming.farmingRangeAsDeployer.rewardInfoLen(0);
        expect(length).to.eq(0);

        await expect(this.farming.farmingRangeAsDeployer.removeLastRewardInfoMultiple(0, 1)).to.be.revertedWith(
          "FarmingRange::updateCampaignsRewards::no rewardInfoLen",
        );

        length = await this.farming.farmingRangeAsDeployer.rewardInfoLen(0);
        expect(length).to.eq(0);
      });
    });
  });
}
