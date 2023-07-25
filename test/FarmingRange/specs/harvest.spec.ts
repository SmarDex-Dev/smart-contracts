import { parseEther, parseUnits } from "ethers/lib/utils";
import { expect } from "chai";
import { BigNumber, constants } from "ethers";
import { INITIAL_BONUS_REWARD_PER_BLOCK } from "../utils";
import { advanceBlockTo, latestBlockNumber } from "../../helpers/time";

export function shouldBehaveLikeHarvest() {
  describe("#harvest()", async function () {
    context("With invalid parameters", async function () {
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
              context("when alice harvest within the range of reward blocks", async function () {
                it("should receive a reward correctly", async function () {
                  const mintedReward = INITIAL_BONUS_REWARD_PER_BLOCK.mul(
                    this.farming.mockedBlock.add(9).sub(this.farming.mockedBlock.add(7)),
                  );
                  // mint reward token to Deployer (when add rewardInfo)
                  await this.farming.rewardTokenAsDeployer.mint(this.signers.admin.address, mintedReward);
                  // scenario: alice deposit #n amount staking token to the pool
                  // when the time past, block number increase, alice expects to have her reward amount by calling `rewardToken()`
                  // this scenario occurred between block #(mockedBlock+6)-..#(mockedBlock+8)
                  // and alice harvest reward from staking token pool
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
                  await this.farming.farmingRangeAsAlice.harvest([constants.Zero]);

                  expect(await this.farming.stakingToken.balanceOf(this.signers.user.address)).to.eq(constants.Zero);
                  expect((await this.farming.farmingRangeAsAlice.campaignInfo(constants.Zero)).totalStaked).to.eq(
                    parseEther("100"),
                  );
                  expect(await this.farming.rewardToken.balanceOf(this.signers.user.address)).to.eq(mintedReward);
                });
              });
              context("when alice harvest out the range of reward blocks", async function () {
                it("should receive a reward correctly", async function () {
                  const mintedReward = INITIAL_BONUS_REWARD_PER_BLOCK.mul(
                    this.farming.mockedBlock.add(9).sub(this.farming.mockedBlock.add(7)),
                  );
                  // mint reward token to Deployer (when add rewardInfo)
                  await this.farming.rewardTokenAsDeployer.mint(this.signers.admin.address, mintedReward);
                  // scenario: alice deposit  #n amount staking token to the pool
                  // when the time past, block number increase, alice expects to have her reward amount by calling 'rewardToken'
                  // this scenario occurred between block #(mockedBlock+7)-..#(mockedBlock+8)
                  // and alice harvest amount from staking token pool after end time
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
                  await advanceBlockTo(this.farming.mockedBlock.add(20).toNumber());
                  await this.farming.farmingRangeAsAlice.harvest([constants.Zero]);

                  expect(await this.farming.stakingToken.balanceOf(this.signers.user.address)).to.eq(constants.Zero);
                  expect((await this.farming.farmingRangeAsAlice.campaignInfo(constants.Zero)).totalStaked).to.eq(
                    parseEther("100"),
                  );
                  expect(await this.farming.rewardToken.balanceOf(this.signers.user.address)).to.eq(mintedReward);
                });
              });
            });
            context("When alice's deposit before the start block ", async function () {
              context("when alice harvest within the range of reward blocks", async function () {
                it("should receive a reward correctly", async function () {
                  const mintedReward = INITIAL_BONUS_REWARD_PER_BLOCK.mul(
                    this.farming.mockedBlock.add(10).sub(this.farming.mockedBlock.add(8)),
                  );
                  // mint reward token to Deployer (when add rewardInfo)
                  await this.farming.rewardTokenAsDeployer.mint(this.signers.admin.address, mintedReward);
                  // scenario: alice deposit #n amount staking token to the pool
                  // when the time past, block number increase, alice expects to have her reward amount by calling `rewardToken()`
                  // this scenario occurred between block #(mockedBlock+8)-..#(mockedBlock+10)
                  // and alice harvest rewards from staking token pool
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
                  await this.farming.farmingRangeAsAlice.harvest([constants.Zero]);

                  expect(await this.farming.stakingToken.balanceOf(this.signers.user.address)).to.eq(constants.Zero);
                  expect((await this.farming.farmingRangeAsAlice.campaignInfo(constants.Zero)).totalStaked).to.eq(
                    parseEther("100"),
                  );
                  expect(await this.farming.rewardToken.balanceOf(this.signers.user.address)).to.eq(mintedReward);
                });
              });
              context("when alice harvest out the range of reward blocks", async function () {
                it("should receive a reward correctly", async function () {
                  const mintedReward = INITIAL_BONUS_REWARD_PER_BLOCK.mul(
                    this.farming.mockedBlock.add(11).sub(this.farming.mockedBlock.add(9)),
                  );
                  // mint reward token to Deployer (when add rewardInfo)
                  await this.farming.rewardTokenAsDeployer.mint(this.signers.admin.address, mintedReward); // scenario: alice deposit #n amount staking token to the pool
                  // when the time past, block number increase, alice expects to have her reward amount by calling `rewardToken()`
                  // this scenario occurred between block #(mockedBlock+5)-..#(mockedBlock+9)
                  // and alice harvest amount from staking token pool
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
                  await this.farming.farmingRangeAsAlice.harvest([constants.Zero]);

                  expect(await this.farming.stakingToken.balanceOf(this.signers.user.address)).to.eq(constants.Zero);
                  expect((await this.farming.farmingRangeAsAlice.campaignInfo(constants.Zero)).totalStaked).to.eq(
                    parseEther("100"),
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
                // alice withdraw @block number #(mockedBlock+7)
                await this.farming.farmingRangeAsAlice.harvest([constants.Zero]);

                expect(await this.farming.stakingToken.balanceOf(this.signers.user.address)).to.eq(constants.Zero);
                expect((await this.farming.farmingRangeAsAlice.campaignInfo(constants.Zero)).totalStaked).to.eq(
                  parseEther("100"),
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
              // 2 (from last acc reward) + ((10*200)/200 = 2000/200 = 10)
              await this.farming.farmingRangeAsAlice.harvest([constants.Zero]);
              await this.farming.farmingRangeAsBob.harvest([constants.Zero]);

              // (10*200)/200 = 2000/200 = 10
              expect(await this.farming.stakingToken.balanceOf(this.signers.user.address)).to.eq(constants.Zero);
              expect(await this.farming.stakingToken.balanceOf(this.signers.feeTo.address)).to.eq(constants.Zero);
              expect((await this.farming.farmingRangeAsAlice.campaignInfo(constants.Zero)).totalStaked).to.eq(
                parseEther("200"),
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
              await this.farming.rewardTokenAsDeployer.mint(this.signers.admin.address, totalMintedReward); // scenario: alice deposit #n amount staking token to the pool
              // when the time past, block number increase, alice expects to have her reward amount by calling `pendingReward()`
              // this scenario occurred between block #(mockedBlock+10)-..#(mockedBlock+12)
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
              // reward per share 2 (phase1) and ((200(reward per block) * 2(multiplier))/(200(totalsupply)) =  4/1 = 4 (phase2))
              // so 4 + 2 = 6 accu reward per share
              const expectedAccRewardPerShare = BigNumber.from(6).mul(parseUnits("1", 20));
              expect((await this.farming.farmingRangeAsAlice.campaignInfo(0)).lastRewardBlock).to.eq(currentBlockNum);
              expect((await this.farming.farmingRangeAsAlice.campaignInfo(0)).accRewardPerShare).to.eq(
                expectedAccRewardPerShare,
              );
              await advanceBlockTo(this.farming.mockedBlock.add(21).toNumber());

              await this.farming.farmingRangeAsAlice.harvest([constants.Zero]);
              await this.farming.farmingRangeAsBob.harvest([constants.Zero]);

              expect(await this.farming.stakingToken.balanceOf(this.signers.user.address)).to.eq(constants.Zero);
              expect(await this.farming.stakingToken.balanceOf(this.signers.feeTo.address)).to.eq(constants.Zero);

              expect((await this.farming.farmingRangeAsAlice.campaignInfo(constants.Zero)).totalStaked).to.eq(
                parseEther("200"),
              );
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
            this.farming.mockedBlock.add(22).sub(this.farming.mockedBlock.add(15)),
          );
          const totalMintedReward = mintedRewardCampaign2Phase1.add(mintedRewardCampaign1Phase1);
          // mint reward token to Deployer (when add rewardInfo)
          await this.farming.rewardTokenAsDeployer.mint(this.signers.admin.address, totalMintedReward); // scenario: alice deposit #n amount staking token to the pool
          // when the time past, block number increase, alice expects to have her reward amount by calling `rewardToekn()`
          // this scenario occurred between block #(mockedBlock+10)-..#(mockedBlock+21) for campaign 0 and 1
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
            this.farming.mockedBlock.add(22),
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

          // alice withdraw @block number #(mockedBlock)
          // alice should expect to see her pending reward according to calculated reward per share and her deposit
          let expectedAccRewardPerShare = constants.Two.mul(parseUnits("1", 20)); // reward per share 2
          expect((await this.farming.farmingRangeAsAlice.campaignInfo(0)).lastRewardBlock).to.eq(currentBlockNum);
          expect((await this.farming.farmingRangeAsAlice.campaignInfo(0)).accRewardPerShare).to.eq(
            expectedAccRewardPerShare,
          );
          expect((await this.farming.farmingRangeAsAlice.campaignInfo(0)).totalStaked).to.eq(parseEther("300"));

          await this.farming.farmingRangeAsAlice.harvest([constants.Zero]);
          await this.farming.farmingRangeAsBob.harvest([constants.Zero]);

          expect(await this.farming.stakingToken.balanceOf(this.signers.user.address)).to.eq(parseEther("900"));
          expect(await this.farming.stakingToken.balanceOf(this.signers.feeTo.address)).to.eq(parseEther("800"));

          expect((await this.farming.farmingRangeAsAlice.campaignInfo(constants.Zero)).totalStaked).to.eq(
            parseEther("300"),
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
          // bob deposit @block number #(mockedBlock+20)
          await this.farming.farmingRangeAsBob.deposit(constants.One, parseEther("600"));

          currentBlockNum = await latestBlockNumber();
          await advanceBlockTo(this.farming.mockedBlock.add(22).toNumber());
          // reward per share calculated by 20 - 19 = 1 block diff * 200 rewards / 400 current staked from alice
          // = 200 / 400 = 0.5 accu reward per share
          expectedAccRewardPerShare = parseEther("50");
          expect((await this.farming.farmingRangeAsAlice.campaignInfo(1)).lastRewardBlock).to.eq(currentBlockNum);
          expect((await this.farming.farmingRangeAsAlice.campaignInfo(1)).accRewardPerShare).to.eq(
            expectedAccRewardPerShare,
          );
          expect((await this.farming.farmingRangeAsAlice.campaignInfo(1)).totalStaked).to.eq(parseEther("1000"));
          // harvest
          await this.farming.farmingRangeAsAlice.harvest([constants.One]);
          await this.farming.farmingRangeAsBob.harvest([constants.One]);
          // alice should expect to see her pending reward according to calculated reward per share and her deposit

          expect(await this.farming.stakingToken.balanceOf(this.signers.user.address)).to.eq(parseEther("500"));
          expect(await this.farming.stakingToken.balanceOf(this.signers.feeTo.address)).to.eq(parseEther("200"));
          expect((await this.farming.farmingRangeAsAlice.campaignInfo(constants.One)).totalStaked).to.eq(
            parseEther("1000"),
          );
          expect(await this.farming.rewardToken.balanceOf(this.signers.user.address)).to.eq(
            parseEther("593.333333333333333333"),
          );
          expect(await this.farming.rewardToken.balanceOf(this.signers.feeTo.address)).to.eq(
            parseEther("306.666666666666666666"),
          );
        });
      });
    });
  });
}
