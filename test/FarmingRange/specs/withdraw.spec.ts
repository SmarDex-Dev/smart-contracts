import { INITIAL_BONUS_REWARD_PER_BLOCK } from "../utils";
import { parseEther, parseUnits } from "ethers/lib/utils";
import { BigNumber, constants } from "ethers";
import { expect } from "chai";
import { advanceBlockTo, latestBlockNumber } from "../../helpers/time";

export function shouldBehaveLikeWithdraw() {
  describe("#withdraw()", async function () {
    context("With invalid parameters", async function () {
      it("should revert when no enough amount to withdraw", async function () {
        // mint reward token to Deployer (when add rewardInfo)
        await this.farming.rewardTokenAsDeployer.mint(
          this.signers.admin.address,
          INITIAL_BONUS_REWARD_PER_BLOCK.mul(this.farming.mockedBlock.add(8).sub(this.farming.mockedBlock.add(6))),
        );
        // scenario: alice deposit #n amount staking token to the pool
        // when the time past, block number increase, alice expects to have her reward amount by calling `rewardToken()`
        // this scenario occurred between block #(mockedBlock+5)-..#(mockedBlock+8)
        // and alice withdraw amount staking token out of pool
        await this.farming.farmingRangeAsDeployer.addCampaignInfo(
          this.farming.stakingToken.address,
          this.farming.rewardToken.address,
          this.farming.mockedBlock.add(6),
        );

        await this.farming.farmingRangeAsDeployer.addRewardInfo(
          0,
          this.farming.mockedBlock.add(8),
          INITIAL_BONUS_REWARD_PER_BLOCK,
        );
        // mint staking token to alice
        await this.farming.stakingTokenAsDeployer.mint(this.signers.user.address, parseEther("100"));
        // alice approve farming range
        await this.farming.stakingTokenAsAlice.approve(this.farming.farmingRange.address, parseEther("100"));
        // alice deposit @block number #(mockedBlock+6)
        await this.farming.farmingRangeAsAlice.deposit(constants.Zero, parseEther("100"));

        // mint reward token to Deployer (when add rewardInfo)
        await expect(this.farming.farmingRangeAsAlice.withdraw(constants.Zero, parseEther("2000"))).to.be.revertedWith(
          "FarmingRange::withdraw::bad withdraw amount",
        );
      });
      it("when no rewards", async function () {
        // mint reward token to Deployer (when add rewardInfo)
        await this.farming.rewardTokenAsDeployer.mint(
          this.signers.admin.address,
          INITIAL_BONUS_REWARD_PER_BLOCK.mul(this.farming.mockedBlock.add(8).sub(this.farming.mockedBlock.add(6))),
        );
        // scenario: alice deposit #n amount staking token to the pool
        // when the time past, block number increase, alice expects to have her reward amount by calling `rewardToken()`
        // this scenario occurred between block #(mockedBlock+5)-..#(mockedBlock+8)
        // and alice withdraw amount staking token out of pool
        await this.farming.farmingRangeAsDeployer.addCampaignInfo(
          this.farming.stakingToken.address,
          this.farming.rewardToken.address,
          this.farming.mockedBlock.add(6),
        );

        await this.farming.farmingRangeAsDeployer.addRewardInfo(0, this.farming.mockedBlock.add(8), 0);
        // mint staking token to alice
        await this.farming.stakingTokenAsDeployer.mint(this.signers.user.address, parseEther("100"));
        // alice approve farming range
        await this.farming.stakingTokenAsAlice.approve(this.farming.farmingRange.address, parseEther("100"));
        // alice deposit @block number #(mockedBlock+6)
        await this.farming.farmingRangeAsAlice.deposit(constants.Zero, parseEther("100"));
        // alice withdraw @block number #(mockedBlock+7)
        await expect(this.farming.farmingRangeAsAlice.withdraw(constants.Zero, parseEther("100"))).to.not.be.reverted;

        expect(await this.farming.rewardToken.balanceOf(this.signers.user.address)).to.eq(0);
        expect((await this.farming.farmingRangeAsAlice.campaignInfo(constants.Zero)).totalStaked).to.eq(constants.Zero);
        expect(await this.farming.stakingToken.balanceOf(this.signers.user.address)).to.eq(parseEther("100"));
      });
      context("when there is NO predefined campaign", async function () {
        it("should revert the tx since an array of predefined campaigns is out of bound", async function () {
          // mint staking token to alice
          await this.farming.stakingTokenAsDeployer.mint(this.signers.user.address, parseEther("100"));
          // mint reward token to Deployer (when add rewardInfo)
          await this.farming.rewardTokenAsDeployer.mint(this.signers.admin.address, parseEther("100"));
          // alice & bob approve farming range
          await this.farming.stakingTokenAsAlice.approve(this.farming.farmingRange.address, parseEther("100"));

          // alice deposit @block number #(mockedBlock+10)
          await expect(this.farming.farmingRangeAsAlice.deposit(constants.Zero, parseEther("100"))).to.be.reverted;
        });
      });
      context("when the user doesn't approve farming range contract", async function () {
        it("should revert the tx since safe transfer is invalid", async function () {
          // mint reward token to Deployer (when add rewardInfo)
          const mintedReward = INITIAL_BONUS_REWARD_PER_BLOCK.mul(
            this.farming.mockedBlock.add(11).sub(this.farming.mockedBlock.add(9)),
          );
          await this.farming.rewardTokenAsDeployer.mint(this.signers.admin.address, mintedReward);
          await this.farming.farmingRangeAsDeployer.addCampaignInfo(
            this.farming.stakingToken.address,
            this.farming.rewardToken.address,
            this.farming.mockedBlock.add(9),
          );

          await this.farming.farmingRangeAsDeployer.addRewardInfo(
            0,
            this.farming.mockedBlock.add(11),
            INITIAL_BONUS_REWARD_PER_BLOCK,
          );
          // mint staking token to alice
          await this.farming.stakingTokenAsDeployer.mint(this.signers.user.address, parseEther("100"));

          // alice deposit @block number #(mockedBlock+10)
          await expect(this.farming.farmingRangeAsAlice.deposit(constants.Zero, parseEther("100"))).to.be.reverted;
        });
      });
    });
    context("With valid parameters", async function () {
      context("When there is only single campaign", async function () {
        context("When there is only single reward info", async function () {
          context("When there is only one beneficial who get the reward (alice)", async function () {
            context("When alice's deposit block is in the middle of start and end block", async function () {
              context("when alice withdraw within the range of reward blocks", async function () {
                it("should receive a reward correctly", async function () {
                  // mint reward token to Deployer (when add rewardInfo)
                  await this.farming.rewardTokenAsDeployer.mint(
                    this.signers.admin.address,
                    INITIAL_BONUS_REWARD_PER_BLOCK.mul(
                      this.farming.mockedBlock.add(8).sub(this.farming.mockedBlock.add(6)),
                    ),
                  );
                  // scenario: alice deposit #n amount staking token to the pool
                  // when the time past, block number increase, alice expects to have her reward amount by calling `rewardToken()`
                  // this scenario occurred between block #(mockedBlock+5)-..#(mockedBlock+8)
                  // and alice withdraw amount staking token out of pool
                  await this.farming.farmingRangeAsDeployer.addCampaignInfo(
                    this.farming.stakingToken.address,
                    this.farming.rewardToken.address,
                    this.farming.mockedBlock.add(6),
                  );

                  await this.farming.farmingRangeAsDeployer.addRewardInfo(
                    0,
                    this.farming.mockedBlock.add(8),
                    INITIAL_BONUS_REWARD_PER_BLOCK,
                  );
                  // mint staking token to alice
                  await this.farming.stakingTokenAsDeployer.mint(this.signers.user.address, parseEther("100"));
                  // alice approve farming range
                  await this.farming.stakingTokenAsAlice.approve(this.farming.farmingRange.address, parseEther("100"));
                  // alice deposit @block number #(mockedBlock+6)
                  await this.farming.farmingRangeAsAlice.deposit(constants.Zero, parseEther("100"));
                  // alice withdraw @block number #(mockedBlock+7)
                  await this.farming.farmingRangeAsAlice.withdraw(constants.Zero, parseEther("100"));

                  expect(await this.farming.rewardToken.balanceOf(this.signers.user.address)).to.eq(
                    parseEther("100"), // Alice deposited @ block #(mockedBlock+5)
                  );
                  expect((await this.farming.farmingRangeAsAlice.campaignInfo(constants.Zero)).totalStaked).to.eq(
                    constants.Zero,
                  );
                  expect(await this.farming.stakingToken.balanceOf(this.signers.user.address)).to.eq(parseEther("100"));
                });
              });
              context("when alice withdraw out the range of reward blocks", async function () {
                it("should receive a reward correctly", async function () {
                  const mintedReward = INITIAL_BONUS_REWARD_PER_BLOCK.mul(
                    this.farming.mockedBlock.add(9).sub(this.farming.mockedBlock.add(7)),
                  );
                  // mint reward token to Deployer (when add rewardInfo)
                  await this.farming.rewardTokenAsDeployer.mint(this.signers.admin.address, mintedReward);
                  // scenario: alice deposit  #n amount staking token to the pool
                  // when the time past, block number increase, alice expects to have her reward amount by calling 'rewardToken'
                  // this scenario occurred between block #(mockedBlock+7)-..#(mockedBlock+9)
                  // and alice withdraw amount staking token out of pool after end time
                  await this.farming.farmingRangeAsDeployer.addCampaignInfo(
                    this.farming.stakingToken.address,
                    this.farming.rewardToken.address,
                    this.farming.mockedBlock.add(7),
                  );

                  await this.farming.farmingRangeAsDeployer.addRewardInfo(
                    0,
                    this.farming.mockedBlock.add(9),
                    INITIAL_BONUS_REWARD_PER_BLOCK,
                  );
                  // mint staking token to alice
                  await this.farming.stakingTokenAsDeployer.mint(this.signers.user.address, parseEther("100"));
                  // alice approve farming range
                  await this.farming.stakingTokenAsAlice.approve(this.farming.farmingRange.address, parseEther("100"));
                  // alice deposit @block number #(mockedBlock+7)
                  await this.farming.farmingRangeAsAlice.deposit(constants.Zero, parseEther("100"));
                  await advanceBlockTo(this.farming.mockedBlock.add(8).toNumber());
                  // alice withdraw @block number #(mockedBlock+8)
                  await advanceBlockTo(this.farming.mockedBlock.add(20).toNumber());
                  await this.farming.farmingRangeAsAlice.withdraw(constants.Zero, parseEther("100"));

                  expect(await this.farming.stakingToken.balanceOf(this.signers.user.address)).to.eq(parseEther("100"));
                  expect((await this.farming.farmingRangeAsAlice.campaignInfo(constants.Zero)).totalStaked).to.eq(
                    constants.Zero,
                  );
                  expect(await this.farming.rewardToken.balanceOf(this.signers.user.address)).to.eq(mintedReward);
                });
              });
            });
            context("When alice's deposit before the start block ", async function () {
              context("when alice withdraw within the range of reward blocks", async function () {
                it("should receive a reward correctly", async function () {
                  const mintedReward = INITIAL_BONUS_REWARD_PER_BLOCK.mul(
                    this.farming.mockedBlock.add(10).sub(this.farming.mockedBlock.add(8)),
                  );
                  // mint reward token to Deployer (when add rewardInfo)
                  await this.farming.rewardTokenAsDeployer.mint(this.signers.admin.address, mintedReward);
                  // scenario: alice deposit #n amount staking token to the pool
                  // when the time past, block number increase, alice expects to have her reward amount by calling `rewardToken()`
                  // this scenario occurred between block #(mockedBlock+8)-..#(mockedBlock+10)
                  // and alice withdraw amount staking token out of pool
                  await this.farming.farmingRangeAsDeployer.addCampaignInfo(
                    this.farming.stakingToken.address,
                    this.farming.rewardToken.address,
                    this.farming.mockedBlock.add(8),
                  );

                  await this.farming.farmingRangeAsDeployer.addRewardInfo(
                    0,
                    this.farming.mockedBlock.add(10),
                    INITIAL_BONUS_REWARD_PER_BLOCK,
                  );
                  // mint staking token to alice
                  await this.farming.stakingTokenAsDeployer.mint(this.signers.user.address, parseEther("100"));
                  // alice approve farming range
                  await this.farming.stakingTokenAsAlice.approve(this.farming.farmingRange.address, parseEther("100"));
                  // alice deposit @block number #(mockedBlock+6)
                  await this.farming.farmingRangeAsAlice.deposit(constants.Zero, parseEther("100"));
                  // alice withdraw @block number #(mockedBlock+7)
                  await advanceBlockTo(this.farming.mockedBlock.add(10).toNumber());

                  await this.farming.farmingRangeAsAlice.withdraw(constants.Zero, parseEther("100"));

                  expect(await this.farming.stakingToken.balanceOf(this.signers.user.address)).to.eq(parseEther("100"));
                  expect((await this.farming.farmingRangeAsAlice.campaignInfo(constants.Zero)).totalStaked).to.eq(
                    constants.Zero,
                  );
                  expect(await this.farming.rewardToken.balanceOf(this.signers.user.address)).to.eq(parseEther("200"));
                });
              });
              context("when alice withdraw out the range of reward blocks", async function () {
                it("should receive a reward correctly", async function () {
                  // mint reward token to Deployer (when add rewardInfo)
                  await this.farming.rewardTokenAsDeployer.mint(
                    this.signers.admin.address,
                    INITIAL_BONUS_REWARD_PER_BLOCK.mul(
                      this.farming.mockedBlock.add(11).sub(this.farming.mockedBlock.add(6)),
                    ),
                  );
                  // scenario: alice deposit #n amount staking token to the pool
                  // when the time past, block number increase, alice expects to have her reward amount by calling `rewardToken()`
                  // this scenario occurred between block #(mockedBlock+9)-..#(mockedBlock+11)
                  // and alice withdraw amount staking token out of pool
                  await this.farming.farmingRangeAsDeployer.addCampaignInfo(
                    this.farming.stakingToken.address,
                    this.farming.rewardToken.address,
                    this.farming.mockedBlock.add(9),
                  );

                  await this.farming.farmingRangeAsDeployer.addRewardInfo(
                    0,
                    this.farming.mockedBlock.add(11),
                    INITIAL_BONUS_REWARD_PER_BLOCK,
                  );
                  // mint staking token to alice
                  await this.farming.stakingTokenAsDeployer.mint(this.signers.user.address, parseEther("100"));
                  // alice approve farming range
                  await this.farming.stakingTokenAsAlice.approve(this.farming.farmingRange.address, parseEther("100"));
                  // alice deposit @block number #(mockedBlock+6)
                  await this.farming.farmingRangeAsAlice.deposit(constants.Zero, parseEther("100"));
                  // alice withdraw @block number #(mockedBlock+7)
                  await advanceBlockTo(this.farming.mockedBlock.add(11).toNumber());
                  await this.farming.farmingRangeAsAlice.withdraw(constants.Zero, parseEther("100"));

                  expect(await this.farming.stakingToken.balanceOf(this.signers.user.address)).to.eq(parseEther("100"));
                  expect((await this.farming.farmingRangeAsAlice.campaignInfo(constants.Zero)).totalStaked).to.eq(
                    constants.Zero,
                  );
                  expect(await this.farming.rewardToken.balanceOf(this.signers.user.address)).to.eq(parseEther("200"));
                });
              });
            });
            context("When alice's deposit block exceeds the end block", async function () {
              it("won't distribute any rewards to alice", async function () {
                const mintedReward = INITIAL_BONUS_REWARD_PER_BLOCK.mul(
                  this.farming.mockedBlock.add(10).sub(this.farming.mockedBlock.add(8)),
                );
                // mint reward token to Deployer (when add rewardInfo)
                await this.farming.rewardTokenAsDeployer.mint(this.signers.admin.address, mintedReward);
                // scenario: alice deposit #n amount staking token to the pool
                // when the time past, block number increase, alice expects to have her reward amount by calling `pendingReward()`
                // this scenario occurred between block #(mockedBlock+8)-..#(mockedBlock+10)
                await this.farming.farmingRangeAsDeployer.addCampaignInfo(
                  this.farming.stakingToken.address,
                  this.farming.rewardToken.address,
                  this.farming.mockedBlock.add(8),
                );

                await this.farming.farmingRangeAsDeployer.addRewardInfo(
                  0,
                  this.farming.mockedBlock.add(10),
                  INITIAL_BONUS_REWARD_PER_BLOCK,
                );
                // mint staking token to alice
                await this.farming.stakingTokenAsDeployer.mint(this.signers.user.address, parseEther("100"));
                // mint staking token to bob
                await this.farming.stakingTokenAsDeployer.mint(this.signers.feeTo.address, parseEther("100"));

                // alice & bob approve farming range
                await this.farming.stakingTokenAsAlice.approve(this.farming.farmingRange.address, parseEther("100"));
                await this.farming.stakingTokenAsBob.approve(this.farming.farmingRange.address, parseEther("100"));
                const toBeAdvancedBlockNum = await latestBlockNumber();
                // advanced block to 100
                await advanceBlockTo(toBeAdvancedBlockNum.add(100).toNumber());
                // alice deposit @block number #(mockedBlock+9+100)
                await this.farming.farmingRangeAsAlice.deposit(constants.Zero, parseEther("100"));
                // alice withdraw @block number #(mockedBlock+10+100)
                await this.farming.farmingRangeAsAlice.withdraw(constants.Zero, parseEther("100"));

                expect(await this.farming.stakingToken.balanceOf(this.signers.user.address)).to.eq(parseEther("100"));
                expect((await this.farming.farmingRangeAsAlice.campaignInfo(constants.Zero)).totalStaked).to.eq(
                  constants.Zero,
                );
                expect(await this.farming.rewardToken.balanceOf(this.signers.user.address)).to.eq(constants.Zero);
              });
            });
          });
        });
        context("When there are multiple reward info (multiple phases)", async function () {
          context("When alice finish deposit within the first phase", async function () {
            it("should accrue the correct reward corresponding to different phases", async function () {
              const mintedRewardPhase1 = INITIAL_BONUS_REWARD_PER_BLOCK.mul(
                this.farming.mockedBlock.add(12).sub(this.farming.mockedBlock.add(10)),
              );
              const mintedRewardPhase2 = INITIAL_BONUS_REWARD_PER_BLOCK.add(parseEther("100")).mul(
                this.farming.mockedBlock.add(22).sub(this.farming.mockedBlock.add(12)),
              );
              const mintedReward = mintedRewardPhase1.add(mintedRewardPhase2);
              // mint reward token to Deployer (when add rewardInfo)
              await this.farming.rewardTokenAsDeployer.mint(this.signers.admin.address, mintedReward);
              // scenario: alice deposit #n amount staking token to the pool
              // when the time past, block number increase, alice expects to have her reward amount by calling `pendingReward()`
              // this scenario occurred between block #(mockedBlock+9)-..#(mockedBlock+11)
              await this.farming.farmingRangeAsDeployer.addCampaignInfo(
                this.farming.stakingToken.address,
                this.farming.rewardToken.address,
                this.farming.mockedBlock.add(10),
              );

              await this.farming.farmingRangeAsDeployer.addRewardInfo(
                0,
                this.farming.mockedBlock.add(12),
                INITIAL_BONUS_REWARD_PER_BLOCK,
              );

              await this.farming.farmingRangeAsDeployer.addRewardInfo(
                0,
                this.farming.mockedBlock.add(22),
                INITIAL_BONUS_REWARD_PER_BLOCK.add(parseEther("100")), // 200 reward per block
              );
              // mint staking token to alice
              await this.farming.stakingTokenAsDeployer.mint(this.signers.user.address, parseEther("100"));
              // mint staking token to bob
              await this.farming.stakingTokenAsDeployer.mint(this.signers.feeTo.address, parseEther("100"));
              // alice & bob approve farming range
              await this.farming.stakingTokenAsAlice.approve(this.farming.farmingRange.address, parseEther("100"));
              await this.farming.stakingTokenAsBob.approve(this.farming.farmingRange.address, parseEther("100"));

              // alice deposit @block number #(mockedBlock+10)
              await this.farming.farmingRangeAsAlice.deposit(constants.Zero, parseEther("100"));
              await advanceBlockTo(this.farming.mockedBlock.add(11).toNumber());
              // bob deposit @block number #(mockedBlock+12)
              await this.farming.farmingRangeAsBob.deposit(constants.Zero, parseEther("100"));

              const currentBlockNum = await latestBlockNumber();
              // alice should expect to see her pending reward according to calculated reward per share and her deposit
              const expectedAccRewardPerShare = constants.Two.mul(parseUnits("1", 20)); // reward per share 2 (phase1)
              expect((await this.farming.farmingRangeAsAlice.campaignInfo(0)).lastRewardBlock).to.eq(currentBlockNum);
              expect((await this.farming.farmingRangeAsAlice.campaignInfo(0)).accRewardPerShare).to.eq(
                expectedAccRewardPerShare,
              );
              await advanceBlockTo(this.farming.mockedBlock.add(21).toNumber());
              // 2 from last acc reward + ((10*200)/200 = 2000/200 = 10 from second acc reward)

              await this.farming.farmingRangeAsAlice.withdraw(constants.Zero, parseEther("100"));
              await this.farming.farmingRangeAsBob.withdraw(constants.Zero, parseEther("100"));

              // (10*200)/200 = 2000/200 = 10
              expect(await this.farming.stakingToken.balanceOf(this.signers.user.address)).to.eq(parseEther("100"));
              expect(await this.farming.stakingToken.balanceOf(this.signers.feeTo.address)).to.eq(parseEther("100"));

              expect((await this.farming.farmingRangeAsAlice.campaignInfo(constants.Zero)).totalStaked).to.eq(
                constants.Zero,
              );
              expect(await this.farming.rewardToken.balanceOf(this.signers.user.address)).to.eq(parseEther("1200"));
              expect(await this.farming.rewardToken.balanceOf(this.signers.feeTo.address)).to.eq(parseEther("1000"));
            });
          });
          context("When alice finish deposit within the second phase", async function () {
            it("should accrue the correct reward corresponding to different phases", async function () {
              const mintedRewardPhase1 = INITIAL_BONUS_REWARD_PER_BLOCK.mul(
                this.farming.mockedBlock.add(12).sub(this.farming.mockedBlock.add(10)),
              );
              const mintedRewardPhase2 = INITIAL_BONUS_REWARD_PER_BLOCK.add(parseEther("100")).mul(
                this.farming.mockedBlock.add(22).sub(this.farming.mockedBlock.add(12)),
              );
              const totalMintedReward = mintedRewardPhase1.add(mintedRewardPhase2);
              // mint reward token to Deployer (when add rewardInfo)
              await this.farming.rewardTokenAsDeployer.mint(this.signers.admin.address, totalMintedReward);
              // scenario: alice deposit #n amount staking token to the pool
              // when the time past, block number increase, alice expects to have her reward amount by calling `pendingReward()`
              // this scenario occurred between block #(mockedBlock+9)-..#(mockedBlock+11)
              await this.farming.farmingRangeAsDeployer.addCampaignInfo(
                this.farming.stakingToken.address,
                this.farming.rewardToken.address,
                this.farming.mockedBlock.add(10),
              );

              await this.farming.farmingRangeAsDeployer.addRewardInfo(
                0,
                this.farming.mockedBlock.add(12),
                INITIAL_BONUS_REWARD_PER_BLOCK,
              );

              await this.farming.farmingRangeAsDeployer.addRewardInfo(
                0,
                this.farming.mockedBlock.add(22),
                INITIAL_BONUS_REWARD_PER_BLOCK.add(parseEther("100")), // 200 reward per block
              );
              // mint staking token to alice
              await this.farming.stakingTokenAsDeployer.mint(this.signers.user.address, parseEther("100"));
              // mint staking token to bob
              await this.farming.stakingTokenAsDeployer.mint(this.signers.feeTo.address, parseEther("100"));
              // alice & bob approve farming range
              await this.farming.stakingTokenAsAlice.approve(this.farming.farmingRange.address, parseEther("100"));
              await this.farming.stakingTokenAsBob.approve(this.farming.farmingRange.address, parseEther("100"));

              // alice deposit @block number #(mockedBlock+10)
              await this.farming.farmingRangeAsAlice.deposit(constants.Zero, parseEther("100"));
              // skip to phase 2
              await advanceBlockTo(this.farming.mockedBlock.add(13).toNumber());
              // bob deposit @block number #(mockedBlock+14)
              await this.farming.farmingRangeAsBob.deposit(constants.Zero, parseEther("100"));
              const currentBlockNum = await latestBlockNumber();

              // alice should expect to see her pending reward according to calculated reward per share and her deposit
              // reward per share =  2(100)/100 = 2 (phase1) and ((200(reward per block) * 2(multiplier))/(100(totalsupply)) =  4/1 = 4 (phase2))
              // thus 4 + 2 = 6 reward per share
              const expectedAccRewardPerShare = BigNumber.from(6).mul(parseUnits("1", 20));
              expect((await this.farming.farmingRangeAsAlice.campaignInfo(0)).lastRewardBlock).to.eq(currentBlockNum);
              expect((await this.farming.farmingRangeAsAlice.campaignInfo(0)).accRewardPerShare).to.eq(
                expectedAccRewardPerShare,
              );
              await advanceBlockTo(this.farming.mockedBlock.add(21).toNumber());

              await this.farming.farmingRangeAsAlice.withdraw(constants.Zero, parseEther("100"));
              await this.farming.farmingRangeAsBob.withdraw(constants.Zero, parseEther("100"));

              expect(await this.farming.stakingToken.balanceOf(this.signers.user.address)).to.eq(parseEther("100"));
              expect(await this.farming.stakingToken.balanceOf(this.signers.feeTo.address)).to.eq(parseEther("100"));

              expect((await this.farming.farmingRangeAsAlice.campaignInfo(constants.Zero)).totalStaked).to.eq(
                constants.Zero,
              );

              // alice will get 6 * 100 = 600 for the latest accu reward and (200 * 8)/200 * 100 = 800 for latest reward block to the end block
              expect(await this.farming.rewardToken.balanceOf(this.signers.user.address)).to.eq(parseEther("1400"));
              expect(await this.farming.rewardToken.balanceOf(this.signers.feeTo.address)).to.eq(parseEther("800"));
            });
          });
        });
      });
      context("When there are multiple campaigns", async function () {
        it("should correctly separate rewards and total staked", async function () {
          const mintedRewardCampaign1Phase1 = INITIAL_BONUS_REWARD_PER_BLOCK.mul(
            this.farming.mockedBlock.add(14).sub(this.farming.mockedBlock.add(11)),
          );
          const mintedRewardCampaign2Phase1 = INITIAL_BONUS_REWARD_PER_BLOCK.add(parseEther("100")).mul(
            this.farming.mockedBlock.add(35).sub(this.farming.mockedBlock.add(15)),
          );
          const totalMintedReward = mintedRewardCampaign2Phase1.add(mintedRewardCampaign1Phase1);
          // mint reward token to Deployer (when add rewardInfo)
          await this.farming.rewardTokenAsDeployer.mint(this.signers.admin.address, totalMintedReward);
          // scenario: alice deposit #n amount staking token to the pool
          // when the time past, block number increase, alice expects to have her reward amount by calling `rewardToekn()`
          // this scenario occurred between block #(mockedBlock+10)-..#(mockedBlock+17) for campaign 0 and 1
          await this.farming.farmingRangeAsDeployer.addCampaignInfo(
            this.farming.stakingToken.address,
            this.farming.rewardToken.address,
            this.farming.mockedBlock.add(11),
          );

          await this.farming.farmingRangeAsDeployer.addCampaignInfo(
            this.farming.stakingToken.address,
            this.farming.rewardToken.address,
            this.farming.mockedBlock.add(15),
          );

          // set reward for campaign 0
          await this.farming.farmingRangeAsDeployer.addRewardInfo(
            0,
            this.farming.mockedBlock.add(14),
            INITIAL_BONUS_REWARD_PER_BLOCK,
          );

          // set reward for campaign 1
          await this.farming.farmingRangeAsDeployer.addRewardInfo(
            1,
            this.farming.mockedBlock.add(35),
            INITIAL_BONUS_REWARD_PER_BLOCK.add(parseEther("100")),
          );
          // mint staking token to alice
          await this.farming.stakingTokenAsDeployer.mint(this.signers.user.address, parseEther("1000"));
          // mint staking token to bob
          await this.farming.stakingTokenAsDeployer.mint(this.signers.feeTo.address, parseEther("1000"));
          // alice & bob approve farming range
          await this.farming.stakingTokenAsAlice.approve(this.farming.farmingRange.address, parseEther("1000"));
          await this.farming.stakingTokenAsBob.approve(this.farming.farmingRange.address, parseEther("1000"));

          // ### campaign 0 ###
          // alice deposit @block number #(mockedBlock+11)
          await this.farming.farmingRangeAsAlice.deposit(constants.Zero, parseEther("100"));
          await advanceBlockTo(this.farming.mockedBlock.add(12).toNumber());
          // bob deposit @block number #(mockedBlock+13)
          await this.farming.farmingRangeAsBob.deposit(constants.Zero, parseEther("200"));
          let currentBlockNum = await latestBlockNumber();

          // alice should expect to see her pending reward according to calculated reward per share and her deposit
          let expectedAccRewardPerShare = constants.Two.mul(parseUnits("1", 20)); // reward per share 1
          expect((await this.farming.farmingRangeAsAlice.campaignInfo(0)).lastRewardBlock).to.eq(currentBlockNum);
          expect((await this.farming.farmingRangeAsAlice.campaignInfo(0)).accRewardPerShare).to.eq(
            expectedAccRewardPerShare,
          );
          expect((await this.farming.farmingRangeAsAlice.campaignInfo(0)).totalStaked).to.eq(parseEther("300"));

          await this.farming.farmingRangeAsAlice.withdraw(constants.Zero, parseEther("100"));
          await this.farming.farmingRangeAsBob.withdraw(constants.Zero, parseEther("200"));

          expect(await this.farming.stakingToken.balanceOf(this.signers.user.address)).to.eq(parseEther("1000"));
          expect(await this.farming.stakingToken.balanceOf(this.signers.feeTo.address)).to.eq(parseEther("1000"));

          expect((await this.farming.farmingRangeAsAlice.campaignInfo(constants.Zero)).totalStaked).to.eq(
            constants.Zero,
          );
          expect(await this.farming.rewardToken.balanceOf(this.signers.user.address)).to.eq(
            parseEther("233.333333333333333333"),
          );
          expect(await this.farming.rewardToken.balanceOf(this.signers.feeTo.address)).to.eq(
            parseEther("66.666666666666666666"),
          );

          // ### campaign 1 ##
          await advanceBlockTo(this.farming.mockedBlock.add(18).toNumber());
          // alice deposit @block number #(mockedBlock+19)
          await this.farming.farmingRangeAsAlice.deposit(constants.One, parseEther("400"));
          await advanceBlockTo(this.farming.mockedBlock.add(24).toNumber());
          // bob deposit @block number #(mockedBlock+25)
          await this.farming.farmingRangeAsBob.deposit(constants.One, parseEther("600"));

          currentBlockNum = await latestBlockNumber();

          // reward per share calculated by 25 - 19 = 6 block diff * 200 rewards / 400 current staked from alice
          // = 1200 / 400 = 3 reward per share
          expectedAccRewardPerShare = BigNumber.from(3).mul(parseUnits("1", 20));
          expect((await this.farming.farmingRangeAsAlice.campaignInfo(1)).lastRewardBlock).to.eq(currentBlockNum);
          expect((await this.farming.farmingRangeAsAlice.campaignInfo(1)).accRewardPerShare).to.eq(
            expectedAccRewardPerShare,
          );
          expect((await this.farming.farmingRangeAsAlice.campaignInfo(1)).totalStaked).to.eq(parseEther("1000"));

          await this.farming.farmingRangeAsAlice.withdraw(constants.One, parseEther("400"));
          await this.farming.farmingRangeAsBob.withdraw(constants.One, parseEther("600"));
          // alice should expect to see her  reward according to calculated reward per share and her deposit

          expect((await this.farming.farmingRangeAsAlice.campaignInfo(constants.One)).totalStaked).to.eq(
            constants.Zero,
          );
          expect((await this.farming.farmingRangeAsBob.campaignInfo(constants.One)).totalStaked).to.eq(constants.Zero);
          // alice will get a total of (3 reward per share* 400(from last accu) = 1200) + (200 rewards * 1 multiplier / 1000 total staked = 2/10 = 0.2 * 400 = 80) = 1280
          // with prev campaign, alice will get in total of = 1280 + 233.3333 = 1513.333
          expect(await this.farming.rewardToken.balanceOf(this.signers.user.address)).to.eq(
            parseEther("1513.333333333333333333"),
          );
          // not .666666 due to accRewardPerShare rounding
          expect(await this.farming.rewardToken.balanceOf(this.signers.feeTo.address)).to.eq(
            parseEther("386.666666666666666664"),
          );
        });
      });
    });
  });
}
