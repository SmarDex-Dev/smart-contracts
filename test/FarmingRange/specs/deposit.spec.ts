import { parseEther, parseUnits } from "ethers/lib/utils";
import { expect } from "chai";
import { BigNumber, constants } from "ethers";
import { INITIAL_BONUS_REWARD_PER_BLOCK } from "../utils";
import { advanceBlockTo, latestBlockNumber } from "../../helpers/time";
import { assertAlmostEqual } from "../../helpers/assert";

export function shouldBehaveLikeDeposit() {
  describe("#deposit()", async function () {
    context("With invalid parameters", async function () {
      context("When there is NO predefined campaign", async function () {
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
      context("When the user doesn't approve the contract", async function () {
        it("should revert the tx since safe transfer is invalid", async function () {
          const mintedReward = INITIAL_BONUS_REWARD_PER_BLOCK.mul(
            this.farming.mockedBlock.add(11).sub(this.farming.mockedBlock.add(9)),
          );
          // mint reward token to Deployer (when add rewardInfo)
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
              context("When alice deposit again with different block time", async function () {
                it("should return reward from previous deposit to alice", async function () {
                  const mintedReward = INITIAL_BONUS_REWARD_PER_BLOCK.mul(
                    this.farming.mockedBlock.add(17).sub(this.farming.mockedBlock.add(7)),
                  );
                  // mint reward token to Deployer (when add rewardInfo)
                  await this.farming.rewardTokenAsDeployer.mint(this.signers.admin.address, mintedReward);
                  // scenario: alice deposit #n amount staking token to the pool
                  // when the time past, block number increase, alice expects to have her reward amount by calling `pendingReward()`
                  // this scenario occurred between block #(mockedBlock+6)-..#(mockedBlock+16)
                  await this.farming.farmingRangeAsDeployer.addCampaignInfo(
                    this.farming.stakingToken.address,
                    this.farming.rewardToken.address,
                    this.farming.mockedBlock.add(7),
                  );

                  await this.farming.farmingRangeAsDeployer.addRewardInfo(
                    0,
                    this.farming.mockedBlock.add(17),
                    INITIAL_BONUS_REWARD_PER_BLOCK,
                  );
                  // mint staking token to alice
                  await this.farming.stakingTokenAsDeployer.mint(this.signers.user.address, parseEther("300"));
                  // alice approve farming range
                  await this.farming.stakingTokenAsAlice.approve(this.farming.farmingRange.address, parseEther("300"));

                  // alice deposit @block number #(mockedBlock+7)
                  await this.farming.farmingRangeAsAlice.deposit(constants.Zero, parseEther("100"));
                  await advanceBlockTo(this.farming.mockedBlock.add(8).toNumber());
                  // alice deposit @block number #(mockedBlock+8)
                  await this.farming.farmingRangeAsAlice.deposit(constants.Zero, parseEther("200"));
                  const currentBlockNum = await latestBlockNumber();
                  // advance a block number to #(mockedBlock+17)
                  await advanceBlockTo(this.farming.mockedBlock.add(17).toNumber());
                  // alice should expect to see her pending reward according to calculated reward per share and her deposit
                  const expectedAccRewardPerShare = constants.Two.mul(parseUnits("1", 20));
                  expect((await this.farming.farmingRangeAsAlice.campaignInfo(0)).lastRewardBlock).to.eq(
                    currentBlockNum,
                  );
                  expect((await this.farming.farmingRangeAsAlice.campaignInfo(0)).accRewardPerShare).to.eq(
                    expectedAccRewardPerShare,
                  );
                  expect((await this.farming.farmingRangeAsAlice.campaignInfo(0)).totalStaked).to.eq(parseEther("300"));

                  // acc reward per share from block 7 to block 8 = 1
                  // alice will get a reward in a total of 100 reward
                  // not the total deposit of alice is 300, totalStaked should be 300 as well
                  // reward debt will be 300
                  // alice expect to get a pending reward from block 8 to 16 = 8 sec
                  // total reward from block 8 to 16 is ((8 * 100)/300) = 2.6666667
                  // thus the overall reward per share will be 3.666666666666
                  // pending reward of alice will be 300(3.666666666666) - 300 = 1100 - 300 ~ 800
                  assertAlmostEqual(
                    (
                      await this.farming.farmingRangeAsAlice.pendingReward(constants.Zero, this.signers.user.address)
                    ).toString(),
                    parseEther("800").toString(),
                  );

                  //after first deposit, alice get rewards
                  expect(await this.farming.rewardToken.balanceOf(this.signers.user.address)).to.eq(parseEther("200"));
                });
              });
              context("when calling update campaign within the range of reward blocks", async function () {
                context("when the current block time (alice time) is before the starting time", async function () {
                  it("#pendingReward() will recalculate the accuReward and return the correct reward corresponding to the starting blocktime", async function () {
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
                    await this.farming.stakingTokenAsAlice.approve(
                      this.farming.farmingRange.address,
                      parseEther("100"),
                    );

                    // alice deposit @block number #(mockedBlock+7)
                    await this.farming.farmingRangeAsAlice.deposit(constants.Zero, parseEther("100"));
                    // alice call update campaign @block number #(mockedBlock+8)
                    await this.farming.farmingRangeAsAlice.updateCampaign(constants.Zero);
                    const currentBlockNum = await latestBlockNumber();
                    // advance a block number to #(mockedBlock+18) 10 block diff from last campaign updated
                    await advanceBlockTo(this.farming.mockedBlock.add(18).toNumber());
                    // alice should expect to see her pending reward according to calculated reward per share and her deposit
                    const expectedAccRewardPerShare = constants.Zero; // reward per share = 0, since alice deposited before the block start, and calling update campaign on the start block
                    expect((await this.farming.farmingRangeAsAlice.campaignInfo(0)).lastRewardBlock).to.eq(
                      currentBlockNum,
                    );
                    expect((await this.farming.farmingRangeAsAlice.campaignInfo(0)).accRewardPerShare).to.eq(
                      expectedAccRewardPerShare,
                    );

                    // totalReward = (100 * 10) = 1000
                    // reward per share = 1000/100 = 10 reward per share
                    // alice deposit 100, thus will get overall of 1000 rewards individually
                    expect(
                      await this.farming.farmingRangeAsAlice.pendingReward(constants.Zero, this.signers.user.address),
                    ).to.eq(parseEther("1000"));
                  });
                });
                context("when the current block time is way too far than the latest reward", async function () {
                  context("should not distribute elapsed rewards to first depositor", async function () {
                    it("#pendingReward() will recalculate the accuReward and return the correct reward corresponding to the current blocktime", async function () {
                      const mintedReward = INITIAL_BONUS_REWARD_PER_BLOCK.mul(
                        this.farming.mockedBlock.add(18).sub(this.farming.mockedBlock.add(6)),
                      );
                      // mint reward token to Deployer (when add rewardInfo)
                      await this.farming.rewardTokenAsDeployer.mint(this.signers.admin.address, mintedReward);
                      // scenario: alice deposit #n amount staking token to the pool
                      // when the time past, block number increase, alice expects to have her reward amount by calling `pendingReward()`
                      // this scenario occurred between block #(mockedBlock+6)-..#(mockedBlock+18)
                      await this.farming.farmingRangeAsDeployer.addCampaignInfo(
                        this.farming.stakingToken.address,
                        this.farming.rewardToken.address,
                        this.farming.mockedBlock.add(6),
                      );

                      await this.farming.farmingRangeAsDeployer.addRewardInfo(
                        0,
                        this.farming.mockedBlock.add(18),
                        INITIAL_BONUS_REWARD_PER_BLOCK,
                      );
                      // mint staking token to alice
                      await this.farming.stakingTokenAsDeployer.mint(this.signers.user.address, parseEther("100"));
                      // alice approve farming range
                      await this.farming.stakingTokenAsAlice.approve(
                        this.farming.farmingRange.address,
                        parseEther("100"),
                      );

                      // alice deposit @block number #(mockedBlock+7)
                      await this.farming.farmingRangeAsAlice.deposit(constants.Zero, parseEther("100"));

                      // advance a block number to #(mockedBlock+12)
                      await advanceBlockTo(this.farming.mockedBlock.add(12).toNumber());
                      // alice call update campaign @block number #(mockedBlock+12)
                      await this.farming.farmingRangeAsAlice.updateCampaign(constants.Zero);
                      const currentBlockNum = await latestBlockNumber();

                      // advance a block number to #(mockedBlock+18) 10 block diff from update campaign
                      await advanceBlockTo(this.farming.mockedBlock.add(18).toNumber());

                      // alice should expect to see her pending reward according to calculated reward per share and her deposit
                      const expectedAccRewardPerShare = constants.Two.mul(parseUnits("1", 20)).mul(3); // reward per share = 2 * (3 past blocks)
                      expect((await this.farming.farmingRangeAsAlice.campaignInfo(0)).lastRewardBlock).to.eq(
                        currentBlockNum,
                      );
                      expect((await this.farming.farmingRangeAsAlice.campaignInfo(0)).accRewardPerShare).to.eq(
                        expectedAccRewardPerShare,
                      );

                      // alice should get a reward based on accRewardPerShare = 2 + (9(100)/100) =  2 + (900/100) = 2 + 9 = 11 reward per share
                      // thus, alice who deposit 100 will receive 11 * 100 = 1100
                      expect(
                        await this.farming.farmingRangeAsAlice.pendingReward(constants.Zero, this.signers.user.address),
                      ).to.eq(parseEther("1100"));
                    });
                    it("should update a correct reward per share and pending rewards", async function () {
                      const mintedReward = INITIAL_BONUS_REWARD_PER_BLOCK.mul(
                        this.farming.mockedBlock.add(9).sub(this.farming.mockedBlock.add(7)),
                      );
                      // mint reward token to Deployer (when add rewardInfo)
                      await this.farming.rewardTokenAsDeployer.mint(this.signers.admin.address, mintedReward);
                      // scenario: alice deposit #n amount staking token to the pool
                      // when the time past, block number increase, alice expects to have her reward amount by calling `pendingReward()`
                      // this scenario occurred between block #(mockedBlock+6)-..#(mockedBlock+8)
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
                      // alice & bob approve farming range
                      await this.farming.stakingTokenAsAlice.approve(
                        this.farming.farmingRange.address,
                        parseEther("100"),
                      );

                      // alice deposit @block number #(mockedBlock+7)
                      await this.farming.farmingRangeAsAlice.deposit(constants.Zero, parseEther("100"));
                      await advanceBlockTo(this.farming.mockedBlock.add(8).toNumber());
                      // update campaign @block number #(mockedBlock+9)
                      await this.farming.farmingRangeAsAlice.updateCampaign(constants.Zero);
                      const currentBlockNum = await latestBlockNumber();
                      // alice should expect to see her pending reward according to calculated reward per share and her deposit
                      // since alice is the first depositor, she shall get a reward from start block
                      const expectedAccRewardPerShare = constants.Two.mul(parseUnits("1", 20)); // reward per share 2
                      expect((await this.farming.farmingRangeAsAlice.campaignInfo(0)).lastRewardBlock).to.eq(
                        currentBlockNum,
                      );
                      expect((await this.farming.farmingRangeAsAlice.campaignInfo(0)).accRewardPerShare).to.eq(
                        expectedAccRewardPerShare,
                      );
                      // 2 rewards per share
                      // thus, alice who deposit 100, shall get a total of 200 rewards
                      expect(
                        await this.farming.farmingRangeAsAlice.pendingReward(constants.Zero, this.signers.user.address),
                      ).to.eq(parseEther("200"));
                    });
                  });
                });
              });
              context("when calling update campaign out of the range of reward blocks", async function () {
                it("should update a correct reward per share, pending rewards", async function () {
                  const mintedReward = INITIAL_BONUS_REWARD_PER_BLOCK.mul(
                    this.farming.mockedBlock.add(9).sub(this.farming.mockedBlock.add(7)),
                  );

                  // mint reward token to Deployer (when add rewardInfo)
                  await this.farming.rewardTokenAsDeployer.mint(this.signers.admin.address, mintedReward);
                  // scenario: alice deposit #n amount staking token to the pool
                  // when the time past, block number increase, alice expects to have her reward amount by calling `pendingReward()`
                  // this scenario occurred between block #(mockedBlock+7)-..#(mockedBlock+9)
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

                  // alice deposit @block number #(mockedBlock+8)
                  await this.farming.farmingRangeAsAlice.deposit(constants.Zero, parseEther("100"));
                  const toBeAdvancedBlockNum = await latestBlockNumber();
                  // advanced block to 100
                  await advanceBlockTo(toBeAdvancedBlockNum.add(100).toNumber());
                  // alice call update campaign @block number #(mockedBlock+9+100)
                  await this.farming.farmingRangeAsAlice.updateCampaign(constants.Zero);
                  // alice should expect to see her pending reward according to calculated reward per share and her deposit
                  const expectedAccRewardPerShare = constants.Two.mul(parseUnits("1", 20)); // reward per share 2, since range between start and end is 2, so right now reward is 2
                  // last reward block should be the end block, since when alice deposit, total supply is 0
                  expect((await this.farming.farmingRangeAsAlice.campaignInfo(0)).lastRewardBlock).to.eq(
                    this.farming.mockedBlock.add(9),
                  );
                  expect((await this.farming.farmingRangeAsAlice.campaignInfo(0)).accRewardPerShare).to.eq(
                    expectedAccRewardPerShare,
                  );
                  expect(
                    await this.farming.farmingRangeAsAlice.pendingReward(constants.Zero, this.signers.user.address),
                  ).to.eq(parseEther("200"));
                });
              });
            });
            context("When a deposit block exceeds the end block", async function () {
              it("won't distribute any rewards to alice", async function () {
                const mintedReward = INITIAL_BONUS_REWARD_PER_BLOCK.mul(
                  this.farming.mockedBlock.add(8).sub(this.farming.mockedBlock.add(6)),
                );

                // mint reward token to Deployer (when add rewardInfo)
                await this.farming.rewardTokenAsDeployer.mint(this.signers.admin.address, mintedReward);
                // scenario: alice deposit #n amount staking token to the pool
                // when the time past, block number increase, alice expects to have her reward amount by calling `pendingReward()`
                // this scenario occurred between block #(mockedBlock+6)-..#(mockedBlock+8)
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
                const toBeAdvancedBlockNum = await latestBlockNumber();
                // advanced block to 100
                await advanceBlockTo(toBeAdvancedBlockNum.add(100).toNumber());
                // alice deposit @block number #(mockedBlock+7+100)
                await this.farming.farmingRangeAsAlice.deposit(constants.Zero, parseEther("100"));
                // alice call update campaign @block number #(mockedBlock+8+100)
                await this.farming.farmingRangeAsAlice.updateCampaign(constants.Zero);
                // acc alpaca per share should be 0
                // last reward block should be from alice deposit, since the first time the total supply is 0, alice deposited 100 to it
                // alice, please don't expect anything, your deposit exceed end block
                const expectedAccRewardPerShare = constants.Zero; // reward per share 1
                expect((await this.farming.farmingRangeAsAlice.campaignInfo(0)).lastRewardBlock).to.eq(
                  this.farming.mockedBlock.add(7).add(100),
                ); // will end since alice's deposit block number
                expect((await this.farming.farmingRangeAsAlice.campaignInfo(0)).accRewardPerShare).to.eq(
                  expectedAccRewardPerShare,
                );
                expect(
                  await this.farming.farmingRangeAsAlice.pendingReward(constants.Zero, this.signers.user.address),
                ).to.eq(constants.Zero);
              });
            });
          });
          context("When alice and bob able to get the reward", async function () {
            context("When alice and bob deposit within the range of reward blocks", async function () {
              context("when calling update campaign within the range of reward blocks", async function () {
                it("should update a correct reward per share and pending rewards", async function () {
                  const mintedReward = INITIAL_BONUS_REWARD_PER_BLOCK.mul(
                    this.farming.mockedBlock.add(14).sub(this.farming.mockedBlock.add(9)),
                  );

                  // mint reward token to Deployer (when add rewardInfo)
                  await this.farming.rewardTokenAsDeployer.mint(this.signers.admin.address, mintedReward);
                  // scenario: alice deposit #n amount staking token to the pool
                  // when the time past, block number increase, alice expects to have her reward amount by calling `pendingReward()`
                  // this scenario occurred between block #(mockedBlock+9)-..#(mockedBlock+14)
                  await this.farming.farmingRangeAsDeployer.addCampaignInfo(
                    this.farming.stakingToken.address,
                    this.farming.rewardToken.address,
                    this.farming.mockedBlock.add(9),
                  );

                  await this.farming.farmingRangeAsDeployer.addRewardInfo(
                    0,
                    this.farming.mockedBlock.add(14),
                    INITIAL_BONUS_REWARD_PER_BLOCK,
                  );
                  // mint staking token to alice
                  await this.farming.stakingTokenAsDeployer.mint(this.signers.user.address, parseEther("100"));
                  // mint staking token to bob
                  await this.farming.stakingTokenAsDeployer.mint(this.signers.feeTo.address, parseEther("100"));
                  // alice & bob approve farming range
                  await this.farming.stakingTokenAsAlice.approve(this.farming.farmingRange.address, parseEther("100"));
                  await this.farming.stakingTokenAsBob.approve(this.farming.farmingRange.address, parseEther("100"));
                  // alice deposit @block number #(mockedBlock+9)
                  await this.farming.farmingRangeAsAlice.deposit(constants.Zero, parseEther("100"));
                  // bob deposit @block number #(mockedBlock+10)
                  await this.farming.farmingRangeAsBob.deposit(constants.Zero, parseEther("100"));
                  await advanceBlockTo(this.farming.mockedBlock.add(12).toNumber());
                  // alice call update campaign @block number #(mockedBlock+13)
                  await this.farming.farmingRangeAsAlice.updateCampaign(constants.Zero);
                  const currentBlockNum = await latestBlockNumber();

                  // when alice deposits, she is the first one, so the latest reward will still be a starting block
                  // once bob deposits, the latest reward will be #(mockedBlock+11)
                  // acc reward per share will be (2(100)/100 from block 9 to block 11) and (1(100)/200 from block 11 to 12) = 2.5
                  const expectedAccRewardPerShare = constants.One.mul(parseUnits("2.5", 20));
                  // B9---------------B10-------------------------------B14
                  // |- reward debt ---|---(alice deposit here)-----------|
                  // since total supply = 0 and alice is an initiator, only update the latest reward block to be B9
                  expect((await this.farming.farmingRangeAsAlice.campaignInfo(0)).lastRewardBlock).to.eq(
                    currentBlockNum,
                  );
                  expect((await this.farming.farmingRangeAsAlice.campaignInfo(0)).accRewardPerShare).to.eq(
                    expectedAccRewardPerShare,
                  );
                  expect(
                    await this.farming.farmingRangeAsAlice.pendingReward(constants.Zero, this.signers.user.address),
                  ).to.eq(parseEther("250"));
                  // Bob will get rewards for block 12, 13 and 14 shared with alice
                  // (14 - 11) * (100 / 2) = 150
                  expect(
                    await this.farming.farmingRangeAsBob.pendingReward(constants.Zero, this.signers.feeTo.address),
                  ).to.eq(parseEther("150"));
                });
              });
            });
          });
        });
        context("When there are multiple reward info (multiple phases)", async function () {
          context("When bob finish deposit within the first phase", async function () {
            it("should accrue the correct reward corresponding to different phases", async function () {
              const mintedRewardPhase1 = INITIAL_BONUS_REWARD_PER_BLOCK.mul(
                this.farming.mockedBlock.add(13).sub(this.farming.mockedBlock.add(10)),
              );
              const mintedRewardPhase2 = INITIAL_BONUS_REWARD_PER_BLOCK.add(parseEther("100")).mul(
                this.farming.mockedBlock.add(21).sub(this.farming.mockedBlock.add(13)),
              );

              const mintedReward = mintedRewardPhase1.add(mintedRewardPhase2);
              // mint reward token to Deployer (when add rewardInfo)
              await this.farming.rewardTokenAsDeployer.mint(this.signers.admin.address, mintedReward);
              // scenario: alice deposit #n amount staking token to the pool
              // when the time past, block number increase, alice expects to have her reward amount by calling `pendingReward()`
              // this scenario occurred between block #(mockedBlock+10)-..#(mockedBlock+13)
              await this.farming.farmingRangeAsDeployer.addCampaignInfo(
                this.farming.stakingToken.address,
                this.farming.rewardToken.address,
                this.farming.mockedBlock.add(10),
              );

              await this.farming.farmingRangeAsDeployer.addRewardInfo(
                0,
                this.farming.mockedBlock.add(13),
                INITIAL_BONUS_REWARD_PER_BLOCK,
              );

              await this.farming.farmingRangeAsDeployer.addRewardInfo(
                0,
                this.farming.mockedBlock.add(21),
                INITIAL_BONUS_REWARD_PER_BLOCK.add(parseEther("100")), // 200 reward per block
              );
              // mint staking token to alice
              await this.farming.stakingTokenAsDeployer.mint(this.signers.user.address, parseEther("100"));
              // mint staking token to bob
              await this.farming.stakingTokenAsDeployer.mint(this.signers.feeTo.address, parseEther("100"));
              // alice & bob approve farming range
              await this.farming.stakingTokenAsAlice.approve(this.farming.farmingRange.address, parseEther("100"));
              await this.farming.stakingTokenAsBob.approve(this.farming.farmingRange.address, parseEther("100"));
              // alice deposit @block number #(mockedBlock+8)
              await this.farming.farmingRangeAsAlice.deposit(constants.Zero, parseEther("100"));
              await advanceBlockTo(this.farming.mockedBlock.add(11).toNumber());
              // bob deposit @block number #(mockedBlock+12)
              await this.farming.farmingRangeAsBob.deposit(constants.Zero, parseEther("100"));
              const currentBlockNum = await latestBlockNumber();
              // alice should expect to see her pending reward according to calculated reward per share and her deposit
              const expectedAccRewardPerShare = constants.Two.mul(parseUnits("1", 20)); // reward per share 1 (phase1)
              expect((await this.farming.farmingRangeAsAlice.campaignInfo(0)).lastRewardBlock).to.eq(currentBlockNum);
              expect((await this.farming.farmingRangeAsAlice.campaignInfo(0)).accRewardPerShare).to.eq(
                expectedAccRewardPerShare,
              );
              await advanceBlockTo(this.farming.mockedBlock.add(21).toNumber());
              // 2 (from last acc reward) +((1*100)/200 = 0.5) ((8*200)/200 = 1800/200 = 8)
              // thus, alice will get 1050 total rewards
              expect(
                await this.farming.farmingRangeAsAlice.pendingReward(constants.Zero, this.signers.user.address),
              ).to.eq(parseEther("1050"));
              // ((1*100)/200 = 0.5) ((8*200)/200 = 1800/200 = 8) = 8.5 reward per share
              // thus, bob will get 950 total rewards
              expect(
                await this.farming.farmingRangeAsAlice.pendingReward(constants.Zero, this.signers.feeTo.address),
              ).to.eq(parseEther("850"));
            });
          });
          context("When bob finish deposit within the second phase", async function () {
            it("should accrue the correct reward corresponding to different phases", async function () {
              const mintedRewardPhase1 = INITIAL_BONUS_REWARD_PER_BLOCK.mul(
                this.farming.mockedBlock.add(12).sub(this.farming.mockedBlock.add(10)),
              );
              const mintedRewardPhase2 = INITIAL_BONUS_REWARD_PER_BLOCK.add(parseEther("100")).mul(
                this.farming.mockedBlock.add(21).sub(this.farming.mockedBlock.add(12)),
              );

              const mintedReward = mintedRewardPhase1.add(mintedRewardPhase2);
              // mint reward token to Deployer (when add rewardInfo)
              await this.farming.rewardTokenAsDeployer.mint(this.signers.admin.address, mintedReward); // scenario: alice deposit #n amount staking token to the pool
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
                this.farming.mockedBlock.add(21),
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
              // reward per share 1 (phase1) and ((200(reward per block) * 2(multiplier))/(200(totalsupply)) =  4/1 = 4 (phase2))
              // thus 4 + 2 = 6 accu reward per share
              const expectedAccRewardPerShare = BigNumber.from(6).mul(parseUnits("1", 20));
              expect((await this.farming.farmingRangeAsAlice.campaignInfo(0)).lastRewardBlock).to.eq(currentBlockNum);
              expect((await this.farming.farmingRangeAsAlice.campaignInfo(0)).accRewardPerShare).to.eq(
                expectedAccRewardPerShare,
              );
              await advanceBlockTo(this.farming.mockedBlock.add(21).toNumber());
              // 5 (from last acc reward) + ((8*200)/200 = 1600/200 = 8) = 13 rewards per share
              expect(
                await this.farming.farmingRangeAsAlice.pendingReward(constants.Zero, this.signers.user.address),
              ).to.eq(parseEther("1300"));
              // (7*200)/200 = 1400/200 = 7 rewards per share
              expect(
                await this.farming.farmingRangeAsAlice.pendingReward(constants.Zero, this.signers.feeTo.address),
              ).to.eq(parseEther("700"));
            });
          });
        });
      });
      context("When there are multiple campaigns", async function () {
        it("should correctly separate rewards and total staked", async function () {
          const mintedRewardCampaign1 = INITIAL_BONUS_REWARD_PER_BLOCK.mul(
            this.farming.mockedBlock.add(13).sub(this.farming.mockedBlock.add(10)),
          );
          const mintedRewardCampaign2 = INITIAL_BONUS_REWARD_PER_BLOCK.add(parseEther("100")).mul(
            this.farming.mockedBlock.add(17).sub(this.farming.mockedBlock.add(14)),
          );

          // mint reward token to Deployer (when add rewardInfo)
          const mintedReward = mintedRewardCampaign1.add(mintedRewardCampaign2);
          // mint reward token to Deployer (when add rewardInfo)
          await this.farming.rewardTokenAsDeployer.mint(this.signers.admin.address, mintedReward); // scenario: alice deposit #n amount staking token to the pool
          // when the time past, block number increase, alice expects to have her reward amount by calling `pendingReward()`
          // this scenario occurred between block #(mockedBlock+10)-..#(mockedBlock+17) for campaign 0 and 1
          await this.farming.farmingRangeAsDeployer.addCampaignInfo(
            this.farming.stakingToken.address,
            this.farming.rewardToken.address,
            this.farming.mockedBlock.add(10),
          );

          await this.farming.farmingRangeAsDeployer.addCampaignInfo(
            this.farming.stakingToken.address,
            this.farming.rewardToken.address,
            this.farming.mockedBlock.add(14),
          );

          // set reward for campaign 0
          await this.farming.farmingRangeAsDeployer.addRewardInfo(
            0,
            this.farming.mockedBlock.add(13),
            INITIAL_BONUS_REWARD_PER_BLOCK,
          );

          // set reward for campaign 1
          await this.farming.farmingRangeAsDeployer.addRewardInfo(
            1,
            this.farming.mockedBlock.add(17),
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
          // alice deposit @block number #(mockedBlock+9)
          await this.farming.farmingRangeAsAlice.deposit(constants.Zero, parseEther("100"));
          // bob deposit @block number #(mockedBlock+10)
          await this.farming.farmingRangeAsBob.deposit(constants.Zero, parseEther("200"));
          let currentBlockNum = await latestBlockNumber();
          await advanceBlockTo(this.farming.mockedBlock.add(13).toNumber());
          // alice should expect to see her pending reward according to calculated reward per share and her deposit
          let expectedAccRewardPerShare = parseUnits("1", 20); // reward per share 1
          expect((await this.farming.farmingRangeAsAlice.campaignInfo(0)).lastRewardBlock).to.eq(currentBlockNum);
          expect((await this.farming.farmingRangeAsAlice.campaignInfo(0)).accRewardPerShare).to.eq(
            expectedAccRewardPerShare,
          );
          expect((await this.farming.farmingRangeAsAlice.campaignInfo(0)).totalStaked).to.eq(parseEther("300"));
          expect(await this.farming.farmingRangeAsAlice.pendingReward(constants.Zero, this.signers.user.address)).to.eq(
            parseEther("133.333333333333333333"),
          );
          expect(
            await this.farming.farmingRangeAsAlice.pendingReward(constants.Zero, this.signers.feeTo.address),
          ).to.eq(parseEther("66.666666666666666666"));
          // ### campaign 1 ##
          await advanceBlockTo(this.farming.mockedBlock.add(14).toNumber());
          // alice deposit @block number #(mockedBlock+15)
          await this.farming.farmingRangeAsAlice.deposit(constants.One, parseEther("400"));
          // bob deposit @block number #(mockedBlock+16)
          await this.farming.farmingRangeAsBob.deposit(constants.One, parseEther("600"));
          currentBlockNum = await latestBlockNumber();
          await advanceBlockTo(this.farming.mockedBlock.add(17).toNumber());
          // alice should expect to see her pending reward according to calculated reward per share and her deposit
          expectedAccRewardPerShare = constants.One.mul(parseUnits("1", 20)).div(2); // reward per share 0.5, from 1(200)/400 = 0.5
          expect((await this.farming.farmingRangeAsAlice.campaignInfo(1)).lastRewardBlock).to.eq(currentBlockNum);
          expect((await this.farming.farmingRangeAsAlice.campaignInfo(1)).accRewardPerShare).to.eq(
            expectedAccRewardPerShare,
          );
          expect((await this.farming.farmingRangeAsAlice.campaignInfo(1)).totalStaked).to.eq(parseEther("1000"));
          // reward for alice will be calculated by 1(200)/400 = 0.5 (when alice deposit) +  1(200)/1000 = 0.2 (when bob deposit) = 0.7 reward per share * 400 = 280
          expect(await this.farming.farmingRangeAsAlice.pendingReward(constants.One, this.signers.user.address)).to.eq(
            parseEther("280"),
          );
          // reward for alice will be calculated by 2(200)/400 = 1 (when alice deposit) +  1(200)/1000 = 0.2 (when bob deposit) = 1.2 reward per share * 600 = 720
          // 720 - rewardDebt of bob = 720 - 600 = 120
          expect(await this.farming.farmingRangeAsAlice.pendingReward(constants.One, this.signers.feeTo.address)).to.eq(
            parseEther("120"),
          );
        });
      });
    });
  });
}
