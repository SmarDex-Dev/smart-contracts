import { expect } from "chai";
import { INITIAL_BONUS_REWARD_PER_BLOCK } from "../testData";
import { unitFixtureCampaignWith2rewards } from "../../fixtures";

export function shouldBehaveLikeUpdateRewardMultiple() {
  describe("#updateRewardMultiple()", async function () {
    context("When all parameters are valid", async function () {
      context("When all reward info valid", async function () {
        it("should be able to update the new reward info", async function () {
          await unitFixtureCampaignWith2rewards(
            this.farming,
            this.signers.admin,
            INITIAL_BONUS_REWARD_PER_BLOCK,
            expect,
          );
          await this.farming.farmingRangeAsDeployer.updateRewardMultiple(
            0,
            [0, 1],
            [this.farming.mockedBlock.add(10).toString(), this.farming.mockedBlock.add(19).toString()],
            [INITIAL_BONUS_REWARD_PER_BLOCK.sub(1), INITIAL_BONUS_REWARD_PER_BLOCK.sub(2)],
          );
          const updateRewardInfo = await this.farming.farmingRangeAsDeployer.campaignRewardInfo(0, 0);
          const length = await this.farming.farmingRangeAsDeployer.rewardInfoLen(0);
          expect(length).to.eq(2);
          expect(updateRewardInfo.rewardPerBlock).to.eq(INITIAL_BONUS_REWARD_PER_BLOCK.sub(1));
          expect(updateRewardInfo.endBlock).to.eq(this.farming.mockedBlock.add(10).toString());

          const updateRewardInfo2 = await this.farming.farmingRangeAsDeployer.campaignRewardInfo(0, 1);
          expect(updateRewardInfo2.rewardPerBlock).to.eq(INITIAL_BONUS_REWARD_PER_BLOCK.sub(2));
          expect(updateRewardInfo2.endBlock).to.eq(this.farming.mockedBlock.add(19).toString());
        });
      });
    });
    context("When some parameters are NOT valid", async function () {
      it("should revert campaign ID does not exist", async function () {
        await unitFixtureCampaignWith2rewards(this.farming, this.signers.admin, INITIAL_BONUS_REWARD_PER_BLOCK, expect);
        await expect(
          this.farming.farmingRangeAsDeployer.updateRewardMultiple(
            1,
            [0, 1],
            [this.farming.mockedBlock.add(12).toString(), this.farming.mockedBlock.add(21).toString()],
            [INITIAL_BONUS_REWARD_PER_BLOCK, INITIAL_BONUS_REWARD_PER_BLOCK.sub(1)],
          ),
        ).to.be.reverted;
      });
      it("should revert because of wrong parameters array length", async function () {
        await unitFixtureCampaignWith2rewards(this.farming, this.signers.admin, INITIAL_BONUS_REWARD_PER_BLOCK, expect);
        await expect(
          this.farming.farmingRangeAsDeployer.updateCampaignsRewards(
            [0],
            [[0]],
            [[this.farming.mockedBlock.add(15).toString(), this.farming.mockedBlock.add(19).toString()]],
            [[INITIAL_BONUS_REWARD_PER_BLOCK.sub(1)]],
          ),
        ).to.be.revertedWith("FarmingRange::updateRewardMultiple::wrong parameters length");
      });
    });
  });
  describe("#updateCampaignsRewards()", async function () {
    context("When all parameters are valid", async function () {
      context("When all reward info valid", async function () {
        it("should be able to update the new reward info", async function () {
          await unitFixtureCampaignWith2rewards(
            this.farming,
            this.signers.admin,
            INITIAL_BONUS_REWARD_PER_BLOCK,
            expect,
          );
          // and a 2nd campaign of rewards :
          const mintedRewardPhase1 = INITIAL_BONUS_REWARD_PER_BLOCK.mul(
            this.farming.mockedBlock.add(11).sub(this.farming.mockedBlock.add(8)),
          );
          const mintedRewardPhase2 = INITIAL_BONUS_REWARD_PER_BLOCK.add(1).mul(
            this.farming.mockedBlock.add(20).sub(this.farming.mockedBlock.add(11)),
          );
          const mintedReward = mintedRewardPhase1.add(mintedRewardPhase2);
          await this.farming.rewardTokenAsDeployer.mint(await this.signers.admin.getAddress(), mintedReward);
          await this.farming.farmingRangeAsDeployer.addCampaignInfo(
            this.farming.stakingToken.address,
            this.farming.rewardToken.address,
            this.farming.mockedBlock.add(20).toString(),
          );
          await this.farming.farmingRangeAsDeployer.setRewardInfoLimit(2);
          await this.farming.farmingRangeAsDeployer.addRewardInfo(
            1,
            this.farming.mockedBlock.add(24).toString(),
            INITIAL_BONUS_REWARD_PER_BLOCK,
          );

          await this.farming.farmingRangeAsDeployer.addRewardInfo(
            1,
            this.farming.mockedBlock.add(28).toString(),
            INITIAL_BONUS_REWARD_PER_BLOCK.add(1),
          );
          await this.farming.farmingRangeAsDeployer.updateCampaignsRewards(
            [0, 1],
            [[1], [0, 1]],
            [
              [this.farming.mockedBlock.add(19).toString()],
              [this.farming.mockedBlock.add(24).toString(), this.farming.mockedBlock.add(27).toString()],
            ],
            [
              [INITIAL_BONUS_REWARD_PER_BLOCK.sub(2)],
              [INITIAL_BONUS_REWARD_PER_BLOCK.sub(2), INITIAL_BONUS_REWARD_PER_BLOCK.sub(3)],
            ],
          );
          const updateRewardInfo = await this.farming.farmingRangeAsDeployer.campaignRewardInfo(0, 1);
          const length = await this.farming.farmingRangeAsDeployer.rewardInfoLen(0);
          expect(length).to.eq(2);
          expect(updateRewardInfo.rewardPerBlock).to.eq(INITIAL_BONUS_REWARD_PER_BLOCK.sub(2));
          expect(updateRewardInfo.endBlock).to.eq(this.farming.mockedBlock.add(19).toString());

          const updateRewardInfo2 = await this.farming.farmingRangeAsDeployer.campaignRewardInfo(1, 1);
          expect(updateRewardInfo2.rewardPerBlock).to.eq(INITIAL_BONUS_REWARD_PER_BLOCK.sub(3));
          expect(updateRewardInfo2.endBlock).to.eq(this.farming.mockedBlock.add(27).toString());
        });
      });
    });
    context("When some parameters are NOT valid", async function () {
      it("should revert campaign ID does not exist", async function () {
        const length = await unitFixtureCampaignWith2rewards(
          this.farming,
          this.signers.admin,
          INITIAL_BONUS_REWARD_PER_BLOCK,
        );
        expect(length).to.eq(2);
        await expect(
          this.farming.farmingRangeAsDeployer.updateCampaignsRewards(
            [2],
            [[0, 1]],
            [[this.farming.mockedBlock.add(12), this.farming.mockedBlock.add(21)]],
            [[INITIAL_BONUS_REWARD_PER_BLOCK, INITIAL_BONUS_REWARD_PER_BLOCK.sub(1)]],
          ),
        ).to.be.reverted;
      });
      it("should revert because of wrong length arrays of rewards parameters", async function () {
        await unitFixtureCampaignWith2rewards(this.farming, this.signers.admin, INITIAL_BONUS_REWARD_PER_BLOCK, expect);
        // and a 2nd campaign of rewards :
        const mintedRewardPhase1 = INITIAL_BONUS_REWARD_PER_BLOCK.mul(
          this.farming.mockedBlock.add(11).sub(this.farming.mockedBlock.add(8)),
        );
        const mintedRewardPhase2 = INITIAL_BONUS_REWARD_PER_BLOCK.add(1).mul(
          this.farming.mockedBlock.add(20).sub(this.farming.mockedBlock.add(11)),
        );
        const mintedReward = mintedRewardPhase1.add(mintedRewardPhase2);
        await this.farming.rewardTokenAsDeployer.mint(await this.signers.admin.getAddress(), mintedReward);
        await this.farming.farmingRangeAsDeployer.addCampaignInfo(
          this.farming.stakingToken.address,
          this.farming.rewardToken.address,
          this.farming.mockedBlock.add(20).toString(),
        );
        // set reward info limit
        await this.farming.farmingRangeAsDeployer.setRewardInfoLimit(2);
        // add the first reward info
        await this.farming.farmingRangeAsDeployer.addRewardInfo(
          1,
          this.farming.mockedBlock.add(24).toString(),
          INITIAL_BONUS_REWARD_PER_BLOCK,
        );

        await this.farming.farmingRangeAsDeployer.addRewardInfo(
          1,
          this.farming.mockedBlock.add(28).toString(),
          INITIAL_BONUS_REWARD_PER_BLOCK.add(1),
        );
        await expect(
          this.farming.farmingRangeAsDeployer.updateCampaignsRewards(
            [0, 1],
            [[0], [0, 1]],
            [
              [this.farming.mockedBlock.add(15).toString(), this.farming.mockedBlock.add(19).toString()],
              [this.farming.mockedBlock.add(19).toString()],
            ],
            [
              [INITIAL_BONUS_REWARD_PER_BLOCK.sub(1), INITIAL_BONUS_REWARD_PER_BLOCK.sub(2)],
              [INITIAL_BONUS_REWARD_PER_BLOCK.sub(2), INITIAL_BONUS_REWARD_PER_BLOCK.sub(3)],
            ],
          ),
        ).to.be.revertedWith("FarmingRange::updateRewardMultiple::wrong parameters length");
        await expect(
          this.farming.farmingRangeAsDeployer.updateCampaignsRewards(
            [0],
            [[0], [1]],
            [[this.farming.mockedBlock.add(15).toString(), this.farming.mockedBlock.add(19).toString()]],
            [[INITIAL_BONUS_REWARD_PER_BLOCK.sub(2), INITIAL_BONUS_REWARD_PER_BLOCK.sub(3)]],
          ),
        ).to.be.revertedWith("FarmingRange::updateCampaignsRewards::wrong rewardInfo length");
        await expect(
          this.farming.farmingRangeAsDeployer.updateCampaignsRewards(
            [0, 1],
            [[0], [0, 1]],
            [[this.farming.mockedBlock.add(15).toString()], [this.farming.mockedBlock.add(19).toString()]],
            [[INITIAL_BONUS_REWARD_PER_BLOCK.sub(1), INITIAL_BONUS_REWARD_PER_BLOCK.sub(2)]],
          ),
        ).to.be.revertedWith("FarmingRange::updateCampaignsRewards::wrong rewardInfo length");
      });
    });
  });
  describe("#addMultipleRewardInfo()", async function () {
    context("With valid parameters", async function () {
      it("should add 2 reward Info with events emitted", async function () {
        const mintedReward = INITIAL_BONUS_REWARD_PER_BLOCK.add(1).mul(
          this.farming.mockedBlock.add(18).sub(this.farming.mockedBlock.add(8)),
        );
        await this.farming.rewardTokenAsDeployer.mint(await this.signers.admin.getAddress(), mintedReward);
        await this.farming.farmingRangeAsDeployer.addCampaignInfo(
          this.farming.stakingToken.address,
          this.farming.rewardToken.address,
          this.farming.mockedBlock.add(8),
        );
        await expect(
          this.farming.farmingRangeAsDeployer.addRewardInfoMultiple(
            0,
            [this.farming.mockedBlock.add(11), this.farming.mockedBlock.add(18)],
            [INITIAL_BONUS_REWARD_PER_BLOCK, INITIAL_BONUS_REWARD_PER_BLOCK.add(1)],
          ),
        )
          .to.emit(this.farming.farmingRangeAsDeployer, "AddRewardInfo")
          .withArgs(0, 0, this.farming.mockedBlock.add(11).toString(), INITIAL_BONUS_REWARD_PER_BLOCK)
          .to.emit(this.farming.farmingRangeAsDeployer, "AddRewardInfo")
          .withArgs(0, 1, this.farming.mockedBlock.add(18).toString(), INITIAL_BONUS_REWARD_PER_BLOCK.add(1));
        const updateRewardInfo = await this.farming.farmingRangeAsDeployer.campaignRewardInfo(0, 0);
        expect(updateRewardInfo.rewardPerBlock).to.eq(INITIAL_BONUS_REWARD_PER_BLOCK);
        const updateRewardInfo2 = await this.farming.farmingRangeAsDeployer.campaignRewardInfo(0, 1);
        expect(updateRewardInfo2.rewardPerBlock).to.eq(INITIAL_BONUS_REWARD_PER_BLOCK.add(1));
      });
    });
    context("With NOT valid parameters", async function () {
      it("should add 2 reward Info with events emitted", async function () {
        await this.farming.farmingRangeAsDeployer.addCampaignInfo(
          this.farming.stakingToken.address,
          this.farming.rewardToken.address,
          this.farming.mockedBlock.add(8),
        );
        await expect(
          this.farming.farmingRangeAsDeployer.addRewardInfoMultiple(
            0,
            [this.farming.mockedBlock.add(11), this.farming.mockedBlock.add(18)],
            [INITIAL_BONUS_REWARD_PER_BLOCK],
          ),
        ).to.be.revertedWith("FarmingRange::addRewardMultiple::wrong parameters length");
        const rewardLength = await this.farming.farmingRangeAsDeployer.rewardInfoLen(0);
        expect(rewardLength).to.eq(0);
      });
    });
  });
}
