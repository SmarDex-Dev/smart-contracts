import { expect } from "chai";
import { advanceBlockTo, latestBlockNumber } from "../../helpers/time";
import { INITIAL_BONUS_REWARD_PER_BLOCK } from "../utils";
import { parseEther } from "ethers/lib/utils";
import { unitFixtureCampaignWith2rewards } from "../../fixtures";
import { constants, BigNumber } from "ethers";

const INITIAL_BALANCE = constants.MaxUint256;
const REWARD_INFO_DURATION: number = 86400; // arbitrary one day

export function shouldBehaveLikeRemoveLastRewardInfo() {
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
          const balBefore = await this.farming.rewardToken.balanceOf(this.signers.admin.address);
          // now remove last reward info
          await expect(this.farming.farmingRangeAsDeployer.removeLastRewardInfo(0))
            .to.emit(this.farming.farmingRangeAsDeployer, "RemoveRewardInfo")
            .withArgs(0, 1);
          const length = await this.farming.farmingRangeAsDeployer.rewardInfoLen(0);
          expect(length).to.eq(1);
          expect(await this.farming.rewardToken.balanceOf(this.signers.admin.address)).to.be.gt(balBefore);
        });
      });
      context("When into range with 1 rewardInfo", async function () {
        it("should remove last and only reward info from campaign and check Alice rewards are distributed", async function () {
          const balBefore = await this.farming.rewardToken.balanceOf(this.signers.admin.address);

          const mintedReward = INITIAL_BONUS_REWARD_PER_BLOCK.mul(
            this.farming.mockedBlock.add(18).sub(this.farming.mockedBlock.add(8)),
          );
          // mint reward token to Deployer (when add rewardInfo)
          await this.farming.rewardTokenAsDeployer.mint(this.signers.admin.address, mintedReward);
          // scenario: alice deposit #n amount staking token to the pool
          // when the time past, block number increase, alice expects to have her reward amount by calling `pendingReward()`
          // this scenario occurred between block #(mockedBlock+8)-..#(mockedBlock+18)
          await this.farming.farmingRangeAsDeployer.addCampaignInfo(
            this.farming.stakingToken.address,
            this.farming.rewardToken.address,
            this.farming.mockedBlock.add(8),
          );

          await this.farming.farmingRangeAsDeployer.addRewardInfo(
            0,
            this.farming.mockedBlock.add(18),
            INITIAL_BONUS_REWARD_PER_BLOCK,
          );
          // mint staking token to alice
          await this.farming.stakingTokenAsDeployer.mint(this.signers.user.address, parseEther("100"));
          // alice approve farming range
          await this.farming.stakingTokenAsAlice.approve(this.farming.farmingRange.address, parseEther("100"));

          // alice deposit @block number #(mockedBlock+7)
          await this.farming.farmingRangeAsAlice.deposit(constants.Zero, parseEther("100"), this.signers.user.address);
          // alice call update campaign @block number #(mockedBlock+8)
          await this.farming.farmingRangeAsAlice.updateCampaign(constants.Zero);
          const currentBlockNum = await latestBlockNumber();
          await advanceBlockTo(this.farming.mockedBlock.add(16).toNumber());
          // alice should expect to see her pending reward according to calculated reward per share and her deposit
          const expectedAccRewardPerShare = constants.Zero; // reward per share = 0, since alice deposited before the block start, and calling update campaign on the start block
          expect((await this.farming.farmingRangeAsAlice.campaignInfo(0)).lastRewardBlock).to.eq(currentBlockNum);
          expect((await this.farming.farmingRangeAsAlice.campaignInfo(0)).accRewardPerShare).to.eq(
            expectedAccRewardPerShare,
          );

          // totalReward = (100 * 10) = 1000
          // reward per share = 1000/100 = 10 reward per share
          // alice deposit 100, thus will get overall of 1000 rewards individually
          expect(await this.farming.farmingRangeAsAlice.pendingReward(constants.Zero, this.signers.user.address)).to.eq(
            parseEther("800"),
          );
          // now remove last reward info
          await expect(this.farming.farmingRangeAsDeployer.removeLastRewardInfo(0))
            .to.emit(this.farming.farmingRangeAsDeployer, "RemoveRewardInfo")
            .withArgs(0, 0);
          const length = await this.farming.farmingRangeAsDeployer.rewardInfoLen(0);
          expect(length).to.eq(0);
          const actualBlock = await latestBlockNumber();
          const balanceRewardHolder = await this.farming.rewardToken.balanceOf(this.signers.admin.address);
          expect(balanceRewardHolder.sub(balBefore)).to.equal(
            mintedReward.sub(parseEther("100").mul(actualBlock.sub(this.farming.mockedBlock.add(8)))),
          );
          expect(await this.farming.farmingRangeAsAlice.pendingReward(constants.Zero, this.signers.user.address)).to.eq(
            parseEther("100").mul(actualBlock.sub(this.farming.mockedBlock.add(8))),
          );
          await advanceBlockTo(this.farming.mockedBlock.add(30).toNumber());
          await expect(
            this.farming.farmingRangeAsAlice.withdraw(
              0,
              parseEther("100"),
              this.signers.user.address,
              this.signers.user.address,
            ),
          ).to.not.be.reverted;
          expect(await this.farming.rewardToken.balanceOf(this.signers.user.address)).to.eq(
            parseEther("100").mul(actualBlock.sub(this.farming.mockedBlock.add(8))),
          );
          expect(await this.farming.farmingRangeAsAlice.pendingReward(constants.Zero, this.signers.user.address)).to.eq(
            0,
          );
        });
      });
      context("When into range with 2 rewardInfo", async function () {
        it("should remove last reward info from campaign and check Alice rewards are distributed", async function () {
          const balBefore = await this.farming.rewardToken.balanceOf(this.signers.admin.address);

          const mintedReward = INITIAL_BONUS_REWARD_PER_BLOCK.mul(
            this.farming.mockedBlock.add(28).sub(this.farming.mockedBlock.add(8)),
          );
          await this.farming.rewardTokenAsDeployer.mint(this.signers.admin.address, mintedReward);
          await this.farming.farmingRangeAsDeployer.addCampaignInfo(
            this.farming.stakingToken.address,
            this.farming.rewardToken.address,
            this.farming.mockedBlock.add(8),
          );

          await this.farming.farmingRangeAsDeployer.addRewardInfo(
            0,
            this.farming.mockedBlock.add(18),
            INITIAL_BONUS_REWARD_PER_BLOCK,
          );
          await this.farming.farmingRangeAsDeployer.addRewardInfo(
            0,
            this.farming.mockedBlock.add(28),
            INITIAL_BONUS_REWARD_PER_BLOCK,
          );
          await this.farming.stakingTokenAsDeployer.mint(this.signers.user.address, parseEther("100"));
          await this.farming.stakingTokenAsAlice.approve(this.farming.farmingRange.address, parseEther("100"));

          // alice deposit @block number
          await this.farming.farmingRangeAsAlice.deposit(constants.Zero, parseEther("100"), this.signers.user.address);
          await this.farming.farmingRangeAsAlice.updateCampaign(constants.Zero);

          const currentBlockNum = await latestBlockNumber();
          await advanceBlockTo(this.farming.mockedBlock.add(22).toNumber());

          // alice should expect to see her pending reward according to calculated reward per share and her deposit

          expect((await this.farming.farmingRangeAsAlice.campaignInfo(0)).lastRewardBlock).to.eq(currentBlockNum);
          expect((await this.farming.farmingRangeAsAlice.campaignInfo(0)).accRewardPerShare).to.be.gt(constants.Zero);

          expect(await this.farming.farmingRangeAsAlice.pendingReward(constants.Zero, this.signers.user.address)).to.eq(
            parseEther("100").mul(this.farming.mockedBlock.add(22).sub(this.farming.mockedBlock.add(8))),
          );
          // now remove last reward info
          await expect(this.farming.farmingRangeAsDeployer.removeLastRewardInfo(0))
            .to.emit(this.farming.farmingRangeAsDeployer, "RemoveRewardInfo")
            .withArgs(0, 1);
          const length = await this.farming.farmingRangeAsDeployer.rewardInfoLen(0);
          expect(length).to.eq(1);
          const removeRewardBlock = await latestBlockNumber();
          const balanceRewardHolder = await this.farming.rewardToken.balanceOf(this.signers.admin.address);
          expect(balanceRewardHolder.sub(balBefore)).to.equal(
            mintedReward.sub(
              INITIAL_BONUS_REWARD_PER_BLOCK.mul(removeRewardBlock.sub(this.farming.mockedBlock.add(8))),
            ),
          );
          expect(await this.farming.farmingRangeAsAlice.pendingReward(0, this.signers.user.address)).to.eq(
            INITIAL_BONUS_REWARD_PER_BLOCK.mul(removeRewardBlock.sub(this.farming.mockedBlock.add(8))),
          );
          await advanceBlockTo(this.farming.mockedBlock.add(30).toNumber());
          await expect(
            this.farming.farmingRangeAsAlice.withdraw(
              0,
              parseEther("100"),
              this.signers.user.address,
              this.signers.user.address,
            ),
          ).to.not.be.reverted;
          expect(await this.farming.rewardToken.balanceOf(this.signers.user.address)).to.eq(
            parseEther("100").mul(removeRewardBlock.sub(this.farming.mockedBlock.add(8))),
          );
          expect(await this.farming.farmingRangeAsAlice.pendingReward(0, this.signers.user.address)).to.eq(0);
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
            this.farming.mockedBlock.add(8),
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

  describe("Delete and update last reward info", async function () {
    beforeEach("Should create campaign info and reward info", async function () {
      // mint reward token to admin
      await this.farming.rewardTokenAsDeployer.mint(this.signers.admin.address, INITIAL_BALANCE);

      // mint staking token to admin
      await this.farming.stakingTokenAsDeployer.mint(this.signers.admin.address, constants.MaxInt256);

      // create first campaign info
      await this.farming.farmingRangeAsDeployer.addCampaignInfo(
        this.farming.stakingToken.address,
        this.farming.rewardToken.address,
        this.farming.mockedBlock.add(1).add(10),
      );

      // verify campaign info length
      expect(await this.farming.farmingRangeAsDeployer.campaignInfoLen()).to.be.equal(constants.One);

      // approve reward token to farming
      await this.farming.rewardToken.approve(this.farming.farmingRangeAsDeployer.address, INITIAL_BALANCE);

      // create first reward info
      await this.farming.farmingRangeAsDeployer.addRewardInfo(
        constants.Zero,
        this.farming.mockedBlock.add(1).add(REWARD_INFO_DURATION),
        constants.One,
      );

      // verify reward info length
      expect(await this.farming.farmingRangeAsDeployer.rewardInfoLen(constants.Zero)).to.be.equal(constants.One);
    });

    it("Remove last reward info and check for no loss reward tokens", async function () {
      // format block constant to number
      const blockToNum = parseInt(this.farming.mockedBlock.add(1).toString());

      // advance block to half last reward info duration
      await advanceBlockTo(blockToNum + REWARD_INFO_DURATION / 2);

      // verify block increased as expected
      expect(await latestBlockNumber()).to.be.equal(blockToNum + REWARD_INFO_DURATION / 2);

      // admin reward token balance before remove last reward info
      const adminBalanceBeforeRemove = await this.farming.rewardToken.balanceOf(this.signers.admin.address);

      // remove last reward info
      await this.farming.farmingRangeAsDeployer.removeLastRewardInfo(constants.Zero);

      // verify reward info length decreased
      expect(await this.farming.farmingRangeAsDeployer.rewardInfoLen(constants.Zero)).to.be.equal(constants.Zero);

      // admin reward token balance after remove last reward info
      const adminBalanceAfterRemove = await this.farming.rewardToken.balanceOf(this.signers.admin.address);

      // verify admin balance difference is around last reward info creation amount
      expect(adminBalanceAfterRemove.sub(adminBalanceBeforeRemove)).to.be.equal(
        BigNumber.from(REWARD_INFO_DURATION - 10),
      );

      const currentBlock = await latestBlockNumber();

      // create empty reward info ended in future
      await this.farming.farmingRangeAsDeployer.addRewardInfo(constants.Zero, currentBlock.add(3), constants.Zero);

      // create reward info again later in time
      await this.farming.farmingRangeAsDeployer.addRewardInfo(
        constants.Zero,
        this.farming.mockedBlock.add(1).add(REWARD_INFO_DURATION),
        constants.One,
      );

      // verify reward info length size
      expect(await this.farming.farmingRangeAsDeployer.rewardInfoLen(constants.Zero)).to.be.equal(constants.Two);

      // remove last reward info again
      await this.farming.farmingRangeAsDeployer.removeLastRewardInfo(constants.Zero);

      // verify reward info length size
      expect(await this.farming.farmingRangeAsDeployer.rewardInfoLen(constants.Zero)).to.be.equal(constants.One);

      // final admin reward token balance
      const finalAdminBalance = await this.farming.rewardToken.balanceOf(this.signers.admin.address);

      // verify diff reward token balance between initial state and final state
      expect(INITIAL_BALANCE.sub(finalAdminBalance)).to.be.lessThan(BigNumber.from(10));
    });

    it("Update last reward info and check no loss reward tokens", async function () {
      // format block constant to number
      const blockToNum = parseInt(this.farming.mockedBlock.add(1).toString());

      // advance block to half last reward info duration
      await advanceBlockTo(blockToNum + REWARD_INFO_DURATION / 2);

      // verify block increased as expected
      expect(await latestBlockNumber()).to.be.equal(blockToNum + REWARD_INFO_DURATION / 2);

      // admin reward token balance before update last reward info
      const adminBalanceBeforeUpdate = await this.farming.rewardToken.balanceOf(this.signers.admin.address);

      // reward info endblock to update => have to be in the future
      const updatedEndBlock = BigNumber.from(blockToNum + REWARD_INFO_DURATION / 2 + 10);

      // update last reward info
      await this.farming.farmingRangeAsDeployer.updateRewardInfo(
        constants.Zero,
        constants.Zero,
        updatedEndBlock,
        constants.One,
      );

      // verify reward info length size
      expect(await this.farming.farmingRangeAsDeployer.rewardInfoLen(constants.Zero)).to.be.equal(constants.One);

      // admin reward token balance after update last reward info
      const adminBalanceAfterUpdate = await this.farming.rewardToken.balanceOf(this.signers.admin.address);

      // verify admin balance difference is around last reward info creation amount
      expect(adminBalanceAfterUpdate.sub(adminBalanceBeforeUpdate)).to.be.equal(
        BigNumber.from(REWARD_INFO_DURATION - 19),
      );

      // add reward info
      await this.farming.farmingRangeAsDeployer.addRewardInfo(
        constants.Zero,
        this.farming.mockedBlock.add(1).add(REWARD_INFO_DURATION),
        constants.One,
      );

      // admin balance after add reward info
      const adminBalanceAfterAddRewardInfo = await this.farming.rewardToken.balanceOf(this.signers.admin.address);

      // verify difference after add reward info
      expect(adminBalanceAfterUpdate.sub(adminBalanceAfterAddRewardInfo)).to.be.equal(43190);

      // verify reward info length size
      expect(await this.farming.farmingRangeAsDeployer.rewardInfoLen(constants.Zero)).to.be.equal(constants.Two);

      // remove last reward info
      await this.farming.farmingRangeAsDeployer.removeLastRewardInfo(constants.Zero);

      // verify reward info length size
      expect(await this.farming.farmingRangeAsDeployer.rewardInfoLen(constants.Zero)).to.be.equal(constants.One);

      // final admin reward token balance
      const finalAdminBalance = await this.farming.rewardToken.balanceOf(this.signers.admin.address);

      // verify diff reward token balance between initial state and final state
      expect(INITIAL_BALANCE.sub(finalAdminBalance)).to.be.lessThan(BigNumber.from(10));
    });

    it("Remove last reward info with previous staking and check no loss reward tokens", async function () {
      // mint staking token to user
      await this.farming.stakingTokenAsAlice.mint(this.signers.user.address, constants.One);

      // user approve to farming
      await this.farming.stakingTokenAsAlice.approve(this.farming.farmingRangeAsAlice.address, constants.MaxUint256);

      // user deposit
      await this.farming.farmingRangeAsAlice.deposit(constants.Zero, constants.One, this.signers.user.address);

      // format this.farming.mockedBlock.add(1) constant to number
      const blockToNum = parseInt(this.farming.mockedBlock.add(1).toString());

      // advance block to half last reward info duration
      await advanceBlockTo(blockToNum + REWARD_INFO_DURATION / 2);

      // verify block increased as expected
      expect(await latestBlockNumber()).to.be.equal(blockToNum + REWARD_INFO_DURATION / 2);

      // admin reward token balance before remove last reward info
      const adminBalanceBeforeRemove = await this.farming.rewardToken.balanceOf(this.signers.admin.address);

      // remove last reward info
      await this.farming.farmingRangeAsDeployer.removeLastRewardInfo(constants.Zero);

      // verify reward info length decreased
      expect(await this.farming.farmingRangeAsDeployer.rewardInfoLen(constants.Zero)).to.be.equal(constants.Zero);

      // admin reward token balance after remove last reward info
      const adminBalanceAfterRemove = await this.farming.rewardToken.balanceOf(this.signers.admin.address);

      // verify admin balance difference is around last reward info creation amount
      expect(adminBalanceAfterRemove.sub(adminBalanceBeforeRemove)).to.be.equal(BigNumber.from(43199));

      await this.farming.farmingRangeAsAlice.withdraw(
        constants.Zero,
        constants.One,
        this.signers.user.address,
        this.signers.user.address,
      );

      const currentBlock = await latestBlockNumber();

      // create empty reward info ended in future
      await this.farming.farmingRangeAsDeployer.addRewardInfo(constants.Zero, currentBlock.add(3), constants.Zero);

      // create reward info again later in time
      await this.farming.farmingRangeAsDeployer.addRewardInfo(
        constants.Zero,
        this.farming.mockedBlock.add(1).add(REWARD_INFO_DURATION),
        constants.One,
      );

      // verify reward info length size
      expect(await this.farming.farmingRangeAsDeployer.rewardInfoLen(constants.Zero)).to.be.equal(constants.Two);

      // remove last reward info again
      await this.farming.farmingRangeAsDeployer.removeLastRewardInfo(constants.Zero);

      // verify reward info length size
      expect(await this.farming.farmingRangeAsDeployer.rewardInfoLen(constants.Zero)).to.be.equal(constants.One);

      // final admin reward token balance
      const finalAdminBalance = await this.farming.rewardToken.balanceOf(this.signers.admin.address);

      // verify diff reward token balance between initial state and final state
      expect(INITIAL_BALANCE.sub(finalAdminBalance)).to.be.equal(BigNumber.from(43191));
    });

    it("Update last reward info with previous staking and check no loss reward tokens", async function () {
      // mint staking token to user
      await this.farming.stakingTokenAsAlice.mint(this.signers.user.address, constants.One);

      // user approve to farming
      await this.farming.stakingTokenAsAlice.approve(this.farming.farmingRangeAsAlice.address, constants.MaxUint256);

      // user deposit
      await this.farming.farmingRangeAsAlice.deposit(constants.Zero, constants.One, this.signers.user.address);

      // format block constant to number
      const blockToNum = parseInt(this.farming.mockedBlock.add(1).toString());

      // advance block to half last reward info duration
      await advanceBlockTo(blockToNum + REWARD_INFO_DURATION / 2);

      // verify block increased as expected
      expect(await latestBlockNumber()).to.be.equal(blockToNum + REWARD_INFO_DURATION / 2);

      // admin reward token balance before update last reward info
      const adminBalanceBeforeUpdate = await this.farming.rewardToken.balanceOf(this.signers.admin.address);

      // reward info endblock to update => have to be in the future
      const updatedEndBlock = BigNumber.from(blockToNum + REWARD_INFO_DURATION / 2 + 10);

      // update last reward info
      await this.farming.farmingRangeAsDeployer.updateRewardInfo(
        constants.Zero,
        constants.Zero,
        updatedEndBlock,
        constants.One,
      );

      // verify reward info length size
      expect(await this.farming.farmingRangeAsDeployer.rewardInfoLen(constants.Zero)).to.be.equal(constants.One);

      // admin reward token balance after update last reward info
      const adminBalanceAfterUpdate = await this.farming.rewardToken.balanceOf(this.signers.admin.address);

      // verify admin balance difference is around last reward info creation amount
      expect(adminBalanceAfterUpdate.sub(adminBalanceBeforeUpdate)).to.be.equal(BigNumber.from(43190));

      // add reward info
      await this.farming.farmingRangeAsDeployer.addRewardInfo(
        constants.Zero,
        this.farming.mockedBlock.add(1).add(REWARD_INFO_DURATION),
        constants.One,
      );

      // admin balance after add reward info
      const adminBalanceAfterAddRewardInfo = await this.farming.rewardToken.balanceOf(this.signers.admin.address);

      // verify difference after add reward info
      expect(adminBalanceAfterUpdate.sub(adminBalanceAfterAddRewardInfo)).to.be.equal(43190);

      // verify reward info length size
      expect(await this.farming.farmingRangeAsDeployer.rewardInfoLen(constants.Zero)).to.be.equal(constants.Two);

      // remove last reward info
      await this.farming.farmingRangeAsDeployer.removeLastRewardInfo(constants.Zero);

      // verify reward info length size
      expect(await this.farming.farmingRangeAsDeployer.rewardInfoLen(constants.Zero)).to.be.equal(constants.One);

      // final admin reward token balance
      const finalAdminBalance = await this.farming.rewardToken.balanceOf(this.signers.admin.address);

      // verify diff reward token balance between initial state and final state
      expect(INITIAL_BALANCE.sub(finalAdminBalance)).to.be.equal(BigNumber.from(43200));

      // user pending rewards before withdraw
      const userPendingBefore = await this.farming.farmingRangeAsAlice.pendingReward(
        constants.Zero,
        this.signers.user.address,
      );

      // user reward balance before withdraw
      const userRewardBalanceBeforeWithdraw = await this.farming.rewardToken.balanceOf(this.signers.user.address);

      await this.farming.farmingRangeAsAlice.updateCampaign(constants.Zero);

      // withdraw user
      await this.farming.farmingRangeAsAlice.withdraw(
        constants.Zero,
        constants.One,
        this.signers.user.address,
        this.signers.user.address,
      );

      // user reward balance after withdraw
      const userRewardBalanceAfterWithdraw = await this.farming.rewardToken.balanceOf(this.signers.user.address);

      // check difference to equal pending
      expect(userRewardBalanceAfterWithdraw.sub(userRewardBalanceBeforeWithdraw)).to.be.equal(userPendingBefore.add(2));

      // withdraw user to revert
      await expect(
        this.farming.farmingRangeAsAlice.withdraw(
          constants.Zero,
          constants.One,
          this.signers.user.address,
          this.signers.user.address,
        ),
      ).to.be.revertedWith("FarmingRange::withdraw::bad withdraw amount");

      // verify no more rewards
      expect(
        await this.farming.farmingRangeAsAlice.pendingReward(constants.Zero, this.signers.user.address),
      ).to.be.equal(constants.Zero);
    });
  });
}
