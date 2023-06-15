import { expect } from "chai";
import { latestBlockNumber, advanceBlockTo } from "../../helpers/time";
import { INITIAL_BONUS_REWARD_PER_BLOCK, BIGNUMBER_ZERO } from "../testData";
import { parseEther } from "ethers/lib/utils";
import { unitFixtureCampaignWith2rewards } from "../../fixtures";

export function shouldBehaveLikeRemoveRewardInfo() {
  describe("#removeLastRewardInfo()", async function () {
    context("With valid parameters", async function () {
      context("Simple test case before range", async function () {
        it("should remove last reward info from campaign", async function () {
          //prep work
          await unitFixtureCampaignWith2rewards(
            this.farming,
            this.signers.admin,
            INITIAL_BONUS_REWARD_PER_BLOCK,
            expect,
          );
          const balBefore = await this.farming.rewardToken.balanceOf(await this.signers.admin.getAddress());
          // now remove last reward info
          await expect(this.farming.farmingRangeAsDeployer.removeLastRewardInfo(0))
            .to.emit(this.farming.farmingRangeAsDeployer, "RemoveRewardInfo")
            .withArgs(0, 1);
          const length = await this.farming.farmingRangeAsDeployer.rewardInfoLen(0);
          expect(length).to.eq(1);
          expect(await this.farming.rewardToken.balanceOf(await this.signers.admin.getAddress())).to.be.gt(balBefore);
        });
      });
      context("When into range with 1 rewardInfo", async function () {
        it("should remove last and only reward info from campaign and check Alice rewards are distributed", async function () {
          const balBefore = await this.farming.rewardToken.balanceOf(await this.signers.admin.getAddress());

          const mintedReward = INITIAL_BONUS_REWARD_PER_BLOCK.mul(
            this.farming.mockedBlock.add(18).sub(this.farming.mockedBlock.add(8)),
          );
          // mint reward token to Deployer (when add rewardInfo)
          await this.farming.rewardTokenAsDeployer.mint(await this.signers.admin.getAddress(), mintedReward);
          // scenario: alice deposit #n amount staking token to the pool
          // when the time past, block number increase, alice expects to have her reward amount by calling `pendingReward()`
          // this scenario occurred between block #(mockedBlock+8)-..#(mockedBlock+18)
          await this.farming.farmingRangeAsDeployer.addCampaignInfo(
            this.farming.stakingToken.address,
            this.farming.rewardToken.address,
            this.farming.mockedBlock.add(8).toString(),
          );

          await this.farming.farmingRangeAsDeployer.addRewardInfo(
            0,
            this.farming.mockedBlock.add(18).toString(),
            INITIAL_BONUS_REWARD_PER_BLOCK,
          );
          // mint staking token to alice
          await this.farming.stakingTokenAsDeployer.mint(await this.signers.user.getAddress(), parseEther("100"));
          // alice approve farming range
          await this.farming.stakingTokenAsAlice.approve(this.farming.farmingRange.address, parseEther("100"));

          // alice deposit @block number #(mockedBlock+7)
          await this.farming.farmingRangeAsAlice.deposit(BIGNUMBER_ZERO, parseEther("100"));
          // alice call update campaign @block number #(mockedBlock+8)
          await this.farming.farmingRangeAsAlice.updateCampaign(BIGNUMBER_ZERO);
          const currentBlockNum = await latestBlockNumber();
          await advanceBlockTo(this.farming.mockedBlock.add(16).toNumber());
          // alice should expect to see her pending reward according to calculated reward per share and her deposit
          const expectedAccRewardPerShare = BIGNUMBER_ZERO; // reward per share = 0, since alice deposited before the block start, and calling update campaign on the start block
          expect((await this.farming.farmingRangeAsAlice.campaignInfo(0)).lastRewardBlock).to.eq(currentBlockNum);
          expect((await this.farming.farmingRangeAsAlice.campaignInfo(0)).accRewardPerShare).to.eq(
            expectedAccRewardPerShare,
          );

          // totalReward = (100 * 10) = 1000
          // reward per share = 1000/100 = 10 reward per share
          // alice deposit 100, thus will get overall of 1000 rewards individually
          expect(
            await this.farming.farmingRangeAsAlice.pendingReward(BIGNUMBER_ZERO, await this.signers.user.getAddress()),
          ).to.eq(parseEther("800"));
          // now remove last reward info
          await expect(this.farming.farmingRangeAsDeployer.removeLastRewardInfo(0))
            .to.emit(this.farming.farmingRangeAsDeployer, "RemoveRewardInfo")
            .withArgs(0, 0);
          const length = await this.farming.farmingRangeAsDeployer.rewardInfoLen(0);
          expect(length).to.eq(0);
          const actualBlock = await latestBlockNumber();
          const balanceRewardHolder = await this.farming.rewardToken.balanceOf(await this.signers.admin.getAddress());
          expect(balanceRewardHolder.sub(balBefore)).to.equal(
            mintedReward.sub(parseEther("100").mul(actualBlock.sub(this.farming.mockedBlock.add(8)))),
          );
          expect(
            await this.farming.farmingRangeAsAlice.pendingReward(BIGNUMBER_ZERO, await this.signers.user.getAddress()),
          ).to.eq(parseEther("100").mul(actualBlock.sub(this.farming.mockedBlock.add(8))));
          await advanceBlockTo(this.farming.mockedBlock.add(30).toNumber());
          await expect(this.farming.farmingRangeAsAlice.withdraw(0, parseEther("100"))).to.not.be.reverted;
          expect(await this.farming.rewardToken.balanceOf(await this.signers.user.getAddress())).to.eq(
            parseEther("100").mul(actualBlock.sub(this.farming.mockedBlock.add(8))),
          );
          expect(
            await this.farming.farmingRangeAsAlice.pendingReward(BIGNUMBER_ZERO, await this.signers.user.getAddress()),
          ).to.eq(0);
        });
      });
      context("When into range with 2 rewardInfo", async function () {
        it("should remove last reward info from campaign and check Alice rewards are distributed", async function () {
          const balBefore = await this.farming.rewardToken.balanceOf(await this.signers.admin.getAddress());

          const mintedReward = INITIAL_BONUS_REWARD_PER_BLOCK.mul(
            this.farming.mockedBlock.add(28).sub(this.farming.mockedBlock.add(8)),
          );
          await this.farming.rewardTokenAsDeployer.mint(await this.signers.admin.getAddress(), mintedReward);
          await this.farming.farmingRangeAsDeployer.addCampaignInfo(
            this.farming.stakingToken.address,
            this.farming.rewardToken.address,
            this.farming.mockedBlock.add(8).toString(),
          );

          await this.farming.farmingRangeAsDeployer.addRewardInfo(
            0,
            this.farming.mockedBlock.add(18).toString(),
            INITIAL_BONUS_REWARD_PER_BLOCK,
          );
          await this.farming.farmingRangeAsDeployer.addRewardInfo(
            0,
            this.farming.mockedBlock.add(28).toString(),
            INITIAL_BONUS_REWARD_PER_BLOCK,
          );
          await this.farming.stakingTokenAsDeployer.mint(await this.signers.user.getAddress(), parseEther("100"));
          await this.farming.stakingTokenAsAlice.approve(this.farming.farmingRange.address, parseEther("100"));

          // alice deposit @block number
          await this.farming.farmingRangeAsAlice.deposit(BIGNUMBER_ZERO, parseEther("100"));
          await this.farming.farmingRangeAsAlice.updateCampaign(BIGNUMBER_ZERO);

          const currentBlockNum = await latestBlockNumber();
          await advanceBlockTo(this.farming.mockedBlock.add(22).toNumber());

          // alice should expect to see her pending reward according to calculated reward per share and her deposit

          expect((await this.farming.farmingRangeAsAlice.campaignInfo(0)).lastRewardBlock).to.eq(currentBlockNum);
          expect((await this.farming.farmingRangeAsAlice.campaignInfo(0)).accRewardPerShare).to.be.gt(BIGNUMBER_ZERO);

          expect(
            await this.farming.farmingRangeAsAlice.pendingReward(BIGNUMBER_ZERO, await this.signers.user.getAddress()),
          ).to.eq(parseEther("100").mul(this.farming.mockedBlock.add(22).sub(this.farming.mockedBlock.add(8))));
          // now remove last reward info
          await expect(this.farming.farmingRangeAsDeployer.removeLastRewardInfo(0))
            .to.emit(this.farming.farmingRangeAsDeployer, "RemoveRewardInfo")
            .withArgs(0, 1);
          const length = await this.farming.farmingRangeAsDeployer.rewardInfoLen(0);
          expect(length).to.eq(1);
          const removeRewardBlock = await latestBlockNumber();
          const balanceRewardHolder = await this.farming.rewardToken.balanceOf(await this.signers.admin.getAddress());
          expect(balanceRewardHolder.sub(balBefore)).to.equal(
            mintedReward.sub(
              INITIAL_BONUS_REWARD_PER_BLOCK.mul(removeRewardBlock.sub(this.farming.mockedBlock.add(8))),
            ),
          );
          expect(await this.farming.farmingRangeAsAlice.pendingReward(0, await this.signers.user.getAddress())).to.eq(
            INITIAL_BONUS_REWARD_PER_BLOCK.mul(removeRewardBlock.sub(this.farming.mockedBlock.add(8))),
          );
          await advanceBlockTo(this.farming.mockedBlock.add(30).toNumber());
          await expect(this.farming.farmingRangeAsAlice.withdraw(0, parseEther("100"))).to.not.be.reverted;
          expect(await this.farming.rewardToken.balanceOf(await this.signers.user.getAddress())).to.eq(
            parseEther("100").mul(removeRewardBlock.sub(this.farming.mockedBlock.add(8))),
          );
          expect(await this.farming.farmingRangeAsAlice.pendingReward(0, await this.signers.user.getAddress())).to.eq(
            0,
          );
        });
      });
    });
    context("With invalid parameters", async function () {
      context("With Out of bound campaign", async function () {
        it("should revert the tx since an array of predefined campaigns is out of bound", async function () {
          const length = await unitFixtureCampaignWith2rewards(
            this.farming,
            this.signers.admin,
            INITIAL_BONUS_REWARD_PER_BLOCK,
          );
          expect(length).to.eq(2);
          // now remove last reward info
          await expect(this.farming.farmingRangeAsDeployer.removeLastRewardInfo(1)).to.be.reverted;
        });
      });
      context("With late block", async function () {
        it("should revert the tx since endBlock is already passed", async function () {
          await unitFixtureCampaignWith2rewards(
            this.farming,
            this.signers.admin,
            INITIAL_BONUS_REWARD_PER_BLOCK,
            expect,
          );
          const block = await latestBlockNumber();
          await advanceBlockTo(block.add(40).toNumber());
          // now remove last reward info
          await expect(this.farming.farmingRangeAsDeployer.removeLastRewardInfo(0)).to.be.revertedWith(
            "FarmingRange::removeLastRewardInfo::reward period ended",
          );
          const length = await this.farming.farmingRangeAsDeployer.rewardInfoLen(0);
          expect(length).to.eq(2);
        });
      });
      context("With no reward Info", async function () {
        it("should revert since there is no Reward Info in array", async function () {
          await this.farming.farmingRangeAsDeployer.addCampaignInfo(
            this.farming.stakingToken.address,
            this.farming.rewardToken.address,
            this.farming.mockedBlock.add(8).toString(),
          );

          let length = await this.farming.farmingRangeAsDeployer.rewardInfoLen(0);
          expect(length).to.eq(0);
          // now remove last reward info
          await expect(this.farming.farmingRangeAsDeployer.removeLastRewardInfo(0)).to.be.revertedWith(
            "FarmingRange::updateCampaignsRewards::no rewardInfoLen",
          );
          length = await this.farming.farmingRangeAsDeployer.rewardInfoLen(0);
          expect(length).to.eq(0);
        });
      });
    });
  });
}
