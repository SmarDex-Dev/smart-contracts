import { INITIAL_BONUS_REWARD_PER_BLOCK } from "../utils";
import { parseEther } from "ethers/lib/utils";
import { constants } from "ethers";
import { expect } from "chai";

export function shouldBehaveLikeEmergencyWithdraw() {
  describe("#emergencyWithdraw()", async function () {
    it("should return the correct deposit amount to the user", async function () {
      const mintedReward = INITIAL_BONUS_REWARD_PER_BLOCK.mul(
        this.farming.mockedBlock.add(10).sub(this.farming.mockedBlock.add(5)),
      );
      // mint reward token to Deployer (when add rewardInfo)
      await this.farming.rewardTokenAsDeployer.mint(this.signers.admin.address, mintedReward); // this scenario occurred between block #(mockedBlock+5)-..#(mockedBlock+10)
      await this.farming.farmingRangeAsDeployer.addCampaignInfo(
        this.farming.stakingToken.address,
        this.farming.rewardToken.address,
        this.farming.mockedBlock.add(5),
      );

      await this.farming.farmingRangeAsDeployer.addRewardInfo(
        0,
        this.farming.mockedBlock.add(10),
        INITIAL_BONUS_REWARD_PER_BLOCK,
      );
      // mint staking token to alice
      await this.farming.stakingTokenAsDeployer.mint(this.signers.user.address, parseEther("100"));
      // alice & bob approve farming range
      await this.farming.stakingTokenAsAlice.approve(this.farming.farmingRange.address, parseEther("100"));
      // alice deposit @block number #(mockedBlock+9)
      await this.farming.farmingRangeAsAlice.deposit(constants.Zero, parseEther("100"));
      expect(await this.farming.stakingToken.balanceOf(this.signers.user.address)).to.eq(constants.Zero);
      // alice withdraw from the campaign
      await this.farming.farmingRangeAsAlice.emergencyWithdraw(constants.Zero);
      expect((await this.farming.farmingRangeAsAlice.campaignInfo(0)).totalStaked).to.eq(0);
      expect(await this.farming.stakingToken.balanceOf(this.signers.user.address)).to.eq(parseEther("100"));
    });
    it("should reset all user's info", async function () {
      const mintedReward = INITIAL_BONUS_REWARD_PER_BLOCK.mul(
        this.farming.mockedBlock.add(10).sub(this.farming.mockedBlock.add(5)),
      );
      // mint reward token to Deployer (when add rewardInfo)
      await this.farming.rewardTokenAsDeployer.mint(this.signers.admin.address, mintedReward); // this scenario occurred between block #(mockedBlock+5)-..#(mockedBlock+10)
      await this.farming.farmingRangeAsDeployer.addCampaignInfo(
        this.farming.stakingToken.address,
        this.farming.rewardToken.address,
        this.farming.mockedBlock.add(5),
      );

      await this.farming.farmingRangeAsDeployer.addRewardInfo(
        0,
        this.farming.mockedBlock.add(10),
        INITIAL_BONUS_REWARD_PER_BLOCK,
      );
      // mint staking token to alice
      await this.farming.stakingTokenAsDeployer.mint(this.signers.user.address, parseEther("100"));
      // alice & bob approve farming range
      await this.farming.stakingTokenAsAlice.approve(this.farming.farmingRange.address, parseEther("100"));
      // alice deposit @block number #(mockedBlock+9)
      await this.farming.farmingRangeAsAlice.deposit(constants.Zero, parseEther("100"));
      let userInfo = await this.farming.farmingRangeAsAlice.userInfo(constants.Zero, this.signers.user.address);
      expect(await this.farming.stakingToken.balanceOf(this.signers.user.address)).to.eq(constants.Zero);
      expect(userInfo.amount).to.eq(parseEther("100"));
      expect(userInfo.rewardDebt).to.eq(constants.Zero);
      // alice withdraw from the campaign
      await this.farming.farmingRangeAsAlice.emergencyWithdraw(constants.Zero);
      userInfo = await this.farming.farmingRangeAsAlice.userInfo(constants.Zero, this.signers.user.address);
      expect(userInfo.amount).to.eq(constants.Zero);
      expect(userInfo.rewardDebt).to.eq(constants.Zero);
    });
  });
}
