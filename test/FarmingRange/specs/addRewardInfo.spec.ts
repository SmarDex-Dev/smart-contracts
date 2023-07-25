import { expect } from "chai";
import { INITIAL_BONUS_REWARD_PER_BLOCK } from "../utils";
import { advanceBlockTo } from "../../helpers/time";

export function shouldBehaveLikeAddRewardInfo() {
  describe("#addRewardInfo()", async function () {
    context("When all parameters are valid", async function () {
      context("When the reward info is still within the limit", async function () {
        it("should still be able to push the new reward info with the latest as the newly pushed reward info", async function () {
          const mintedRewardPhase1 = INITIAL_BONUS_REWARD_PER_BLOCK.mul(
            this.farming.mockedBlock.add(11).sub(this.farming.mockedBlock.add(8)),
          );
          const mintedRewardPhase2 = INITIAL_BONUS_REWARD_PER_BLOCK.add(1).mul(
            this.farming.mockedBlock.add(20).sub(this.farming.mockedBlock.add(11)),
          );
          const mintedReward = mintedRewardPhase1.add(mintedRewardPhase2);
          await this.farming.rewardTokenAsDeployer.mint(this.signers.admin.address, mintedReward);
          await this.farming.farmingRangeAsDeployer.addCampaignInfo(
            this.farming.stakingToken.address,
            this.farming.rewardToken.address,
            this.farming.mockedBlock.add(8),
          );
          let length = await this.farming.farmingRangeAsDeployer.rewardInfoLen(0);
          expect(length).to.eq(0);
          // add the first reward info
          await this.farming.farmingRangeAsDeployer.addRewardInfo(
            0,
            this.farming.mockedBlock.add(11),
            INITIAL_BONUS_REWARD_PER_BLOCK,
          );
          length = await this.farming.farmingRangeAsDeployer.rewardInfoLen(0);
          expect(length).to.eq(1);

          await this.farming.farmingRangeAsDeployer.addRewardInfo(
            0,
            this.farming.mockedBlock.add(20),
            INITIAL_BONUS_REWARD_PER_BLOCK.add(1),
          );
          const rewardInfo = await this.farming.farmingRangeAsDeployer.campaignRewardInfo(0, 1);
          length = await this.farming.farmingRangeAsDeployer.rewardInfoLen(0);
          expect(length).to.eq(2);
          expect(rewardInfo.rewardPerBlock).to.eq(INITIAL_BONUS_REWARD_PER_BLOCK.add(1));
          expect(rewardInfo.endBlock).to.eq(this.farming.mockedBlock.add(20));
        });
      });
    });
    context("When some parameters are invalid", async function () {
      context("When the caller isn't the owner", async function () {
        it("should reverted since there is a modifier only owner validating the ownership", async function () {
          const mintedReward = INITIAL_BONUS_REWARD_PER_BLOCK.mul(
            this.farming.mockedBlock.add(11).sub(this.farming.mockedBlock.add(8)),
          );
          await this.farming.rewardTokenAsDeployer.mint(this.signers.admin.address, mintedReward);
          await this.farming.farmingRangeAsDeployer.addCampaignInfo(
            this.farming.stakingToken.address,
            this.farming.rewardToken.address,
            this.farming.mockedBlock.add(8),
          );
          await expect(
            this.farming.farmingRangeAsAlice.addRewardInfo(
              0,
              this.farming.mockedBlock.add(11),
              INITIAL_BONUS_REWARD_PER_BLOCK,
            ),
          ).to.be.reverted;
        });
      });
      context("When reward info exceed the limit", async function () {
        it("should reverted since the length of reward info exceed the limit", async function () {
          const mintedReward = INITIAL_BONUS_REWARD_PER_BLOCK.mul(
            this.farming.mockedBlock.add(11).sub(this.farming.mockedBlock.add(8)),
          );
          await this.farming.rewardTokenAsDeployer.mint(await this.signers.admin.getAddress(), mintedReward);
          await this.farming.farmingRangeAsDeployer.addCampaignInfo(
            this.farming.stakingToken.address,
            this.farming.rewardToken.address,
            this.farming.mockedBlock.add(8),
          );
          // set reward info limit to 1
          await this.farming.farmingRangeAsDeployer.setRewardInfoLimit(1);
          // add the first reward info
          await this.farming.farmingRangeAsDeployer.addRewardInfo(
            0,
            this.farming.mockedBlock.add(11),
            INITIAL_BONUS_REWARD_PER_BLOCK,
          );
          await expect(
            this.farming.farmingRangeAsDeployer.addRewardInfo(
              0,
              this.farming.mockedBlock.add(11),
              INITIAL_BONUS_REWARD_PER_BLOCK,
            ),
          ).to.be.revertedWith("FarmingRange::addRewardInfo::reward info length exceeds the limit");
        });
      });
      context("When the newly added reward info endblock is less that the start block", async function () {
        it("should be reverted", async function () {
          const mintedReward = INITIAL_BONUS_REWARD_PER_BLOCK.mul(
            this.farming.mockedBlock.add(11).sub(this.farming.mockedBlock.add(8)),
          );
          await this.farming.rewardTokenAsDeployer.mint(this.signers.admin.address, mintedReward);
          await this.farming.farmingRangeAsDeployer.addCampaignInfo(
            this.farming.stakingToken.address,
            this.farming.rewardToken.address,
            this.farming.mockedBlock.add(8),
          );
          // add the first reward info
          await expect(
            this.farming.farmingRangeAsDeployer.addRewardInfo(
              0,
              this.farming.mockedBlock.sub(1),
              INITIAL_BONUS_REWARD_PER_BLOCK,
            ),
          ).to.reverted;
        });
      });
      context("When newly added reward info endblock is less than current end block", async function () {
        it("should reverted with the message FarmingRange::addRewardInfo::bad new endblock", async function () {
          const mintedReward = INITIAL_BONUS_REWARD_PER_BLOCK.mul(
            this.farming.mockedBlock.add(11).sub(this.farming.mockedBlock.add(8)),
          );
          await this.farming.rewardTokenAsDeployer.mint(this.signers.admin.address, mintedReward);
          await this.farming.farmingRangeAsDeployer.addCampaignInfo(
            this.farming.stakingToken.address,
            this.farming.rewardToken.address,
            this.farming.mockedBlock.add(8),
          );
          // add the first reward info
          await this.farming.farmingRangeAsDeployer.addRewardInfo(
            0,
            this.farming.mockedBlock.add(11),
            INITIAL_BONUS_REWARD_PER_BLOCK,
          );
          await expect(
            this.farming.farmingRangeAsDeployer.addRewardInfo(
              0,
              this.farming.mockedBlock.add(1),
              INITIAL_BONUS_REWARD_PER_BLOCK,
            ),
          ).to.be.revertedWith("FarmingRange::addRewardInfo::bad new endblock");
        });
      });
      context("When the current reward period has ended", async function () {
        it("should reverted with the message FarmingRange::addRewardInfo::reward period ended", async function () {
          const mintedRewardPhase1 = INITIAL_BONUS_REWARD_PER_BLOCK.mul(
            this.farming.mockedBlock.add(10).sub(this.farming.mockedBlock.add(8)),
          );
          const mintedRewardPhase2 = INITIAL_BONUS_REWARD_PER_BLOCK.mul(
            this.farming.mockedBlock.add(12).sub(this.farming.mockedBlock.add(10)),
          );
          const mintedReward = mintedRewardPhase1.add(mintedRewardPhase2);
          await this.farming.rewardTokenAsDeployer.mint(this.signers.admin.address, mintedReward);
          await this.farming.farmingRangeAsDeployer.addCampaignInfo(
            this.farming.stakingToken.address,
            this.farming.rewardToken.address,
            this.farming.mockedBlock.add(8),
          );
          // add the first reward info
          // with block number + 10
          await this.farming.farmingRangeAsDeployer.addRewardInfo(
            0,
            this.farming.mockedBlock.add(10),
            INITIAL_BONUS_REWARD_PER_BLOCK,
          );
          await advanceBlockTo(this.farming.mockedBlock.add(11).toNumber());
          //this called method is invoked on blockNumber + 12
          await expect(
            this.farming.farmingRangeAsDeployer.addRewardInfo(
              0,
              this.farming.mockedBlock.add(12),
              INITIAL_BONUS_REWARD_PER_BLOCK,
            ),
          ).to.be.revertedWith("FarmingRange::addRewardInfo::reward period ended");
        });
      });
    });
  });
}
