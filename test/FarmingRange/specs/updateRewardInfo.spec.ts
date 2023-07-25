import { expect } from "chai";
import { advanceBlockTo, latestBlockNumber } from "../../helpers/time";
import { checkTotalRewards, INITIAL_BONUS_REWARD_PER_BLOCK } from "../utils";
import { parseEther } from "ethers/lib/utils";
import { unitFixtureCampaignWith2rewards } from "../../fixtures";

export function shouldBehaveLikeUpdateRewardInfo() {
  describe("#updateRewardInfo()", async function () {
    context("When all parameters are valid", async function () {
      context("When the reward info is still within the limit", async function () {
        it("should still be able to update the new reward info", async function () {
          let length = await unitFixtureCampaignWith2rewards(
            this.farming,
            this.signers.admin,
            INITIAL_BONUS_REWARD_PER_BLOCK,
            expect,
          );

          const balBefore = await this.farming.rewardToken.balanceOf(this.signers.admin.address);
          expect(balBefore).to.eq(0);

          // We update with nothing changed
          await this.farming.farmingRangeAsDeployer.updateRewardInfo(
            0,
            0,
            this.farming.mockedBlock.add(11),
            INITIAL_BONUS_REWARD_PER_BLOCK,
          );
          const noUpdateRewardInfo = await this.farming.farmingRangeAsDeployer.campaignRewardInfo(0, 0);
          length = await this.farming.farmingRangeAsDeployer.rewardInfoLen(0);
          expect(length).to.eq(2);
          expect(noUpdateRewardInfo.rewardPerBlock).to.eq(INITIAL_BONUS_REWARD_PER_BLOCK);
          expect(noUpdateRewardInfo.endBlock).to.eq(this.farming.mockedBlock.add(11));
          expect(await this.farming.rewardToken.balanceOf(this.signers.admin.address)).to.eq(balBefore);
          const updateRewardInfoNextNoChange = await this.farming.farmingRangeAsDeployer.campaignRewardInfo(0, 1);
          expect(updateRewardInfoNextNoChange.rewardPerBlock).to.eq(INITIAL_BONUS_REWARD_PER_BLOCK.add(1));

          // Now we update First reward block for real :
          await this.farming.farmingRangeAsDeployer.updateRewardInfo(
            0,
            0,
            this.farming.mockedBlock.add(9),
            INITIAL_BONUS_REWARD_PER_BLOCK.sub(2),
          );
          const updateRewardInfo = await this.farming.farmingRangeAsDeployer.campaignRewardInfo(0, 0);
          length = await this.farming.farmingRangeAsDeployer.rewardInfoLen(0);
          expect(length).to.eq(2);
          expect(updateRewardInfo.rewardPerBlock).to.eq(INITIAL_BONUS_REWARD_PER_BLOCK.sub(2));
          expect(updateRewardInfo.endBlock).to.eq(this.farming.mockedBlock.add(9));
          expect(await this.farming.rewardToken.balanceOf(this.signers.admin.address)).to.eq(
            balBefore.add(
              INITIAL_BONUS_REWARD_PER_BLOCK.mul(3)
                .sub(INITIAL_BONUS_REWARD_PER_BLOCK.sub(2).mul(1))
                .add(
                  // refund from first range
                  INITIAL_BONUS_REWARD_PER_BLOCK.add(1)
                    .mul(9)
                    .sub(INITIAL_BONUS_REWARD_PER_BLOCK.add(1).mul(9).div(11).mul(11)), //refund from second range round down
                ),
            ),
          );
          //expect updated second period to be updated rewardPerBlock with new period range
          const updateRewardInfoNext = await this.farming.farmingRangeAsDeployer.campaignRewardInfo(0, 1);
          expect(updateRewardInfoNext.rewardPerBlock).to.eq(
            INITIAL_BONUS_REWARD_PER_BLOCK.add(1)
              .mul(this.farming.mockedBlock.add(20).sub(this.farming.mockedBlock.add(11)))
              .div(this.farming.mockedBlock.add(20).sub(this.farming.mockedBlock.add(9))),
          );
          // Now we update to add some rewards and check balance
          await expect(
            this.farming.farmingRangeAsDeployer.updateRewardInfo(
              0,
              0,
              this.farming.mockedBlock.add(11), // back to initial
              INITIAL_BONUS_REWARD_PER_BLOCK, // back to initial
            ),
          )
            .to.emit(this.farming.farmingRangeAsDeployer, "UpdateRewardInfo")
            .withArgs(0, 0, this.farming.mockedBlock.add(11), INITIAL_BONUS_REWARD_PER_BLOCK);
          const updateRewardInfoAgain = await this.farming.farmingRangeAsDeployer.campaignRewardInfo(0, 0);
          length = await this.farming.farmingRangeAsDeployer.rewardInfoLen(0);
          expect(length).to.eq(2);
          expect(updateRewardInfoAgain.rewardPerBlock).to.eq(INITIAL_BONUS_REWARD_PER_BLOCK);
          expect(updateRewardInfoAgain.endBlock).to.eq(this.farming.mockedBlock.add(11));
          expect(await this.farming.rewardToken.balanceOf(this.signers.admin.address)).to.eq(
            INITIAL_BONUS_REWARD_PER_BLOCK.sub(INITIAL_BONUS_REWARD_PER_BLOCK.add(4)) // added balance to rewards for range 1
              .add(
                INITIAL_BONUS_REWARD_PER_BLOCK.add(1).mul(11).sub(INITIAL_BONUS_REWARD_PER_BLOCK.mul(11).div(9).mul(9)),
              ), // refund from second range round down
          );
        });
      });
      context("When block number is within updating range", async function () {
        it("should still be able to update the new reward info", async function () {
          const campaignBlockStart = this.farming.mockedBlock.add(6);
          const mintedRewardPhase1 = INITIAL_BONUS_REWARD_PER_BLOCK.mul(
            this.farming.mockedBlock.add(10).sub(campaignBlockStart),
          );
          const mintedRewardPhase2 = INITIAL_BONUS_REWARD_PER_BLOCK.add(1).mul(
            this.farming.mockedBlock.add(14).sub(this.farming.mockedBlock.add(10)),
          );
          const mintedReward = mintedRewardPhase1.add(mintedRewardPhase2);
          await this.farming.rewardTokenAsDeployer.mint(this.signers.admin.address, mintedReward);
          await this.farming.farmingRangeAsDeployer.addCampaignInfo(
            this.farming.stakingToken.address,
            this.farming.rewardToken.address,
            campaignBlockStart,
          );
          // add the first reward info
          await this.farming.farmingRangeAsDeployer.addRewardInfo(
            0,
            this.farming.mockedBlock.add(10),
            INITIAL_BONUS_REWARD_PER_BLOCK,
          );

          await this.farming.farmingRangeAsDeployer.addRewardInfo(
            0,
            this.farming.mockedBlock.add(14),
            INITIAL_BONUS_REWARD_PER_BLOCK.add(1),
          ); //campaign starts at B+8 with reward 1 until B+11 then reward 2 until B+20

          const balBefore = await this.farming.rewardToken.balanceOf(this.signers.admin.address);
          expect(balBefore).to.eq(0);

          // Now we update First reward block during distribution :
          const newEndBlockFirstRange = this.farming.mockedBlock.add(10);
          const newRewardFirstRange = INITIAL_BONUS_REWARD_PER_BLOCK.div(2);
          // We should be at mockedBlock (6) + 6 (#12) => campaign is from #10 to #13, so we should reimburse used
          await this.farming.farmingRangeAsDeployer.updateRewardInfo(0, 0, newEndBlockFirstRange, newRewardFirstRange);
          const updateRewardInfo = await this.farming.farmingRangeAsDeployer.campaignRewardInfo(0, 0);
          const length = await this.farming.farmingRangeAsDeployer.rewardInfoLen(0);
          expect(length).to.eq(2);
          expect(updateRewardInfo.rewardPerBlock).to.eq(newRewardFirstRange);
          expect(updateRewardInfo.endBlock).to.eq(newEndBlockFirstRange);
          const block = await latestBlockNumber();

          expect(await this.farming.rewardToken.balanceOf(this.signers.admin.address)).to.eq(
            balBefore.add(
              INITIAL_BONUS_REWARD_PER_BLOCK.sub(newRewardFirstRange).mul(newEndBlockFirstRange.sub(block)),
            ),
          );
          //expect updated second period to be updated rewardPerBlock with new period range
          const updateRewardInfoNext = await this.farming.farmingRangeAsDeployer.campaignRewardInfo(0, 1);
          expect(updateRewardInfoNext.rewardPerBlock).to.eq(INITIAL_BONUS_REWARD_PER_BLOCK.add(1));
        });
      });
      context(
        "When next period rewardPerBlock calculated is rounded and deposit comes late, transfer diff to rewardHolder",
        async function () {
          it("should have 0 balance at the end of Campaign", async function () {
            const mintedRewardPhase1 = INITIAL_BONUS_REWARD_PER_BLOCK.mul(
              this.farming.mockedBlock.add(19).sub(this.farming.mockedBlock.add(8)),
            );
            const mintedRewardPhase2 = INITIAL_BONUS_REWARD_PER_BLOCK.mul(
              this.farming.mockedBlock.add(29).sub(this.farming.mockedBlock.add(19)),
            );
            const mintedReward = mintedRewardPhase1.add(mintedRewardPhase2);
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
            const balanceBefore = await this.farming.rewardToken.balanceOf(this.farming.farmingRange.address);
            expect(balanceBefore).to.be.gt(0);

            await this.farming.stakingTokenAsDeployer.mint(this.signers.user.address, parseEther("100"));
            await this.farming.stakingTokenAsAlice.approve(this.farming.farmingRange.address, parseEther("100"));

            await this.farming.farmingRangeAsAlice.deposit(0, parseEther("100"));
            await this.farming.farmingRangeAsAlice.updateCampaign(0);

            //check totalReward
            await checkTotalRewards(this.farming.farmingRange);

            await advanceBlockTo(this.farming.mockedBlock.add(17).toNumber());

            const newEndBlockFirstRange = this.farming.mockedBlock.add(19);
            await this.farming.farmingRangeAsDeployer.updateRewardInfo(
              0,
              0,
              newEndBlockFirstRange,
              INITIAL_BONUS_REWARD_PER_BLOCK,
            );

            //check totalReward
            await checkTotalRewards(this.farming.farmingRange);

            //expect updated second period to be updated round down rewardPerBlock with new period range
            const updateRewardInfoNext = await this.farming.farmingRangeAsDeployer.campaignRewardInfo(0, 1);
            expect(updateRewardInfoNext.rewardPerBlock).to.eq(INITIAL_BONUS_REWARD_PER_BLOCK.mul(10).div(9));
            await advanceBlockTo(this.farming.mockedBlock.add(30).toNumber());
            await this.farming.farmingRangeAsAlice.withdraw(0, parseEther("100"));

            const balanceAfter = await this.farming.rewardToken.balanceOf(this.farming.farmingRange.address);
            expect(balanceAfter).to.eq(0);
          });
        },
      );
      context(
        "When next period rewardPerBlock calculated is rounded and deposit early, transfer diff to rewardHolder",
        async function () {
          it("should have 0 balance at the end of Campaign", async function () {
            const mintedRewardPhase1 = INITIAL_BONUS_REWARD_PER_BLOCK.mul(
              this.farming.mockedBlock.add(19).sub(this.farming.mockedBlock.add(8)),
            );
            const mintedRewardPhase2 = INITIAL_BONUS_REWARD_PER_BLOCK.mul(
              this.farming.mockedBlock.add(29).sub(this.farming.mockedBlock.add(19)),
            );
            const mintedReward = mintedRewardPhase1.add(mintedRewardPhase2);
            await this.farming.rewardTokenAsDeployer.mint(this.signers.admin.address, mintedReward);
            await this.farming.farmingRangeAsDeployer.addCampaignInfo(
              this.farming.stakingToken.address,
              this.farming.rewardToken.address,
              this.farming.mockedBlock.add(8).add(6),
            );
            await this.farming.farmingRangeAsDeployer.addRewardInfo(
              0,
              this.farming.mockedBlock.add(18).add(6),
              INITIAL_BONUS_REWARD_PER_BLOCK,
            );

            await this.farming.farmingRangeAsDeployer.addRewardInfo(
              0,
              this.farming.mockedBlock.add(28).add(6),
              INITIAL_BONUS_REWARD_PER_BLOCK,
            );
            const balanceBefore = await this.farming.rewardToken.balanceOf(this.farming.farmingRange.address);
            expect(balanceBefore).to.be.gt(0);

            await this.farming.stakingTokenAsDeployer.mint(this.signers.user.address, parseEther("100"));
            await this.farming.stakingTokenAsAlice.approve(this.farming.farmingRange.address, parseEther("100"));

            await this.farming.farmingRangeAsAlice.deposit(0, parseEther("100"));
            await this.farming.farmingRangeAsAlice.updateCampaign(0);

            //check totalReward
            await checkTotalRewards(this.farming.farmingRange);

            await advanceBlockTo(this.farming.mockedBlock.add(16).add(6).toNumber());

            const newEndBlockFirstRange = this.farming.mockedBlock.add(17).add(6);
            await this.farming.farmingRangeAsDeployer.updateRewardInfo(
              0,
              0,
              newEndBlockFirstRange,
              INITIAL_BONUS_REWARD_PER_BLOCK,
            );

            //check totalReward
            await checkTotalRewards(this.farming.farmingRange);

            //expect updated second period to be updated round down rewardPerBlock with new period range
            const updateRewardInfoNext = await this.farming.farmingRangeAsDeployer.campaignRewardInfo(0, 1);
            expect(updateRewardInfoNext.rewardPerBlock).to.eq(INITIAL_BONUS_REWARD_PER_BLOCK.mul(10).div(11));
            await advanceBlockTo(this.farming.mockedBlock.add(28).add(6).add(10).toNumber());
            await this.farming.farmingRangeAsAlice.withdraw(0, parseEther("100"));
            expect(await this.farming.rewardToken.balanceOf(this.signers.user.address)).to.eq(
              INITIAL_BONUS_REWARD_PER_BLOCK.mul(9).add(INITIAL_BONUS_REWARD_PER_BLOCK.mul(10).div(11).mul(11)), //careful we need to / 11 * 11 to round down !
            );
            const balanceAfter = await this.farming.rewardToken.balanceOf(this.farming.farmingRange.address);
            expect(balanceAfter).to.eq(0);
          });
        },
      );
      context("When we should add rewards to the pool within actual range", async function () {
        it("should have more rewards into pool but just recalculated from actual block", async function () {
          const mintedReward = INITIAL_BONUS_REWARD_PER_BLOCK.add(1).mul(
            this.farming.mockedBlock.add(20).sub(this.farming.mockedBlock.add(4)),
          );
          await this.farming.rewardTokenAsDeployer.mint(this.signers.admin.address, mintedReward);
          const startBlock = this.farming.mockedBlock.add(4);
          await this.farming.farmingRangeAsDeployer.addCampaignInfo(
            this.farming.stakingToken.address,
            this.farming.rewardToken.address,
            startBlock,
          );

          await this.farming.farmingRangeAsDeployer.addRewardInfo(
            0,
            this.farming.mockedBlock.add(20),
            INITIAL_BONUS_REWARD_PER_BLOCK,
          );
          // mint staking token to alice
          await this.farming.stakingTokenAsDeployer.mint(this.signers.user.address, parseEther("100"));
          // alice approve farming range
          await this.farming.stakingTokenAsAlice.approve(this.farming.farmingRange.address, parseEther("100"));

          // alice deposit @block number #(mockedBlock+7)

          await this.farming.farmingRangeAsAlice.deposit(0, parseEther("100"));
          // alice call update campaign @block number #(mockedBlock+8)
          await this.farming.farmingRangeAsAlice.updateCampaign(0);
          let actualBlock = await latestBlockNumber();
          await advanceBlockTo(actualBlock.add(5).toNumber());
          const balBefore = await this.farming.rewardToken.balanceOf(this.signers.admin.address);
          await this.farming.farmingRangeAsDeployer.updateRewardInfo(
            0,
            0,
            this.farming.mockedBlock.add(20),
            INITIAL_BONUS_REWARD_PER_BLOCK.add(1),
          );
          const updateBlock = await latestBlockNumber();
          actualBlock = updateBlock;
          const updateRewardInfo = await this.farming.farmingRangeAsDeployer.campaignRewardInfo(0, 0);
          const length = await this.farming.farmingRangeAsDeployer.rewardInfoLen(0);
          expect(length).to.eq(1);
          expect(updateRewardInfo.rewardPerBlock).to.eq(INITIAL_BONUS_REWARD_PER_BLOCK.add(1));
          expect(updateRewardInfo.endBlock).to.eq(this.farming.mockedBlock.add(20));
          // now we check that new reward info did get required diff rewards from holder
          expect(await this.farming.rewardToken.balanceOf(this.signers.admin.address)).to.eq(
            balBefore.sub(
              INITIAL_BONUS_REWARD_PER_BLOCK.add(1)
                .sub(INITIAL_BONUS_REWARD_PER_BLOCK)
                .mul(this.farming.mockedBlock.add(20).sub(updateBlock)),
            ),
          );
          expect((await this.farming.farmingRangeAsAlice.campaignInfo(0)).lastRewardBlock).to.eq(updateBlock);

          await advanceBlockTo(actualBlock.add(10).toNumber());
          actualBlock = await latestBlockNumber();
          let latestRewardBlock = actualBlock.gt(this.farming.mockedBlock.add(20))
            ? this.farming.mockedBlock.add(20)
            : actualBlock;
          expect(await this.farming.farmingRangeAsAlice.pendingReward(0, this.signers.user.address)).to.eq(
            INITIAL_BONUS_REWARD_PER_BLOCK.mul(updateBlock.sub(startBlock.add(3))).add(
              // Alice deposited @block number #(startBlock+3)
              INITIAL_BONUS_REWARD_PER_BLOCK.add(1).mul(latestRewardBlock.sub(updateBlock)),
            ),
          );
          await advanceBlockTo(this.farming.mockedBlock.add(30).toNumber());
          latestRewardBlock = actualBlock.gt(this.farming.mockedBlock.add(20))
            ? this.farming.mockedBlock.add(20)
            : actualBlock;
          await expect(this.farming.farmingRangeAsAlice.withdraw(0, parseEther("100"))).to.not.be.reverted;
          expect(await this.farming.rewardToken.balanceOf(this.signers.user.address)).to.eq(
            INITIAL_BONUS_REWARD_PER_BLOCK.mul(updateBlock.sub(startBlock.add(3))).add(
              // Alice deposited @block number #(startBlock+3)
              INITIAL_BONUS_REWARD_PER_BLOCK.add(1).mul(latestRewardBlock.sub(updateBlock)),
            ),
          );
          expect(await this.farming.farmingRangeAsAlice.pendingReward(0, this.signers.user.address)).to.eq(0);
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
            this.farming.farmingRangeAsAlice.updateRewardInfo(
              0,
              0,
              this.farming.mockedBlock.add(11),
              INITIAL_BONUS_REWARD_PER_BLOCK,
            ),
          ).to.be.revertedWith("Ownable: caller is not the owner");
        });
      });
      context("When reward info exceed the limit", async function () {
        it("should reverted since the index does not exist", async function () {
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
            this.farming.farmingRangeAsDeployer.updateRewardInfo(
              0,
              1,
              this.farming.mockedBlock.add(11),
              INITIAL_BONUS_REWARD_PER_BLOCK,
            ),
          ).to.be.reverted;
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
          await this.farming.farmingRangeAsDeployer.addRewardInfo(
            0,
            this.farming.mockedBlock.add(9),
            INITIAL_BONUS_REWARD_PER_BLOCK,
          );
          await expect(
            this.farming.farmingRangeAsDeployer.updateRewardInfo(
              0,
              0,
              this.farming.mockedBlock.add(7),
              INITIAL_BONUS_REWARD_PER_BLOCK,
            ),
          ).to.reverted;
        });
      });
      context("When newly added reward info endblock is less than current end block", async function () {
        it("should revert with the message FarmingRange::updateRewardInfo::bad new endblock", async function () {
          await unitFixtureCampaignWith2rewards(this.farming, this.signers.admin, INITIAL_BONUS_REWARD_PER_BLOCK);

          await expect(
            this.farming.farmingRangeAsDeployer.updateRewardInfo(
              0,
              1,
              this.farming.mockedBlock.add(10),
              INITIAL_BONUS_REWARD_PER_BLOCK,
            ),
          ).to.be.revertedWith("FarmingRange::updateRewardInfo::bad new endblock");
        });
      });
      context("When new _endblock > rewardInfo[_rewardIndex + 1].endBlock", async function () {
        it("should revert with endblock overlap message", async function () {
          await unitFixtureCampaignWith2rewards(this.farming, this.signers.admin, INITIAL_BONUS_REWARD_PER_BLOCK);
          await expect(
            this.farming.farmingRangeAsDeployer.updateRewardInfo(
              0,
              0,
              this.farming.mockedBlock.add(30),
              INITIAL_BONUS_REWARD_PER_BLOCK,
            ),
          ).to.be.revertedWith("FarmingRange::updateRewardInfo::reward period end is in next range");
        });
      });
      context("When the current reward period has ended", async function () {
        it("should reverted with the message FarmingRange::updateRewardInfo::reward period ended", async function () {
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
            this.farming.farmingRangeAsDeployer.updateRewardInfo(
              0,
              0,
              this.farming.mockedBlock.add(12),
              INITIAL_BONUS_REWARD_PER_BLOCK,
            ),
          ).to.be.revertedWith("FarmingRange::updateRewardInfo::reward period ended");
        });
      });
    });
  });
}
