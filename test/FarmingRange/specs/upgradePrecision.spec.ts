import { INITIAL_BONUS_REWARD_PER_BLOCK } from "../testData";
import { expect } from "chai";
import { parseEther } from "ethers/lib/utils";
import { advanceBlockTo } from "../../helpers/time";
import { constants } from "ethers";

export function shouldBehaveLikeUpgradePrecision() {
  describe("#upgradePrecision()", async function () {
    it("should keep rewards", async function () {
      //prep work
      const mintedRewardPhase1 = INITIAL_BONUS_REWARD_PER_BLOCK.mul(
        this.farming.mockedBlock.add(11).sub(this.farming.mockedBlock.add(1)),
      );
      const mintedRewardPhase2 = INITIAL_BONUS_REWARD_PER_BLOCK.add(1).mul(
        this.farming.mockedBlock.add(20).sub(this.farming.mockedBlock.add(11)),
      );
      const mintedReward = mintedRewardPhase1.add(mintedRewardPhase2);
      await this.farming.rewardTokenAsDeployer.mint(this.signers.admin.address, mintedReward);
      await this.farming.stakingTokenAsDeployer.mint(this.signers.user.address, parseEther("100000"));

      await this.farming.farmingRangeAsDeployer.addCampaignInfo(
        this.farming.stakingToken.address,
        this.farming.rewardToken.address,
        this.farming.mockedBlock.add(1).toString(),
      );
      // set reward info limit
      await this.farming.farmingRangeAsDeployer.setRewardInfoLimit(2);
      // add the first reward info
      await this.farming.farmingRangeAsDeployer.addRewardInfo(
        0,
        this.farming.mockedBlock.add(12).toString(),
        INITIAL_BONUS_REWARD_PER_BLOCK,
      );
      await this.farming.farmingRangeAsDeployer.addRewardInfo(
        0,
        this.farming.mockedBlock.add(20).toString(),
        INITIAL_BONUS_REWARD_PER_BLOCK.add(1),
      );
      // Alice deposit
      await this.farming.stakingTokenAsAlice.approve(this.farming.farmingRangeAsAlice.address, constants.MaxUint256);
      await this.farming.farmingRangeAsAlice.deposit(0, parseEther("100000"));

      await advanceBlockTo(this.farming.mockedBlock.add(18).toNumber());

      const rewardCampaign0 = await this.farming.farmingRangeAsDeployer.campaignInfo(0);
      expect(rewardCampaign0.accRewardPerShare).to.eq(0);
      // Check Alice has pending rewards
      expect(await this.farming.farmingRangeAsAlice.pendingReward(0, this.signers.user.address)).to.eq(
        parseEther("1700"),
      );
      await expect(this.farming.farmingRangeAsDeployer.upgradePrecision()).to.not.be.reverted;
      await expect(this.farming.farmingRangeAsAlice.upgradePrecision()).to.be.reverted;
      await expect(this.farming.farmingRangeAsDeployer.massUpdateCampaigns()).to.not.be.reverted;
      const rewardCampaignAfterUpgrade = await this.farming.farmingRangeAsDeployer.campaignInfo(0);
      expect(rewardCampaignAfterUpgrade.accRewardPerShare).to.not.eq(0);
      // Check Alice still has her pending rewards
      expect(await this.farming.farmingRangeAsAlice.pendingReward(0, this.signers.user.address)).to.eq(
        parseEther("1900"),
      );
      await advanceBlockTo(this.farming.mockedBlock.add(30).toNumber());
      expect(await this.farming.farmingRangeAsAlice.pendingReward(0, this.signers.user.address)).to.eq(
        parseEther("1900"),
      );
      const rewardCampaignAfterUpgradeAtEnd = await this.farming.farmingRangeAsDeployer.campaignInfo(0);
      expect(rewardCampaignAfterUpgradeAtEnd.accRewardPerShare).to.not.eq(0);
    });
  });
}
