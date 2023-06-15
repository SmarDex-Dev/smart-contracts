import { BigNumber, constants } from "ethers";
import { expect } from "chai";
import { assertAlmostEqual } from "../../helpers/assert";
import { advanceBlockTo, latestBlockNumber } from "../../helpers/time";
import { INITIAL_BONUS_REWARD_PER_BLOCK } from "../testData";
import { parseEther, parseUnits } from "ethers/lib/utils";

// chai.use(solidity);

export function shouldBehaveLikeFarmingRange() {
  describe("#setRewardManager", async function () {
    context("When the caller is not the owner", async function () {
      it("should be reverted", async function () {
        const aliceAddr = await this.signers.user.getAddress();
        await expect(this.farming.farmingRangeAsAlice.setRewardManager(aliceAddr)).to.reverted;
      });
    });
    context("When the caller is the owner", async function () {
      it("should successfully change a reward holder", async function () {
        const aliceAddr = await this.signers.user.getAddress();
        await this.farming.farmingRangeAsDeployer.setRewardManager(aliceAddr);
        const holder = await this.farming.farmingRangeAsDeployer.rewardManager();
        expect(holder).to.eq(aliceAddr);
      });
    });
  });

  describe("#currentEndBlock()", async function () {
    context("reward info is not existed yet", async function () {
      it("should return 0 as a current end block", async function () {
        // add the first reward info
        const currentEndBlock = await this.farming.farmingRangeAsDeployer.currentEndBlock(0);
        expect(currentEndBlock).to.eq(constants.Zero);
      });
    });
    context("reward info is existed", async function () {
      it("should return a current reward info endblock as a current end block", async function () {
        const mintedRewardPhase1 = INITIAL_BONUS_REWARD_PER_BLOCK.mul(
          this.farming.mockedBlock.add(9).sub(this.farming.mockedBlock.add(8)),
        );
        const mintedRewardPhase2 = INITIAL_BONUS_REWARD_PER_BLOCK.mul(
          this.farming.mockedBlock.add(10).sub(this.farming.mockedBlock.add(9)),
        );
        const mintedReward = mintedRewardPhase1.add(mintedRewardPhase2);
        // mint reward token to Deployer (when add rewardInfo)
        await this.farming.rewardTokenAsDeployer.mint(await this.signers.admin.getAddress(), mintedReward);
        await this.farming.farmingRangeAsDeployer.addCampaignInfo(
          this.farming.stakingToken.address,
          this.farming.rewardToken.address,
          this.farming.mockedBlock.add(8).toString(),
        );
        await this.farming.farmingRangeAsDeployer.addRewardInfo(
          0,
          this.farming.mockedBlock.add(9).toString(),
          INITIAL_BONUS_REWARD_PER_BLOCK,
        );
        let currentEndBlock = await this.farming.farmingRangeAsDeployer.currentEndBlock(0);
        expect(currentEndBlock).to.eq(this.farming.mockedBlock.add(9));

        await this.farming.farmingRangeAsDeployer.addRewardInfo(
          0,
          this.farming.mockedBlock.add(10).toString(),
          INITIAL_BONUS_REWARD_PER_BLOCK,
        );
        currentEndBlock = await this.farming.farmingRangeAsDeployer.currentEndBlock(0);
        expect(currentEndBlock).to.eq(this.farming.mockedBlock.add(9));

        await advanceBlockTo(this.farming.mockedBlock.add(20).toNumber());
        currentEndBlock = await this.farming.farmingRangeAsDeployer.currentEndBlock(0);
        expect(currentEndBlock).to.eq(this.farming.mockedBlock.add(10));
      });
    });
  });
  describe("#currentRewardPerBlock()", async function () {
    context("reward info is not existed yet", async function () {
      it("should return 0 as a current reward per block", async function () {
        const currentEndBlock = await this.farming.farmingRangeAsDeployer.currentRewardPerBlock(0);
        expect(currentEndBlock).to.eq(constants.Zero);
      });
    });
    context("reward info is existed", async function () {
      it("should return a current reward info endblock as a current reward per block", async function () {
        const mintedRewardPhase1 = INITIAL_BONUS_REWARD_PER_BLOCK.mul(
          this.farming.mockedBlock.add(9).sub(this.farming.mockedBlock.add(8)),
        );
        const mintedRewardPhase2 = INITIAL_BONUS_REWARD_PER_BLOCK.add(parseEther("500")).mul(
          this.farming.mockedBlock.add(10).sub(this.farming.mockedBlock.add(9)),
        );
        const mintedReward = mintedRewardPhase1.add(mintedRewardPhase2);
        await this.farming.rewardTokenAsDeployer.mint(await this.signers.admin.getAddress(), mintedReward);
        await this.farming.farmingRangeAsDeployer.addCampaignInfo(
          this.farming.stakingToken.address,
          this.farming.rewardToken.address,
          this.farming.mockedBlock.add(8).toString(),
        );
        await this.farming.farmingRangeAsDeployer.addRewardInfo(
          0,
          this.farming.mockedBlock.add(9).toString(),
          INITIAL_BONUS_REWARD_PER_BLOCK,
        );
        let currentRewardPerBlock = await this.farming.farmingRangeAsDeployer.currentRewardPerBlock(0);
        expect(currentRewardPerBlock).to.eq(INITIAL_BONUS_REWARD_PER_BLOCK);

        await advanceBlockTo(this.farming.mockedBlock.add(8).toNumber());
        await this.farming.farmingRangeAsDeployer.addRewardInfo(
          0,
          this.farming.mockedBlock.add(10).toString(),
          INITIAL_BONUS_REWARD_PER_BLOCK.add(parseEther("500")),
        );
        await advanceBlockTo(this.farming.mockedBlock.add(10).toNumber());
        currentRewardPerBlock = await this.farming.farmingRangeAsDeployer.currentRewardPerBlock(0);
        expect(currentRewardPerBlock).to.eq(INITIAL_BONUS_REWARD_PER_BLOCK.add(parseEther("500")));
      });
    });
    context("When reward period ended", async function () {
      it("should return 0", async function () {
        const mintedRewardPhase1 = INITIAL_BONUS_REWARD_PER_BLOCK.mul(
          this.farming.mockedBlock.add(9).sub(this.farming.mockedBlock.add(8)),
        );
        const mintedRewardPhase2 = INITIAL_BONUS_REWARD_PER_BLOCK.add(parseEther("500")).mul(
          this.farming.mockedBlock.add(10).sub(this.farming.mockedBlock.add(9)),
        );
        const mintedReward = mintedRewardPhase1.add(mintedRewardPhase2);
        await this.farming.rewardTokenAsDeployer.mint(await this.signers.admin.getAddress(), mintedReward);
        await this.farming.farmingRangeAsDeployer.addCampaignInfo(
          this.farming.stakingToken.address,
          this.farming.rewardToken.address,
          this.farming.mockedBlock.add(8).toString(),
        );
        await this.farming.farmingRangeAsDeployer.addRewardInfo(
          0,
          this.farming.mockedBlock.add(9).toString(),
          INITIAL_BONUS_REWARD_PER_BLOCK,
        );
        let currentRewardPerBlock = await this.farming.farmingRangeAsDeployer.currentRewardPerBlock(0);
        expect(currentRewardPerBlock).to.eq(INITIAL_BONUS_REWARD_PER_BLOCK);

        await advanceBlockTo(this.farming.mockedBlock.add(8).toNumber());
        await this.farming.farmingRangeAsDeployer.addRewardInfo(
          0,
          this.farming.mockedBlock.add(10).toString(),
          INITIAL_BONUS_REWARD_PER_BLOCK.add(parseEther("500")),
        );
        await advanceBlockTo(this.farming.mockedBlock.add(100).toNumber());
        currentRewardPerBlock = await this.farming.farmingRangeAsDeployer.currentRewardPerBlock(0);
        expect(currentRewardPerBlock).to.eq(0);
      });
    });
  });

  describe("#addCampaignInfo", async function () {
    it("should return a correct campaign info length", async function () {
      let length = await this.farming.farmingRangeAsDeployer.campaignInfoLen();
      expect(length).to.eq(0);
      await this.farming.farmingRangeAsDeployer.addCampaignInfo(
        this.farming.stakingToken.address,
        this.farming.rewardToken.address,
        this.farming.mockedBlock.add(9).toString(),
      );
      length = await this.farming.farmingRangeAsDeployer.campaignInfoLen();
      expect(length).to.eq(1);
    });
  });

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
          await this.farming.rewardTokenAsDeployer.mint(await this.signers.admin.getAddress(), mintedReward);
          await this.farming.farmingRangeAsDeployer.addCampaignInfo(
            this.farming.stakingToken.address,
            this.farming.rewardToken.address,
            this.farming.mockedBlock.add(8).toString(),
          );
          // set reward info limit to 1
          await this.farming.farmingRangeAsDeployer.setRewardInfoLimit(2);
          let length = await this.farming.farmingRangeAsDeployer.rewardInfoLen(0);
          expect(length).to.eq(0);
          // add the first reward info
          await this.farming.farmingRangeAsDeployer.addRewardInfo(
            0,
            this.farming.mockedBlock.add(11).toString(),
            INITIAL_BONUS_REWARD_PER_BLOCK,
          );
          length = await this.farming.farmingRangeAsDeployer.rewardInfoLen(0);
          expect(length).to.eq(1);

          await this.farming.farmingRangeAsDeployer.addRewardInfo(
            0,
            this.farming.mockedBlock.add(20).toString(),
            INITIAL_BONUS_REWARD_PER_BLOCK.add(1),
          );
          const rewardInfo = await this.farming.farmingRangeAsDeployer.campaignRewardInfo(0, 1);
          length = await this.farming.farmingRangeAsDeployer.rewardInfoLen(0);
          expect(length).to.eq(2);
          expect(rewardInfo.rewardPerBlock).to.eq(INITIAL_BONUS_REWARD_PER_BLOCK.add(1));
          expect(rewardInfo.endBlock).to.eq(this.farming.mockedBlock.add(20).toString());
        });
      });
    });
    context("When some parameters are invalid", async function () {
      context("When the caller isn't the owner", async function () {
        it("should reverted since there is a modifier only owner validating the ownership", async function () {
          const mintedReward = INITIAL_BONUS_REWARD_PER_BLOCK.mul(
            this.farming.mockedBlock.add(11).sub(this.farming.mockedBlock.add(8)),
          );
          await this.farming.rewardTokenAsDeployer.mint(await this.signers.admin.getAddress(), mintedReward);
          await this.farming.farmingRangeAsDeployer.addCampaignInfo(
            this.farming.stakingToken.address,
            this.farming.rewardToken.address,
            this.farming.mockedBlock.add(8).toString(),
          );
          // set reward info limit to 1
          await expect(this.farming.farmingRangeAsAlice.setRewardInfoLimit(1)).to.be.reverted;
          await expect(
            this.farming.farmingRangeAsAlice.addRewardInfo(
              0,
              this.farming.mockedBlock.add(11).toString(),
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
            this.farming.mockedBlock.add(8).toString(),
          );
          // set reward info limit to 1
          await this.farming.farmingRangeAsDeployer.setRewardInfoLimit(1);
          // add the first reward info
          await this.farming.farmingRangeAsDeployer.addRewardInfo(
            0,
            this.farming.mockedBlock.add(11).toString(),
            INITIAL_BONUS_REWARD_PER_BLOCK,
          );
          await expect(
            this.farming.farmingRangeAsDeployer.addRewardInfo(
              0,
              this.farming.mockedBlock.add(11).toString(),
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
          await this.farming.rewardTokenAsDeployer.mint(await this.signers.admin.getAddress(), mintedReward);
          await this.farming.farmingRangeAsDeployer.addCampaignInfo(
            this.farming.stakingToken.address,
            this.farming.rewardToken.address,
            this.farming.mockedBlock.add(8).toString(),
          );
          // add the first reward info
          await expect(
            this.farming.farmingRangeAsDeployer.addRewardInfo(
              0,
              this.farming.mockedBlock.sub(1).toString(),
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
          await this.farming.rewardTokenAsDeployer.mint(await this.signers.admin.getAddress(), mintedReward);
          await this.farming.farmingRangeAsDeployer.addCampaignInfo(
            this.farming.stakingToken.address,
            this.farming.rewardToken.address,
            this.farming.mockedBlock.add(8).toString(),
          );
          // add the first reward info
          await this.farming.farmingRangeAsDeployer.addRewardInfo(
            0,
            this.farming.mockedBlock.add(11).toString(),
            INITIAL_BONUS_REWARD_PER_BLOCK,
          );
          await expect(
            this.farming.farmingRangeAsDeployer.addRewardInfo(
              0,
              this.farming.mockedBlock.add(1).toString(),
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
          await this.farming.rewardTokenAsDeployer.mint(await this.signers.admin.getAddress(), mintedReward);
          await this.farming.farmingRangeAsDeployer.addCampaignInfo(
            this.farming.stakingToken.address,
            this.farming.rewardToken.address,
            this.farming.mockedBlock.add(8).toString(),
          );
          // add the first reward info
          // with block number + 10
          await this.farming.farmingRangeAsDeployer.addRewardInfo(
            0,
            this.farming.mockedBlock.add(10).toString(),
            INITIAL_BONUS_REWARD_PER_BLOCK,
          );
          await advanceBlockTo(this.farming.mockedBlock.add(11).toNumber());
          //this called method is invoked on blockNumber + 12
          await expect(
            this.farming.farmingRangeAsDeployer.addRewardInfo(
              0,
              this.farming.mockedBlock.add(12).toString(),
              INITIAL_BONUS_REWARD_PER_BLOCK,
            ),
          ).to.be.revertedWith("FarmingRange::addRewardInfo::reward period ended");
        });
      });
    });
  });
  describe("#deposit()", async function () {
    context("With invalid parameters", async function () {
      context("When there is NO predefined campaign", async function () {
        it("should revert the tx since an array of predefined campaigns is out of bound", async function () {
          // mint staking token to alice
          await this.farming.stakingTokenAsDeployer.mint(await this.signers.user.getAddress(), parseEther("100"));
          // mint reward token to Deployer (when add rewardInfo)
          await this.farming.rewardTokenAsDeployer.mint(await this.signers.admin.getAddress(), parseEther("100"));
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
          await this.farming.rewardTokenAsDeployer.mint(await this.signers.admin.getAddress(), mintedReward);

          await this.farming.farmingRangeAsDeployer.addCampaignInfo(
            this.farming.stakingToken.address,
            this.farming.rewardToken.address,
            this.farming.mockedBlock.add(9).toString(),
          );

          await this.farming.farmingRangeAsDeployer.addRewardInfo(
            0,
            this.farming.mockedBlock.add(11).toString(),
            INITIAL_BONUS_REWARD_PER_BLOCK,
          );
          // mint staking token to alice
          await this.farming.stakingTokenAsDeployer.mint(await this.signers.user.getAddress(), parseEther("100"));

          // alice deposit @block number #(mockedBlock+10)
          await expect(this.farming.farmingRangeAsAlice.deposit(constants.Zero, parseEther("100"))).to.be.reverted;
        });
      });
    });
    context("With valid parameters", async function () {
      context("When there is only single campaign", async function () {
        context("When there is only single reward info", async function () {
          context("When there is only one beneficial who get the reward (alice)", async function () {
            context("When alice's deposit block is is in the middle of start and end block", async function () {
              context("When alice deposit again with different block time", async function () {
                it("should return reward from previous deposit to alice", async function () {
                  const mintedReward = INITIAL_BONUS_REWARD_PER_BLOCK.mul(
                    this.farming.mockedBlock.add(16).sub(this.farming.mockedBlock.add(6)),
                  );
                  // mint reward token to Deployer (when add rewardInfo)
                  await this.farming.rewardTokenAsDeployer.mint(await this.signers.admin.getAddress(), mintedReward);
                  // scenario: alice deposit #n amount staking token to the pool
                  // when the time past, block number increase, alice expects to have her reward amount by calling `pendingReward()`
                  // this scenario occurred between block #(mockedBlock+6)-..#(mockedBlock+16)
                  await this.farming.farmingRangeAsDeployer.addCampaignInfo(
                    this.farming.stakingToken.address,
                    this.farming.rewardToken.address,
                    this.farming.mockedBlock.add(6).toString(),
                  );

                  await this.farming.farmingRangeAsDeployer.addRewardInfo(
                    0,
                    this.farming.mockedBlock.add(16).toString(),
                    INITIAL_BONUS_REWARD_PER_BLOCK,
                  );
                  // mint staking token to alice
                  await this.farming.stakingTokenAsDeployer.mint(
                    await this.signers.user.getAddress(),
                    parseEther("300"),
                  );
                  // alice & bob approve farming range
                  await this.farming.stakingTokenAsAlice.approve(this.farming.farmingRange.address, parseEther("300"));

                  // alice deposit @block number #(mockedBlock+7)
                  await this.farming.farmingRangeAsAlice.deposit(constants.Zero, parseEther("100"));
                  // bob deposit @block number #(mockedBlock+8)
                  await this.farming.farmingRangeAsAlice.deposit(constants.Zero, parseEther("200"));
                  const currentBlockNum = await latestBlockNumber();
                  // advance a block number to #(mockedBlock+18) 10 block diff from bob's deposit
                  await advanceBlockTo(this.farming.mockedBlock.add(16).toNumber());
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
                  // not the total deposit of alice is 300, totalstaked should be 300 as well
                  // reward debt will be 300
                  // alice expect to get a pending reward from block 8 to 16 = 8 sec
                  // total reward from block 8 to 16 is ((8 * 100)/300) = 2.6666667
                  // thus the overall reward per share will be 3.666666666666
                  // pending reward of alice will be 300(3.666666666666) - 300 = 1100 - 300 ~ 800
                  assertAlmostEqual(
                    (
                      await this.farming.farmingRangeAsAlice.pendingReward(
                        constants.Zero,
                        await this.signers.user.getAddress(),
                      )
                    ).toString(),
                    parseEther("800").toString(),
                  );
                  expect(await this.farming.rewardToken.balanceOf(await this.signers.user.getAddress())).to.eq(
                    parseEther("200"),
                  );
                });
              });
              context("when calling update campaign within the range of reward blocks", async function () {
                context("when the current block time (alice time) is before the starting time", async function () {
                  it("#pendingReward() will recalculate the accuReward and return the correct reward corresponding to the starting blocktime", async function () {
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
                    await this.farming.stakingTokenAsDeployer.mint(
                      await this.signers.user.getAddress(),
                      parseEther("100"),
                    );
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
                      await this.farming.farmingRangeAsAlice.pendingReward(
                        constants.Zero,
                        await this.signers.user.getAddress(),
                      ),
                    ).to.eq(parseEther("1000"));
                  });
                });
                context("when the current block time is way too far than the latest reward", async function () {
                  it("#pendingReward() will recalculate the accuReward and return the correct reward corresponding to the current blocktime", async function () {
                    const mintedReward = INITIAL_BONUS_REWARD_PER_BLOCK.mul(
                      this.farming.mockedBlock.add(18).sub(this.farming.mockedBlock.add(6)),
                    );
                    // mint reward token to Deployer (when add rewardInfo)
                    await this.farming.rewardTokenAsDeployer.mint(await this.signers.admin.getAddress(), mintedReward);
                    // scenario: alice deposit #n amount staking token to the pool
                    // when the time past, block number increase, alice expects to have her reward amount by calling `pendingReward()`
                    // this scenario occurred between block #(mockedBlock+6)-..#(mockedBlock+18)
                    await this.farming.farmingRangeAsDeployer.addCampaignInfo(
                      this.farming.stakingToken.address,
                      this.farming.rewardToken.address,
                      this.farming.mockedBlock.add(6).toString(),
                    );

                    await this.farming.farmingRangeAsDeployer.addRewardInfo(
                      0,
                      this.farming.mockedBlock.add(18).toString(),
                      INITIAL_BONUS_REWARD_PER_BLOCK,
                    );
                    // mint staking token to alice
                    await this.farming.stakingTokenAsDeployer.mint(
                      await this.signers.user.getAddress(),
                      parseEther("100"),
                    );
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
                    // advance a block number to #(mockedBlock+18) 10 block diff from update campaign
                    await advanceBlockTo(this.farming.mockedBlock.add(18).toNumber());
                    // alice should expect to see her pending reward according to calculated reward per share and her deposit
                    const expectedAccRewardPerShare = constants.Two.mul(parseUnits("1", 20)); // reward per share = 2
                    expect((await this.farming.farmingRangeAsAlice.campaignInfo(0)).lastRewardBlock).to.eq(
                      currentBlockNum,
                    );
                    expect((await this.farming.farmingRangeAsAlice.campaignInfo(0)).accRewardPerShare).to.eq(
                      expectedAccRewardPerShare,
                    );
                    // alice should get a reward based on accRewardPerShare = 2 + (10(100)/100) =  2 + (1000/100) = 2 + 10 = 12 reward per share
                    // thus, alice who deposit 100 will receive 12 * 100 = 1200
                    expect(
                      await this.farming.farmingRangeAsAlice.pendingReward(
                        constants.Zero,
                        await this.signers.user.getAddress(),
                      ),
                    ).to.eq(parseEther("1200"));
                  });
                });
                it("should update a correct reward per share and pending rewards", async function () {
                  const mintedReward = INITIAL_BONUS_REWARD_PER_BLOCK.mul(
                    this.farming.mockedBlock.add(8).sub(this.farming.mockedBlock.add(6)),
                  );
                  // mint reward token to Deployer (when add rewardInfo)
                  await this.farming.rewardTokenAsDeployer.mint(await this.signers.admin.getAddress(), mintedReward);
                  // scenario: alice deposit #n amount staking token to the pool
                  // when the time past, block number increase, alice expects to have her reward amount by calling `pendingReward()`
                  // this scenario occurred between block #(mockedBlock+6)-..#(mockedBlock+8)
                  await this.farming.farmingRangeAsDeployer.addCampaignInfo(
                    this.farming.stakingToken.address,
                    this.farming.rewardToken.address,
                    this.farming.mockedBlock.add(6).toString(),
                  );

                  await this.farming.farmingRangeAsDeployer.addRewardInfo(
                    0,
                    this.farming.mockedBlock.add(8).toString(),
                    INITIAL_BONUS_REWARD_PER_BLOCK,
                  );
                  // mint staking token to alice
                  await this.farming.stakingTokenAsDeployer.mint(
                    await this.signers.user.getAddress(),
                    parseEther("100"),
                  );
                  // alice & bob approve farming range
                  await this.farming.stakingTokenAsAlice.approve(this.farming.farmingRange.address, parseEther("100"));

                  // alice deposit @block number #(mockedBlock+7)
                  await this.farming.farmingRangeAsAlice.deposit(constants.Zero, parseEther("100"));
                  // update campaign @block number #(mockedBlock+8)
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
                  // 1 reward per share
                  // thus, alice who deposit 100, shall get a total of 100 rewards
                  expect(
                    await this.farming.farmingRangeAsAlice.pendingReward(
                      constants.Zero,
                      await this.signers.user.getAddress(),
                    ),
                  ).to.eq(parseEther("200"));
                });
              });
              context("when calling update campaign out of the range of reward blocks", async function () {
                it("should update a correct reward per share, pending rewards", async function () {
                  const mintedReward = INITIAL_BONUS_REWARD_PER_BLOCK.mul(
                    this.farming.mockedBlock.add(8).sub(this.farming.mockedBlock.add(6)),
                  );
                  // mint reward token to Deployer (when add rewardInfo)
                  await this.farming.rewardTokenAsDeployer.mint(await this.signers.admin.getAddress(), mintedReward);
                  // scenario: alice deposit #n amount staking token to the pool
                  // when the time past, block number increase, alice expects to have her reward amount by calling `pendingReward()`
                  // this scenario occurred between block #(mockedBlock+6)-..#(mockedBlock+8)
                  await this.farming.farmingRangeAsDeployer.addCampaignInfo(
                    this.farming.stakingToken.address,
                    this.farming.rewardToken.address,
                    this.farming.mockedBlock.add(6).toString(),
                  );

                  await this.farming.farmingRangeAsDeployer.addRewardInfo(
                    0,
                    this.farming.mockedBlock.add(8).toString(),
                    INITIAL_BONUS_REWARD_PER_BLOCK,
                  );
                  // mint staking token to alice
                  await this.farming.stakingTokenAsDeployer.mint(
                    await this.signers.user.getAddress(),
                    parseEther("100"),
                  );
                  // alice approve farming range
                  await this.farming.stakingTokenAsAlice.approve(this.farming.farmingRange.address, parseEther("100"));

                  // alice deposit @block number #(mockedBlock+7)
                  await this.farming.farmingRangeAsAlice.deposit(constants.Zero, parseEther("100"));
                  const toBeAdvancedBlockNum = await latestBlockNumber();
                  // advanced block to 100
                  await advanceBlockTo(toBeAdvancedBlockNum.add(100).toNumber());
                  // alice call update campaign @block number #(mockedBlock+8+100)
                  await this.farming.farmingRangeAsAlice.updateCampaign(constants.Zero);
                  // alice should expect to see her pending reward according to calculated reward per share and her deposit
                  const expectedAccRewardPerShare = constants.Two.mul(parseUnits("1", 20)); // reward per share 2, since range between start and end is 2, so right now reward is 2
                  // last reward block should be the end block, since when alice deposit, total supply is 0
                  expect((await this.farming.farmingRangeAsAlice.campaignInfo(0)).lastRewardBlock).to.eq(
                    this.farming.mockedBlock.add(8),
                  );
                  expect((await this.farming.farmingRangeAsAlice.campaignInfo(0)).accRewardPerShare).to.eq(
                    expectedAccRewardPerShare,
                  );
                  expect(
                    await this.farming.farmingRangeAsAlice.pendingReward(
                      constants.Zero,
                      await this.signers.user.getAddress(),
                    ),
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
                await this.farming.rewardTokenAsDeployer.mint(await this.signers.admin.getAddress(), mintedReward);
                // scenario: alice deposit #n amount staking token to the pool
                // when the time past, block number increase, alice expects to have her reward amount by calling `pendingReward()`
                // this scenario occurred between block #(mockedBlock+6)-..#(mockedBlock+8)
                await this.farming.farmingRangeAsDeployer.addCampaignInfo(
                  this.farming.stakingToken.address,
                  this.farming.rewardToken.address,
                  this.farming.mockedBlock.add(6).toString(),
                );

                await this.farming.farmingRangeAsDeployer.addRewardInfo(
                  0,
                  this.farming.mockedBlock.add(8).toString(),
                  INITIAL_BONUS_REWARD_PER_BLOCK,
                );
                // mint staking token to alice
                await this.farming.stakingTokenAsDeployer.mint(await this.signers.user.getAddress(), parseEther("100"));
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
                  this.farming.mockedBlock.add(7).add(100).toString(),
                ); // will end since alice's deposit block number
                expect((await this.farming.farmingRangeAsAlice.campaignInfo(0)).accRewardPerShare).to.eq(
                  expectedAccRewardPerShare,
                );
                expect(
                  await this.farming.farmingRangeAsAlice.pendingReward(
                    constants.Zero,
                    await this.signers.user.getAddress(),
                  ),
                ).to.eq(constants.Zero);
              });
            });
          });
          context("When alice and bob able to get the reward", async function () {
            context("When alice and bob deposit within the range of reward blocks", async function () {
              context("when calling update campaign within the range of reward blocks", async function () {
                it("should update a correct reward per share and pending rewards", async function () {
                  const mintedReward = INITIAL_BONUS_REWARD_PER_BLOCK.mul(
                    this.farming.mockedBlock.add(11).sub(this.farming.mockedBlock.add(8)),
                  );
                  // mint reward token to Deployer (when add rewardInfo)
                  await this.farming.rewardTokenAsDeployer.mint(await this.signers.admin.getAddress(), mintedReward); // scenario: alice deposit #n amount staking token to the pool
                  // when the time past, block number increase, alice expects to have her reward amount by calling `pendingReward()`
                  // this scenario occurred between block #(mockedBlock+8)-..#(mockedBlock+11)
                  await this.farming.farmingRangeAsDeployer.addCampaignInfo(
                    this.farming.stakingToken.address,
                    this.farming.rewardToken.address,
                    this.farming.mockedBlock.add(8).toString(),
                  );

                  await this.farming.farmingRangeAsDeployer.addRewardInfo(
                    0,
                    this.farming.mockedBlock.add(11).toString(),
                    INITIAL_BONUS_REWARD_PER_BLOCK,
                  );
                  // mint staking token to alice
                  await this.farming.stakingTokenAsDeployer.mint(
                    await this.signers.user.getAddress(),
                    parseEther("100"),
                  );
                  // mint staking token to bob
                  await this.farming.stakingTokenAsDeployer.mint(
                    await this.signers.feeTo.getAddress(),
                    parseEther("100"),
                  );
                  // alice & bob approve farming range
                  await this.farming.stakingTokenAsAlice.approve(this.farming.farmingRange.address, parseEther("100"));
                  await this.farming.stakingTokenAsBob.approve(this.farming.farmingRange.address, parseEther("100"));
                  // alice deposit @block number #(mockedBlock+9)
                  await this.farming.farmingRangeAsAlice.deposit(constants.Zero, parseEther("100"));
                  // bob deposit @block number #(mockedBlock+10)
                  await this.farming.farmingRangeAsBob.deposit(constants.Zero, parseEther("100"));
                  // alice call update campaign @block number #(mockedBlock+11)
                  await this.farming.farmingRangeAsAlice.updateCampaign(constants.Zero);
                  const currentBlockNum = await latestBlockNumber();
                  // when alice deposits, she is the first one, so the latest reward will still be a starting block
                  // once bob deposits, the latest reward will be #(mockedBlock+11)
                  // acc reward per share will be (2(100)/100 from block 8 to block 10)  and (1(100)/200 from block 10 to 11) = 2.5
                  const expectedAccRewardPerShare = constants.One.mul(parseUnits("2.5", 20));
                  // B8---------------B9--------------------------------B11
                  // |- reward debt ---|---(alice deposit here)-----------|
                  // since total supply = 0 and alice is an initiator, only update the latest reward block to be B8
                  expect((await this.farming.farmingRangeAsAlice.campaignInfo(0)).lastRewardBlock).to.eq(
                    currentBlockNum,
                  );
                  expect((await this.farming.farmingRangeAsAlice.campaignInfo(0)).accRewardPerShare).to.eq(
                    expectedAccRewardPerShare,
                  );
                  expect(
                    await this.farming.farmingRangeAsAlice.pendingReward(
                      constants.Zero,
                      await this.signers.user.getAddress(),
                    ),
                  ).to.eq(parseEther("250"));
                  // B8-----------------------B10-----------------------B11
                  // |--this is a reward debt--|---(bob deposit here)-----|
                  // |------this is amount * accu reward per share--------|
                  // so total reward that bob should get is (amount * accuRewardPershare) - rewardDebt
                  // bob will get 0.5 reward per share, thus 100 * 50 = 50 total rewards
                  expect(
                    await this.farming.farmingRangeAsBob.pendingReward(
                      constants.Zero,
                      await this.signers.feeTo.getAddress(),
                    ),
                  ).to.eq(parseEther("50"));
                });
              });
            });
          });
        });
        context("When there are multiple reward info (multiple phases)", async function () {
          context("When bob finish deposit within the first phase", async function () {
            it("should accrue the correct reward corresponding to different phases", async function () {
              const mintedRewardPhase1 = INITIAL_BONUS_REWARD_PER_BLOCK.mul(
                this.farming.mockedBlock.add(12).sub(this.farming.mockedBlock.add(9)),
              );
              const mintedRewardPhase2 = INITIAL_BONUS_REWARD_PER_BLOCK.add(parseEther("100")).mul(
                this.farming.mockedBlock.add(21).sub(this.farming.mockedBlock.add(12)),
              );
              const mintedReward = mintedRewardPhase1.add(mintedRewardPhase2);
              // mint reward token to Deployer (when add rewardInfo)
              await this.farming.rewardTokenAsDeployer.mint(await this.signers.admin.getAddress(), mintedReward);
              // scenario: alice deposit #n amount staking token to the pool
              // when the time past, block number increase, alice expects to have her reward amount by calling `pendingReward()`
              // this scenario occurred between block #(mockedBlock+9)-..#(mockedBlock+11)
              await this.farming.farmingRangeAsDeployer.addCampaignInfo(
                this.farming.stakingToken.address,
                this.farming.rewardToken.address,
                this.farming.mockedBlock.add(9).toString(),
              );

              await this.farming.farmingRangeAsDeployer.addRewardInfo(
                0,
                this.farming.mockedBlock.add(12).toString(),
                INITIAL_BONUS_REWARD_PER_BLOCK,
              );

              await this.farming.farmingRangeAsDeployer.addRewardInfo(
                0,
                this.farming.mockedBlock.add(21).toString(),
                INITIAL_BONUS_REWARD_PER_BLOCK.add(parseEther("100")), // 200 reward per block
              );
              // mint staking token to alice
              await this.farming.stakingTokenAsDeployer.mint(await this.signers.user.getAddress(), parseEther("100"));
              // mint staking token to bob
              await this.farming.stakingTokenAsDeployer.mint(await this.signers.feeTo.getAddress(), parseEther("100"));
              // alice & bob approve farming range
              await this.farming.stakingTokenAsAlice.approve(this.farming.farmingRange.address, parseEther("100"));
              await this.farming.stakingTokenAsBob.approve(this.farming.farmingRange.address, parseEther("100"));
              // alice deposit @block number #(mockedBlock+10)
              await this.farming.farmingRangeAsAlice.deposit(constants.Zero, parseEther("100"));
              // bob deposit @block number #(mockedBlock+11)
              await this.farming.farmingRangeAsBob.deposit(constants.Zero, parseEther("100"));
              const currentBlockNum = await latestBlockNumber();
              // alice should expect to see her pending reward according to calculated reward per share and her deposit
              const expectedAccRewardPerShare = constants.Two.mul(parseUnits("1", 20)); // reward per share 1 (phase1)
              expect((await this.farming.farmingRangeAsAlice.campaignInfo(0)).lastRewardBlock).to.eq(currentBlockNum);
              expect((await this.farming.farmingRangeAsAlice.campaignInfo(0)).accRewardPerShare).to.eq(
                expectedAccRewardPerShare,
              );
              await advanceBlockTo(this.farming.mockedBlock.add(21).toNumber());
              // 2 (from last acc reward) +((1*100)/200 = 0.5) ((9*200)/200 = 1800/200 = 9)
              // thus, alice will get 1150 total rewards
              expect(
                await this.farming.farmingRangeAsAlice.pendingReward(
                  constants.Zero,
                  await this.signers.user.getAddress(),
                ),
              ).to.eq(parseEther("1150"));
              // ((1*100)/200 = 0.5) ((9*200)/200 = 1800/200 = 9) = 9.5 reward per share
              // thus, bob will get 950 total rewards
              expect(
                await this.farming.farmingRangeAsAlice.pendingReward(
                  constants.Zero,
                  await this.signers.feeTo.getAddress(),
                ),
              ).to.eq(parseEther("950"));
            });
          });
          context("When bob finish deposit within the second phase", async function () {
            it("should accrue the correct reward corresponding to different phases", async function () {
              const mintedRewardPhase1 = INITIAL_BONUS_REWARD_PER_BLOCK.mul(
                this.farming.mockedBlock.add(11).sub(this.farming.mockedBlock.add(9)),
              );
              const mintedRewardPhase2 = INITIAL_BONUS_REWARD_PER_BLOCK.add(parseEther("100")).mul(
                this.farming.mockedBlock.add(21).sub(this.farming.mockedBlock.add(11)),
              );
              const mintedReward = mintedRewardPhase1.add(mintedRewardPhase2);
              // mint reward token to Deployer (when add rewardInfo)
              await this.farming.rewardTokenAsDeployer.mint(await this.signers.admin.getAddress(), mintedReward); // scenario: alice deposit #n amount staking token to the pool
              // when the time past, block number increase, alice expects to have her reward amount by calling `pendingReward()`
              // this scenario occurred between block #(mockedBlock+9)-..#(mockedBlock+11)
              await this.farming.farmingRangeAsDeployer.addCampaignInfo(
                this.farming.stakingToken.address,
                this.farming.rewardToken.address,
                this.farming.mockedBlock.add(9).toString(),
              );

              await this.farming.farmingRangeAsDeployer.addRewardInfo(
                0,
                this.farming.mockedBlock.add(11).toString(),
                INITIAL_BONUS_REWARD_PER_BLOCK,
              );

              await this.farming.farmingRangeAsDeployer.addRewardInfo(
                0,
                this.farming.mockedBlock.add(21).toString(),
                INITIAL_BONUS_REWARD_PER_BLOCK.add(parseEther("100")), // 200 reward per block
              );
              // mint staking token to alice
              await this.farming.stakingTokenAsDeployer.mint(await this.signers.user.getAddress(), parseEther("100"));
              // mint staking token to bob
              await this.farming.stakingTokenAsDeployer.mint(await this.signers.feeTo.getAddress(), parseEther("100"));
              // alice & bob approve farming range
              await this.farming.stakingTokenAsAlice.approve(this.farming.farmingRange.address, parseEther("100"));
              await this.farming.stakingTokenAsBob.approve(this.farming.farmingRange.address, parseEther("100"));
              // alice deposit @block number #(mockedBlock+10)
              await this.farming.farmingRangeAsAlice.deposit(constants.Zero, parseEther("100"));
              // skip to phase 2
              await advanceBlockTo(this.farming.mockedBlock.add(12).toNumber());
              // bob deposit @block number #(mockedBlock+13)
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
                await this.farming.farmingRangeAsAlice.pendingReward(
                  constants.Zero,
                  await this.signers.user.getAddress(),
                ),
              ).to.eq(parseEther("1400"));
              // (8*200)/200 = 1600/200 = 8 rewards per share
              expect(
                await this.farming.farmingRangeAsAlice.pendingReward(
                  constants.Zero,
                  await this.signers.feeTo.getAddress(),
                ),
              ).to.eq(parseEther("800"));
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
          const mintedReward = mintedRewardCampaign1.add(mintedRewardCampaign2);
          // mint reward token to Deployer (when add rewardInfo)
          await this.farming.rewardTokenAsDeployer.mint(await this.signers.admin.getAddress(), mintedReward); // scenario: alice deposit #n amount staking token to the pool
          // when the time past, block number increase, alice expects to have her reward amount by calling `pendingReward()`
          // this scenario occurred between block #(mockedBlock+10)-..#(mockedBlock+17) for campaign 0 and 1
          await this.farming.farmingRangeAsDeployer.addCampaignInfo(
            this.farming.stakingToken.address,
            this.farming.rewardToken.address,
            this.farming.mockedBlock.add(10).toString(),
          );

          await this.farming.farmingRangeAsDeployer.addCampaignInfo(
            this.farming.stakingToken.address,
            this.farming.rewardToken.address,
            this.farming.mockedBlock.add(14).toString(),
          );

          // set reward for campaign 0
          await this.farming.farmingRangeAsDeployer.addRewardInfo(
            0,
            this.farming.mockedBlock.add(13).toString(),
            INITIAL_BONUS_REWARD_PER_BLOCK,
          );

          // set reward for campaign 1
          await this.farming.farmingRangeAsDeployer.addRewardInfo(
            1,
            this.farming.mockedBlock.add(17).toString(),
            INITIAL_BONUS_REWARD_PER_BLOCK.add(parseEther("100")),
          );
          // mint staking token to alice
          await this.farming.stakingTokenAsDeployer.mint(await this.signers.user.getAddress(), parseEther("1000"));
          // mint staking token to bob
          await this.farming.stakingTokenAsDeployer.mint(await this.signers.feeTo.getAddress(), parseEther("1000"));
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
          let expectedAccRewardPerShare = constants.Two.mul(parseUnits("1", 20)); // reward per share 1
          expect((await this.farming.farmingRangeAsAlice.campaignInfo(0)).lastRewardBlock).to.eq(currentBlockNum);
          expect((await this.farming.farmingRangeAsAlice.campaignInfo(0)).accRewardPerShare).to.eq(
            expectedAccRewardPerShare,
          );
          expect((await this.farming.farmingRangeAsAlice.campaignInfo(0)).totalStaked).to.eq(parseEther("300"));
          expect(
            await this.farming.farmingRangeAsAlice.pendingReward(constants.Zero, await this.signers.user.getAddress()),
          ).to.eq(parseEther("233.333333333333333333"));
          expect(
            await this.farming.farmingRangeAsAlice.pendingReward(constants.Zero, await this.signers.feeTo.getAddress()),
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
          expectedAccRewardPerShare = constants.One.mul(parseUnits("1", 20)); // reward per share 1, from 2(200)/400 = 1
          expect((await this.farming.farmingRangeAsAlice.campaignInfo(1)).lastRewardBlock).to.eq(currentBlockNum);
          expect((await this.farming.farmingRangeAsAlice.campaignInfo(1)).accRewardPerShare).to.eq(
            expectedAccRewardPerShare,
          );
          expect((await this.farming.farmingRangeAsAlice.campaignInfo(1)).totalStaked).to.eq(parseEther("1000"));
          // reward for alice will be calculated by 2(200)/400 = 1 (when alice deposit) +  1(200)/1000 = 0.2 (when bob deposit) = 1.2 reward per share * 400 = 480
          expect(
            await this.farming.farmingRangeAsAlice.pendingReward(constants.One, await this.signers.user.getAddress()),
          ).to.eq(parseEther("480"));
          // reward for alice will be calculated by 2(200)/400 = 1 (when alice deposit) +  1(200)/1000 = 0.2 (when bob deposit) = 1.2 reward per share * 600 = 720
          // 720 - rewardDebt of bob = 720 - 600 = 120
          expect(
            await this.farming.farmingRangeAsAlice.pendingReward(constants.One, await this.signers.feeTo.getAddress()),
          ).to.eq(parseEther("120"));
        });
      });
    });
  });

  describe("#emergencyWithdraw()", async function () {
    it("should return the correct deposit amount to the user", async function () {
      const mintedReward = INITIAL_BONUS_REWARD_PER_BLOCK.mul(
        this.farming.mockedBlock.add(10).sub(this.farming.mockedBlock.add(5)),
      );
      // mint reward token to Deployer (when add rewardInfo)
      await this.farming.rewardTokenAsDeployer.mint(await this.signers.admin.getAddress(), mintedReward); // this scenario occurred between block #(mockedBlock+5)-..#(mockedBlock+10)
      await this.farming.farmingRangeAsDeployer.addCampaignInfo(
        this.farming.stakingToken.address,
        this.farming.rewardToken.address,
        this.farming.mockedBlock.add(5).toString(),
      );

      await this.farming.farmingRangeAsDeployer.addRewardInfo(
        0,
        this.farming.mockedBlock.add(10).toString(),
        INITIAL_BONUS_REWARD_PER_BLOCK,
      );
      // mint staking token to alice
      await this.farming.stakingTokenAsDeployer.mint(await this.signers.user.getAddress(), parseEther("100"));
      // alice & bob approve farming range
      await this.farming.stakingTokenAsAlice.approve(this.farming.farmingRange.address, parseEther("100"));
      // alice deposit @block number #(mockedBlock+9)
      await this.farming.farmingRangeAsAlice.deposit(constants.Zero, parseEther("100"));
      expect(await this.farming.stakingToken.balanceOf(await this.signers.user.getAddress())).to.eq(constants.Zero);
      // alice withdraw from the campaign
      await this.farming.farmingRangeAsAlice.emergencyWithdraw(constants.Zero);
      expect(await (await this.farming.farmingRangeAsAlice.campaignInfo(0)).totalStaked).to.eq(0);
      expect(await this.farming.stakingToken.balanceOf(await this.signers.user.getAddress())).to.eq(parseEther("100"));
    });
    it("should reset all user's info", async function () {
      const mintedReward = INITIAL_BONUS_REWARD_PER_BLOCK.mul(
        this.farming.mockedBlock.add(10).sub(this.farming.mockedBlock.add(5)),
      );
      // mint reward token to Deployer (when add rewardInfo)
      await this.farming.rewardTokenAsDeployer.mint(await this.signers.admin.getAddress(), mintedReward); // this scenario occurred between block #(mockedBlock+5)-..#(mockedBlock+10)
      await this.farming.farmingRangeAsDeployer.addCampaignInfo(
        this.farming.stakingToken.address,
        this.farming.rewardToken.address,
        this.farming.mockedBlock.add(5).toString(),
      );

      await this.farming.farmingRangeAsDeployer.addRewardInfo(
        0,
        this.farming.mockedBlock.add(10).toString(),
        INITIAL_BONUS_REWARD_PER_BLOCK,
      );
      // mint staking token to alice
      await this.farming.stakingTokenAsDeployer.mint(await this.signers.user.getAddress(), parseEther("100"));
      // alice & bob approve farming range
      await this.farming.stakingTokenAsAlice.approve(this.farming.farmingRange.address, parseEther("100"));
      // alice deposit @block number #(mockedBlock+9)
      await this.farming.farmingRangeAsAlice.deposit(constants.Zero, parseEther("100"));
      let userInfo = await this.farming.farmingRangeAsAlice.userInfo(
        constants.Zero,
        await this.signers.user.getAddress(),
      );
      expect(await this.farming.stakingToken.balanceOf(await this.signers.user.getAddress())).to.eq(constants.Zero);
      expect(userInfo.amount).to.eq(parseEther("100"));
      expect(userInfo.rewardDebt).to.eq(constants.Zero);
      // alice withdraw from the campaign
      await this.farming.farmingRangeAsAlice.emergencyWithdraw(constants.Zero);
      userInfo = await this.farming.farmingRangeAsAlice.userInfo(constants.Zero, await this.signers.user.getAddress());
      expect(userInfo.amount).to.eq(constants.Zero);
      expect(userInfo.rewardDebt).to.eq(constants.Zero);
    });
  });

  describe("#withdraw()", async function () {
    context("With invalid parameters", async function () {
      it("should revert when no enough amount to withdraw", async function () {
        // mint reward token to Deployer (when add rewardInfo)
        await this.farming.rewardTokenAsDeployer.mint(
          await this.signers.admin.getAddress(),
          INITIAL_BONUS_REWARD_PER_BLOCK.mul(this.farming.mockedBlock.add(8).sub(this.farming.mockedBlock.add(6))),
        );
        // scenario: alice deposit #n amount staking token to the pool
        // when the time past, block number increase, alice expects to have her reward amount by calling `rewardToken()`
        // this scenario occurred between block #(mockedBlock+5)-..#(mockedBlock+8)
        // and alice withdraw amount staking token out of pool
        await this.farming.farmingRangeAsDeployer.addCampaignInfo(
          this.farming.stakingToken.address,
          this.farming.rewardToken.address,
          this.farming.mockedBlock.add(6).toString(),
        );

        await this.farming.farmingRangeAsDeployer.addRewardInfo(
          0,
          this.farming.mockedBlock.add(8).toString(),
          INITIAL_BONUS_REWARD_PER_BLOCK,
        );
        // mint staking token to alice
        await this.farming.stakingTokenAsDeployer.mint(await this.signers.user.getAddress(), parseEther("100"));
        // alice approve farming range
        await this.farming.stakingTokenAsAlice.approve(this.farming.farmingRange.address, parseEther("100"));
        // alice deposit @block number #(mockedBlock+6)
        await this.farming.farmingRangeAsAlice.deposit(constants.Zero, parseEther("100"));

        // mint reward token to Deployer (when add rewardInfo)
        await expect(this.farming.farmingRangeAsAlice.withdraw(constants.Zero, parseEther("2000"))).to.be.revertedWith(
          "FarmingRange::withdraw::bad withdraw amount",
        );
      });
      context("when there is NO predefined campaign", async function () {
        it("should revert the tx since an array of predefined campaigns is out of bound", async function () {
          // mint staking token to alice
          await this.farming.stakingTokenAsDeployer.mint(await this.signers.user.getAddress(), parseEther("100"));
          // mint reward token to Deployer (when add rewardInfo)
          await this.farming.rewardTokenAsDeployer.mint(await this.signers.admin.getAddress(), parseEther("100"));
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
          await this.farming.rewardTokenAsDeployer.mint(await this.signers.admin.getAddress(), mintedReward);
          await this.farming.farmingRangeAsDeployer.addCampaignInfo(
            this.farming.stakingToken.address,
            this.farming.rewardToken.address,
            this.farming.mockedBlock.add(9).toString(),
          );

          await this.farming.farmingRangeAsDeployer.addRewardInfo(
            0,
            this.farming.mockedBlock.add(11).toString(),
            INITIAL_BONUS_REWARD_PER_BLOCK,
          );
          // mint staking token to alice
          await this.farming.stakingTokenAsDeployer.mint(await this.signers.user.getAddress(), parseEther("100"));

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
                    await this.signers.admin.getAddress(),
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
                    this.farming.mockedBlock.add(6).toString(),
                  );

                  await this.farming.farmingRangeAsDeployer.addRewardInfo(
                    0,
                    this.farming.mockedBlock.add(8).toString(),
                    INITIAL_BONUS_REWARD_PER_BLOCK,
                  );
                  // mint staking token to alice
                  await this.farming.stakingTokenAsDeployer.mint(
                    await this.signers.user.getAddress(),
                    parseEther("100"),
                  );
                  // alice approve farming range
                  await this.farming.stakingTokenAsAlice.approve(this.farming.farmingRange.address, parseEther("100"));
                  // alice deposit @block number #(mockedBlock+6)
                  await this.farming.farmingRangeAsAlice.deposit(constants.Zero, parseEther("100"));
                  // alice withdraw @block number #(mockedBlock+7)
                  await this.farming.farmingRangeAsAlice.withdraw(constants.Zero, parseEther("100"));

                  expect(await this.farming.rewardToken.balanceOf(await this.signers.user.getAddress())).to.eq(
                    parseEther("200"),
                  );
                  expect(
                    await (await this.farming.farmingRangeAsAlice.campaignInfo(constants.Zero)).totalStaked.toString(),
                  ).to.eq(parseEther("0"));
                  expect(
                    await (await this.farming.stakingToken.balanceOf(await this.signers.user.getAddress())).toString(),
                  ).to.eq(parseEther("100"));
                });
              });
              context("when alice withdraw out the range of reward blocks", async function () {
                it("should receive a reward correctly", async function () {
                  const mintedReward = INITIAL_BONUS_REWARD_PER_BLOCK.mul(
                    this.farming.mockedBlock.add(8).sub(this.farming.mockedBlock.add(6)),
                  );
                  // mint reward token to Deployer (when add rewardInfo)
                  await this.farming.rewardTokenAsDeployer.mint(await this.signers.admin.getAddress(), mintedReward);
                  // scenario: alice deposit  #n amount staking token to the pool
                  // when the time past, block number increase, alice expects to have her reward amount by calling 'rewardToken'
                  // this scenario occurred between block #(mockedBlock+6)-..#(mockedBlock+8)
                  // and alice withdraw amount staking token out of pool after end time
                  await this.farming.farmingRangeAsDeployer.addCampaignInfo(
                    this.farming.stakingToken.address,
                    this.farming.rewardToken.address,
                    this.farming.mockedBlock.add(6).toString(),
                  );

                  await this.farming.farmingRangeAsDeployer.addRewardInfo(
                    0,
                    this.farming.mockedBlock.add(8).toString(),
                    INITIAL_BONUS_REWARD_PER_BLOCK,
                  );
                  // mint staking token to alice
                  await this.farming.stakingTokenAsDeployer.mint(
                    await this.signers.user.getAddress(),
                    parseEther("100"),
                  );
                  // alice approve farming range
                  await this.farming.stakingTokenAsAlice.approve(this.farming.farmingRange.address, parseEther("100"));
                  // alice deposit @block number #(mockedBlock+7)
                  await this.farming.farmingRangeAsAlice.deposit(constants.Zero, parseEther("100"));
                  // alice withdraw @block number #(mockedBlock+8)
                  await advanceBlockTo(this.farming.mockedBlock.add(20).toNumber());
                  await this.farming.farmingRangeAsAlice.withdraw(constants.Zero, parseEther("100"));

                  expect(
                    await (await this.farming.stakingToken.balanceOf(await this.signers.user.getAddress())).toString(),
                  ).to.eq(parseEther("100"));
                  expect(
                    await (await this.farming.farmingRangeAsAlice.campaignInfo(constants.Zero)).totalStaked.toString(),
                  ).to.eq(parseEther("0"));
                  expect(await this.farming.rewardToken.balanceOf(await this.signers.user.getAddress())).to.eq(
                    mintedReward,
                  );
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
                  await this.farming.rewardTokenAsDeployer.mint(await this.signers.admin.getAddress(), mintedReward);
                  // scenario: alice deposit #n amount staking token to the pool
                  // when the time past, block number increase, alice expects to have her reward amount by calling `rewardToken()`
                  // this scenario occurred between block #(mockedBlock+8)-..#(mockedBlock+10)
                  // and alice withdraw amount staking token out of pool
                  await this.farming.farmingRangeAsDeployer.addCampaignInfo(
                    this.farming.stakingToken.address,
                    this.farming.rewardToken.address,
                    this.farming.mockedBlock.add(8).toString(),
                  );

                  await this.farming.farmingRangeAsDeployer.addRewardInfo(
                    0,
                    this.farming.mockedBlock.add(10).toString(),
                    INITIAL_BONUS_REWARD_PER_BLOCK,
                  );
                  // mint staking token to alice
                  await this.farming.stakingTokenAsDeployer.mint(
                    await this.signers.user.getAddress(),
                    parseEther("100"),
                  );
                  // alice approve farming range
                  await this.farming.stakingTokenAsAlice.approve(this.farming.farmingRange.address, parseEther("100"));
                  // alice deposit @block number #(mockedBlock+6)
                  await this.farming.farmingRangeAsAlice.deposit(constants.Zero, parseEther("100"));
                  // alice withdraw @block number #(mockedBlock+7)
                  await advanceBlockTo(this.farming.mockedBlock.add(10).toNumber());

                  await this.farming.farmingRangeAsAlice.withdraw(constants.Zero, parseEther("100"));

                  expect(
                    await (await this.farming.stakingToken.balanceOf(await this.signers.user.getAddress())).toString(),
                  ).to.eq(parseEther("100"));
                  expect(
                    await (await this.farming.farmingRangeAsAlice.campaignInfo(constants.Zero)).totalStaked.toString(),
                  ).to.eq(parseEther("0"));
                  expect(await this.farming.rewardToken.balanceOf(await this.signers.user.getAddress())).to.eq(
                    parseEther("200"),
                  );
                });
              });
              context("when alice withdraw out the range of reward blocks", async function () {
                it("should receive a reward correctly", async function () {
                  // mint reward token to Deployer (when add rewardInfo)
                  await this.farming.rewardTokenAsDeployer.mint(
                    await this.signers.admin.getAddress(),
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
                    this.farming.mockedBlock.add(9).toString(),
                  );

                  await this.farming.farmingRangeAsDeployer.addRewardInfo(
                    0,
                    this.farming.mockedBlock.add(11).toString(),
                    INITIAL_BONUS_REWARD_PER_BLOCK,
                  );
                  // mint staking token to alice
                  await this.farming.stakingTokenAsDeployer.mint(
                    await this.signers.user.getAddress(),
                    parseEther("100"),
                  );
                  // alice approve farming range
                  await this.farming.stakingTokenAsAlice.approve(this.farming.farmingRange.address, parseEther("100"));
                  // alice deposit @block number #(mockedBlock+6)
                  await this.farming.farmingRangeAsAlice.deposit(constants.Zero, parseEther("100"));
                  // alice withdraw @block number #(mockedBlock+7)
                  await advanceBlockTo(this.farming.mockedBlock.add(11).toNumber());
                  await this.farming.farmingRangeAsAlice.withdraw(constants.Zero, parseEther("100"));

                  expect(
                    await (await this.farming.stakingToken.balanceOf(await this.signers.user.getAddress())).toString(),
                  ).to.eq(parseEther("100"));
                  expect(
                    await (await this.farming.farmingRangeAsAlice.campaignInfo(constants.Zero)).totalStaked.toString(),
                  ).to.eq(parseEther("0"));
                  expect(await this.farming.rewardToken.balanceOf(await this.signers.user.getAddress())).to.eq(
                    parseEther("200"),
                  );
                });
              });
            });
            context("When alice's deposit block exceeds the end block", async function () {
              it("won't distribute any rewards to alice", async function () {
                const mintedReward = INITIAL_BONUS_REWARD_PER_BLOCK.mul(
                  this.farming.mockedBlock.add(10).sub(this.farming.mockedBlock.add(8)),
                );
                // mint reward token to Deployer (when add rewardInfo)
                await this.farming.rewardTokenAsDeployer.mint(await this.signers.admin.getAddress(), mintedReward);
                // scenario: alice deposit #n amount staking token to the pool
                // when the time past, block number increase, alice expects to have her reward amount by calling `pendingReward()`
                // this scenario occurred between block #(mockedBlock+8)-..#(mockedBlock+10)
                await this.farming.farmingRangeAsDeployer.addCampaignInfo(
                  this.farming.stakingToken.address,
                  this.farming.rewardToken.address,
                  this.farming.mockedBlock.add(8).toString(),
                );

                await this.farming.farmingRangeAsDeployer.addRewardInfo(
                  0,
                  this.farming.mockedBlock.add(10).toString(),
                  INITIAL_BONUS_REWARD_PER_BLOCK,
                );
                // mint staking token to alice
                await this.farming.stakingTokenAsDeployer.mint(await this.signers.user.getAddress(), parseEther("100"));
                // mint staking token to bob
                await this.farming.stakingTokenAsDeployer.mint(
                  await this.signers.feeTo.getAddress(),
                  parseEther("100"),
                );

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

                expect(
                  await (await this.farming.stakingToken.balanceOf(await this.signers.user.getAddress())).toString(),
                ).to.eq(parseEther("100"));
                expect(
                  await (await this.farming.farmingRangeAsAlice.campaignInfo(constants.Zero)).totalStaked.toString(),
                ).to.eq(parseEther("0"));
                expect(await this.farming.rewardToken.balanceOf(await this.signers.user.getAddress())).to.eq(
                  parseEther("0"),
                );
              });
            });
          });
        });
        context("When there are multiple reward info (multiple phases)", async function () {
          context("When alice finish deposit within the first phase", async function () {
            it("should accrue the correct reward corresponding to different phases", async function () {
              const mintedRewardPhase1 = INITIAL_BONUS_REWARD_PER_BLOCK.mul(
                this.farming.mockedBlock.add(11).sub(this.farming.mockedBlock.add(9)),
              );
              const mintedRewardPhase2 = INITIAL_BONUS_REWARD_PER_BLOCK.add(parseEther("100")).mul(
                this.farming.mockedBlock.add(21).sub(this.farming.mockedBlock.add(11)),
              );
              const mintedReward = mintedRewardPhase1.add(mintedRewardPhase2);
              // mint reward token to Deployer (when add rewardInfo)
              await this.farming.rewardTokenAsDeployer.mint(await this.signers.admin.getAddress(), mintedReward);
              // scenario: alice deposit #n amount staking token to the pool
              // when the time past, block number increase, alice expects to have her reward amount by calling `pendingReward()`
              // this scenario occurred between block #(mockedBlock+9)-..#(mockedBlock+11)
              await this.farming.farmingRangeAsDeployer.addCampaignInfo(
                this.farming.stakingToken.address,
                this.farming.rewardToken.address,
                this.farming.mockedBlock.add(9).toString(),
              );

              await this.farming.farmingRangeAsDeployer.addRewardInfo(
                0,
                this.farming.mockedBlock.add(11).toString(),
                INITIAL_BONUS_REWARD_PER_BLOCK,
              );

              await this.farming.farmingRangeAsDeployer.addRewardInfo(
                0,
                this.farming.mockedBlock.add(21).toString(),
                INITIAL_BONUS_REWARD_PER_BLOCK.add(parseEther("100")), // 200 reward per block
              );
              // mint staking token to alice
              await this.farming.stakingTokenAsDeployer.mint(await this.signers.user.getAddress(), parseEther("100"));
              // mint staking token to bob
              await this.farming.stakingTokenAsDeployer.mint(await this.signers.feeTo.getAddress(), parseEther("100"));
              // alice & bob approve farming range
              await this.farming.stakingTokenAsAlice.approve(this.farming.farmingRange.address, parseEther("100"));
              await this.farming.stakingTokenAsBob.approve(this.farming.farmingRange.address, parseEther("100"));

              // alice deposit @block number #(mockedBlock+10)
              await this.farming.farmingRangeAsAlice.deposit(constants.Zero, parseEther("100"));
              // bob deposit @block number #(mockedBlock+11)
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
              expect(
                await (await this.farming.stakingToken.balanceOf(await this.signers.user.getAddress())).toString(),
              ).to.eq(parseEther("100"));
              expect(
                await (await this.farming.stakingToken.balanceOf(await this.signers.feeTo.getAddress())).toString(),
              ).to.eq(parseEther("100"));

              expect(
                await (await this.farming.farmingRangeAsAlice.campaignInfo(constants.Zero)).totalStaked.toString(),
              ).to.eq(parseEther("0"));
              expect(await this.farming.rewardToken.balanceOf(await this.signers.user.getAddress())).to.eq(
                parseEther("1200"),
              );
              expect(await this.farming.rewardToken.balanceOf(await this.signers.feeTo.getAddress())).to.eq(
                parseEther("1000"),
              );
            });
          });
          context("When alice finish deposit within the second phase", async function () {
            it("should accrue the correct reward corresponding to different phases", async function () {
              const mintedRewardPhase1 = INITIAL_BONUS_REWARD_PER_BLOCK.mul(
                this.farming.mockedBlock.add(11).sub(this.farming.mockedBlock.add(9)),
              );
              const mintedRewardPhase2 = INITIAL_BONUS_REWARD_PER_BLOCK.add(parseEther("100")).mul(
                this.farming.mockedBlock.add(21).sub(this.farming.mockedBlock.add(11)),
              );
              const totalMintedReward = mintedRewardPhase1.add(mintedRewardPhase2);
              // mint reward token to Deployer (when add rewardInfo)
              await this.farming.rewardTokenAsDeployer.mint(await this.signers.admin.getAddress(), totalMintedReward);
              // scenario: alice deposit #n amount staking token to the pool
              // when the time past, block number increase, alice expects to have her reward amount by calling `pendingReward()`
              // this scenario occurred between block #(mockedBlock+9)-..#(mockedBlock+11)
              await this.farming.farmingRangeAsDeployer.addCampaignInfo(
                this.farming.stakingToken.address,
                this.farming.rewardToken.address,
                this.farming.mockedBlock.add(9).toString(),
              );

              await this.farming.farmingRangeAsDeployer.addRewardInfo(
                0,
                this.farming.mockedBlock.add(11).toString(),
                INITIAL_BONUS_REWARD_PER_BLOCK,
              );

              await this.farming.farmingRangeAsDeployer.addRewardInfo(
                0,
                this.farming.mockedBlock.add(21).toString(),
                INITIAL_BONUS_REWARD_PER_BLOCK.add(parseEther("100")), // 200 reward per block
              );
              // mint staking token to alice
              await this.farming.stakingTokenAsDeployer.mint(await this.signers.user.getAddress(), parseEther("100"));
              // mint staking token to bob
              await this.farming.stakingTokenAsDeployer.mint(await this.signers.feeTo.getAddress(), parseEther("100"));
              // alice & bob approve farming range
              await this.farming.stakingTokenAsAlice.approve(this.farming.farmingRange.address, parseEther("100"));
              await this.farming.stakingTokenAsBob.approve(this.farming.farmingRange.address, parseEther("100"));

              // alice deposit @block number #(mockedBlock+10)
              await this.farming.farmingRangeAsAlice.deposit(constants.Zero, parseEther("100"));
              // skip to phase 2
              await advanceBlockTo(this.farming.mockedBlock.add(12).toNumber());
              // bob deposit @block number #(mockedBlock+13)
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

              expect(
                await (await this.farming.stakingToken.balanceOf(await this.signers.user.getAddress())).toString(),
              ).to.eq(parseEther("100"));
              expect(
                await (await this.farming.stakingToken.balanceOf(await this.signers.feeTo.getAddress())).toString(),
              ).to.eq(parseEther("100"));

              expect(
                await (await this.farming.farmingRangeAsAlice.campaignInfo(constants.Zero)).totalStaked.toString(),
              ).to.eq(parseEther("0"));

              // alice will get 6 * 100 = 600 for the latest accu reward and (200 * 8)/200 * 100 = 800 for latest reward block to the end block
              expect(await this.farming.rewardToken.balanceOf(await this.signers.user.getAddress())).to.eq(
                parseEther("1400"),
              );
              expect(await this.farming.rewardToken.balanceOf(await this.signers.feeTo.getAddress())).to.eq(
                parseEther("800"),
              );
            });
          });
        });
      });
      context("When there are multiple campaigns", async function () {
        it("should correctly separate rewards and total staked", async function () {
          const mintedRewardCampaign1Phase1 = INITIAL_BONUS_REWARD_PER_BLOCK.mul(
            this.farming.mockedBlock.add(13).sub(this.farming.mockedBlock.add(10)),
          );
          const mintedRewardCampaign2Phase1 = INITIAL_BONUS_REWARD_PER_BLOCK.add(parseEther("100")).mul(
            this.farming.mockedBlock.add(21).sub(this.farming.mockedBlock.add(14)),
          );
          const totalMintedReward = mintedRewardCampaign2Phase1.add(mintedRewardCampaign1Phase1);
          // mint reward token to Deployer (when add rewardInfo)
          await this.farming.rewardTokenAsDeployer.mint(await this.signers.admin.getAddress(), totalMintedReward);
          // scenario: alice deposit #n amount staking token to the pool
          // when the time past, block number increase, alice expects to have her reward amount by calling `rewardToekn()`
          // this scenario occurred between block #(mockedBlock+10)-..#(mockedBlock+17) for campaign 0 and 1
          await this.farming.farmingRangeAsDeployer.addCampaignInfo(
            this.farming.stakingToken.address,
            this.farming.rewardToken.address,
            this.farming.mockedBlock.add(10).toString(),
          );

          await this.farming.farmingRangeAsDeployer.addCampaignInfo(
            this.farming.stakingToken.address,
            this.farming.rewardToken.address,
            this.farming.mockedBlock.add(14).toString(),
          );

          // set reward for campaign 0
          await this.farming.farmingRangeAsDeployer.addRewardInfo(
            0,
            this.farming.mockedBlock.add(13).toString(),
            INITIAL_BONUS_REWARD_PER_BLOCK,
          );

          // set reward for campaign 1
          await this.farming.farmingRangeAsDeployer.addRewardInfo(
            1,
            this.farming.mockedBlock.add(21).toString(),
            INITIAL_BONUS_REWARD_PER_BLOCK.add(parseEther("100")),
          );
          // mint staking token to alice
          await this.farming.stakingTokenAsDeployer.mint(await this.signers.user.getAddress(), parseEther("1000"));
          // mint staking token to bob
          await this.farming.stakingTokenAsDeployer.mint(await this.signers.feeTo.getAddress(), parseEther("1000"));
          // alice & bob approve farming range
          await this.farming.stakingTokenAsAlice.approve(this.farming.farmingRange.address, parseEther("1000"));
          await this.farming.stakingTokenAsBob.approve(this.farming.farmingRange.address, parseEther("1000"));

          // ### campaign 0 ###
          // alice deposit @block number #(mockedBlock+11)
          await this.farming.farmingRangeAsAlice.deposit(constants.Zero, parseEther("100"));
          // bob deposit @block number #(mockedBlock+12)
          await this.farming.farmingRangeAsBob.deposit(constants.Zero, parseEther("200"));

          let currentBlockNum = await latestBlockNumber();
          await advanceBlockTo(this.farming.mockedBlock.add(13).toNumber());

          // alice withdraw @block number #(mockedBlock)

          // alice should expect to see her pending reward according to calculated reward per share and her deposit
          let expectedAccRewardPerShare = constants.Two.mul(parseUnits("1", 20)); // reward per share 1
          expect((await this.farming.farmingRangeAsAlice.campaignInfo(0)).lastRewardBlock).to.eq(currentBlockNum);
          expect((await this.farming.farmingRangeAsAlice.campaignInfo(0)).accRewardPerShare).to.eq(
            expectedAccRewardPerShare,
          );
          expect((await this.farming.farmingRangeAsAlice.campaignInfo(0)).totalStaked).to.eq(parseEther("300"));

          await this.farming.farmingRangeAsAlice.withdraw(constants.Zero, parseEther("100"));
          await this.farming.farmingRangeAsBob.withdraw(constants.Zero, parseEther("200"));

          expect(
            await (await this.farming.stakingToken.balanceOf(await this.signers.user.getAddress())).toString(),
          ).to.eq(parseEther("1000"));
          expect(
            await (await this.farming.stakingToken.balanceOf(await this.signers.feeTo.getAddress())).toString(),
          ).to.eq(parseEther("1000"));

          expect(
            await (await this.farming.farmingRangeAsAlice.campaignInfo(constants.Zero)).totalStaked.toString(),
          ).to.eq(parseEther("0"));
          expect(await this.farming.rewardToken.balanceOf(await this.signers.user.getAddress())).to.eq(
            parseEther("233.333333333333333333"),
          );
          expect(await this.farming.rewardToken.balanceOf(await this.signers.feeTo.getAddress())).to.eq(
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
          // reward per share calculated by 14 - 20 = 6 block diff * 200 rewards / 400 current staked from alice
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

          expect(
            await (await this.farming.farmingRangeAsAlice.campaignInfo(constants.One)).totalStaked.toString(),
          ).to.eq(parseEther("0"));
          expect(await (await this.farming.farmingRangeAsBob.campaignInfo(constants.One)).totalStaked.toString()).to.eq(
            parseEther("0"),
          );
          // alice will get a total of (3 reward per share* 400(from last accu) = 1200) + (200 rewards * 1 multiplier / 1000 total staked = 2/10 = 0.2 * 400 = 80) = 1280
          // with prev campaign, alice will get in total of = 1280 + 233.3333 = 1513.333
          expect(await this.farming.rewardToken.balanceOf(await this.signers.user.getAddress())).to.eq(
            parseEther("1513.333333333333333333"),
          );
          expect(await this.farming.rewardToken.balanceOf(await this.signers.feeTo.getAddress())).to.eq(
            parseEther("186.666666666666666666"),
          );
        });
      });
    });
  });

  describe("#harvest()", async function () {
    context("With invalid parameters", async function () {
      context("when there is NO predefined campaign", async function () {
        it("should revert the tx since an array of predefined campaigns is out of bound", async function () {
          // mint staking token to alice
          await this.farming.stakingTokenAsDeployer.mint(await this.signers.user.getAddress(), parseEther("100"));
          // mint reward token to Deployer (when add rewardInfo)
          await this.farming.rewardTokenAsDeployer.mint(await this.signers.admin.getAddress(), parseEther("100"));
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
          await this.farming.rewardTokenAsDeployer.mint(await this.signers.admin.getAddress(), mintedReward);
          await this.farming.farmingRangeAsDeployer.addCampaignInfo(
            this.farming.stakingToken.address,
            this.farming.rewardToken.address,
            this.farming.mockedBlock.add(9).toString(),
          );

          await this.farming.farmingRangeAsDeployer.addRewardInfo(
            0,
            this.farming.mockedBlock.add(11).toString(),
            INITIAL_BONUS_REWARD_PER_BLOCK,
          );
          // mint staking token to alice
          await this.farming.stakingTokenAsDeployer.mint(await this.signers.user.getAddress(), parseEther("100"));

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
                    this.farming.mockedBlock.add(8).sub(this.farming.mockedBlock.add(6)),
                  );
                  // mint reward token to Deployer (when add rewardInfo)
                  await this.farming.rewardTokenAsDeployer.mint(await this.signers.admin.getAddress(), mintedReward);
                  // scenario: alice deposit #n amount staking token to the pool
                  // when the time past, block number increase, alice expects to have her reward amount by calling `rewardToken()`
                  // this scenario occurred between block #(mockedBlock+6)-..#(mockedBlock+8)
                  // and alice harvest reward from staking token pool
                  await this.farming.farmingRangeAsDeployer.addCampaignInfo(
                    this.farming.stakingToken.address,
                    this.farming.rewardToken.address,
                    this.farming.mockedBlock.add(6).toString(),
                  );

                  await this.farming.farmingRangeAsDeployer.addRewardInfo(
                    0,
                    this.farming.mockedBlock.add(8).toString(),
                    INITIAL_BONUS_REWARD_PER_BLOCK,
                  );
                  // mint staking token to alice
                  await this.farming.stakingTokenAsDeployer.mint(
                    await this.signers.user.getAddress(),
                    parseEther("100"),
                  );
                  // alice approve farming range
                  await this.farming.stakingTokenAsAlice.approve(this.farming.farmingRange.address, parseEther("100"));
                  // alice deposit @block number #(mockedBlock+7)
                  await this.farming.farmingRangeAsAlice.deposit(constants.Zero, parseEther("100"));
                  // alice withdraw @block number #(mockedBlock+8)
                  await this.farming.farmingRangeAsAlice.harvest([constants.Zero]);

                  expect(
                    await (await this.farming.stakingToken.balanceOf(await this.signers.user.getAddress())).toString(),
                  ).to.eq(parseEther("0"));
                  expect(
                    await (await this.farming.farmingRangeAsAlice.campaignInfo(constants.Zero)).totalStaked.toString(),
                  ).to.eq(parseEther("100"));
                  expect(await this.farming.rewardToken.balanceOf(await this.signers.user.getAddress())).to.eq(
                    mintedReward,
                  );
                });
              });
              context("when alice harvest out the range of reward blocks", async function () {
                it("should receive a reward correctly", async function () {
                  const mintedReward = INITIAL_BONUS_REWARD_PER_BLOCK.mul(
                    this.farming.mockedBlock.add(8).sub(this.farming.mockedBlock.add(6)),
                  );
                  // mint reward token to Deployer (when add rewardInfo)
                  await this.farming.rewardTokenAsDeployer.mint(await this.signers.admin.getAddress(), mintedReward);
                  // scenario: alice deposit  #n amount staking token to the pool
                  // when the time past, block number increase, alice expects to have her reward amount by calling 'rewardToken'
                  // this scenario occurred between block #(mockedBlock+7)-..#(mockedBlock+8)
                  // and alice harvest amount from staking token pool after end time
                  await this.farming.farmingRangeAsDeployer.addCampaignInfo(
                    this.farming.stakingToken.address,
                    this.farming.rewardToken.address,
                    this.farming.mockedBlock.add(6).toString(),
                  );

                  await this.farming.farmingRangeAsDeployer.addRewardInfo(
                    0,
                    this.farming.mockedBlock.add(8).toString(),
                    INITIAL_BONUS_REWARD_PER_BLOCK,
                  );
                  // mint staking token to alice
                  await this.farming.stakingTokenAsDeployer.mint(
                    await this.signers.user.getAddress(),
                    parseEther("100"),
                  );
                  // alice approve farming range
                  await this.farming.stakingTokenAsAlice.approve(this.farming.farmingRange.address, parseEther("100"));
                  // alice deposit @block number #(mockedBlock+7)
                  await this.farming.farmingRangeAsAlice.deposit(constants.Zero, parseEther("100"));
                  await advanceBlockTo(this.farming.mockedBlock.add(20).toNumber());
                  await this.farming.farmingRangeAsAlice.harvest([constants.Zero]);

                  expect(
                    await (await this.farming.stakingToken.balanceOf(await this.signers.user.getAddress())).toString(),
                  ).to.eq(parseEther("0"));
                  expect(
                    await (await this.farming.farmingRangeAsAlice.campaignInfo(constants.Zero)).totalStaked.toString(),
                  ).to.eq(parseEther("100"));
                  expect(await this.farming.rewardToken.balanceOf(await this.signers.user.getAddress())).to.eq(
                    mintedReward,
                  );
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
                  await this.farming.rewardTokenAsDeployer.mint(await this.signers.admin.getAddress(), mintedReward);
                  // scenario: alice deposit #n amount staking token to the pool
                  // when the time past, block number increase, alice expects to have her reward amount by calling `rewardToken()`
                  // this scenario occurred between block #(mockedBlock+8)-..#(mockedBlock+10)
                  // and alice harvest rewards from staking token pool
                  await this.farming.farmingRangeAsDeployer.addCampaignInfo(
                    this.farming.stakingToken.address,
                    this.farming.rewardToken.address,
                    this.farming.mockedBlock.add(8).toString(),
                  );

                  await this.farming.farmingRangeAsDeployer.addRewardInfo(
                    0,
                    this.farming.mockedBlock.add(10).toString(),
                    INITIAL_BONUS_REWARD_PER_BLOCK,
                  );
                  // mint staking token to alice
                  await this.farming.stakingTokenAsDeployer.mint(
                    await this.signers.user.getAddress(),
                    parseEther("100"),
                  );
                  // alice approve farming range
                  await this.farming.stakingTokenAsAlice.approve(this.farming.farmingRange.address, parseEther("100"));
                  // alice deposit @block number #(mockedBlock+6)
                  await this.farming.farmingRangeAsAlice.deposit(constants.Zero, parseEther("100"));
                  // alice withdraw @block number #(mockedBlock+7)
                  await advanceBlockTo(this.farming.mockedBlock.add(10).toNumber());
                  await this.farming.farmingRangeAsAlice.harvest([constants.Zero]);

                  expect(
                    await (await this.farming.stakingToken.balanceOf(await this.signers.user.getAddress())).toString(),
                  ).to.eq(parseEther("0"));
                  expect(
                    await (await this.farming.farmingRangeAsAlice.campaignInfo(constants.Zero)).totalStaked.toString(),
                  ).to.eq(parseEther("100"));
                  expect(await this.farming.rewardToken.balanceOf(await this.signers.user.getAddress())).to.eq(
                    mintedReward,
                  );
                });
              });
              context("when alice harvest out the range of reward blocks", async function () {
                it("should receive a reward correctly", async function () {
                  const mintedReward = INITIAL_BONUS_REWARD_PER_BLOCK.mul(
                    this.farming.mockedBlock.add(11).sub(this.farming.mockedBlock.add(9)),
                  );
                  // mint reward token to Deployer (when add rewardInfo)
                  await this.farming.rewardTokenAsDeployer.mint(await this.signers.admin.getAddress(), mintedReward); // scenario: alice deposit #n amount staking token to the pool
                  // when the time past, block number increase, alice expects to have her reward amount by calling `rewardToken()`
                  // this scenario occurred between block #(mockedBlock+5)-..#(mockedBlock+9)
                  // and alice harvest amount from staking token pool
                  await this.farming.farmingRangeAsDeployer.addCampaignInfo(
                    this.farming.stakingToken.address,
                    this.farming.rewardToken.address,
                    this.farming.mockedBlock.add(9).toString(),
                  );

                  await this.farming.farmingRangeAsDeployer.addRewardInfo(
                    0,
                    this.farming.mockedBlock.add(11).toString(),
                    INITIAL_BONUS_REWARD_PER_BLOCK,
                  );
                  // mint staking token to alice
                  await this.farming.stakingTokenAsDeployer.mint(
                    await this.signers.user.getAddress(),
                    parseEther("100"),
                  );
                  // alice approve farming range
                  await this.farming.stakingTokenAsAlice.approve(this.farming.farmingRange.address, parseEther("100"));
                  // alice deposit @block number #(mockedBlock+6)
                  await this.farming.farmingRangeAsAlice.deposit(constants.Zero, parseEther("100"));
                  // alice withdraw @block number #(mockedBlock+7)
                  await advanceBlockTo(this.farming.mockedBlock.add(11).toNumber());
                  await this.farming.farmingRangeAsAlice.harvest([constants.Zero]);

                  expect(
                    await (await this.farming.stakingToken.balanceOf(await this.signers.user.getAddress())).toString(),
                  ).to.eq(parseEther("0"));
                  expect(
                    await (await this.farming.farmingRangeAsAlice.campaignInfo(constants.Zero)).totalStaked.toString(),
                  ).to.eq(parseEther("100"));
                  expect(await this.farming.rewardToken.balanceOf(await this.signers.user.getAddress())).to.eq(
                    parseEther("200"),
                  );
                });
              });
            });
            context("When alice's deposit block exceeds the end block", async function () {
              it("won't distribute any rewards to alice", async function () {
                const mintedReward = INITIAL_BONUS_REWARD_PER_BLOCK.mul(
                  this.farming.mockedBlock.add(10).sub(this.farming.mockedBlock.add(8)),
                );
                // mint reward token to Deployer (when add rewardInfo)
                await this.farming.rewardTokenAsDeployer.mint(await this.signers.admin.getAddress(), mintedReward);
                // scenario: alice deposit #n amount staking token to the pool
                // when the time past, block number increase, alice expects to have her reward amount by calling `pendingReward()`
                // this scenario occurred between block #(mockedBlock+8)-..#(mockedBlock+10)
                await this.farming.farmingRangeAsDeployer.addCampaignInfo(
                  this.farming.stakingToken.address,
                  this.farming.rewardToken.address,
                  this.farming.mockedBlock.add(8).toString(),
                );

                await this.farming.farmingRangeAsDeployer.addRewardInfo(
                  0,
                  this.farming.mockedBlock.add(10).toString(),
                  INITIAL_BONUS_REWARD_PER_BLOCK,
                );
                // mint staking token to alice
                await this.farming.stakingTokenAsDeployer.mint(await this.signers.user.getAddress(), parseEther("100"));
                // mint staking token to bob
                await this.farming.stakingTokenAsDeployer.mint(
                  await this.signers.feeTo.getAddress(),
                  parseEther("100"),
                );
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

                expect(
                  await (await this.farming.stakingToken.balanceOf(await this.signers.user.getAddress())).toString(),
                ).to.eq(parseEther("0"));
                expect(
                  await (await this.farming.farmingRangeAsAlice.campaignInfo(constants.Zero)).totalStaked.toString(),
                ).to.eq(parseEther("100"));
                expect(await this.farming.rewardToken.balanceOf(await this.signers.user.getAddress())).to.eq(
                  parseEther("0"),
                );
              });
            });
          });
        });
        context("When there are multiple reward info (multiple phases)", async function () {
          context("When alice finish deposit within the first phase", async function () {
            it("should accrue the correct reward corresponding to different phases", async function () {
              const mintedRewardPhase1 = INITIAL_BONUS_REWARD_PER_BLOCK.mul(
                this.farming.mockedBlock.add(11).sub(this.farming.mockedBlock.add(9)),
              );
              const mintedRewardPhase2 = INITIAL_BONUS_REWARD_PER_BLOCK.add(parseEther("100")).mul(
                this.farming.mockedBlock.add(21).sub(this.farming.mockedBlock.add(11)),
              );
              const totalMintedReward = mintedRewardPhase1.add(mintedRewardPhase2);
              // mint reward token to Deployer (when add rewardInfo)
              await this.farming.rewardTokenAsDeployer.mint(await this.signers.admin.getAddress(), totalMintedReward);
              // scenario: alice deposit #n amount staking token to the pool
              // when the time past, block number increase, alice expects to have her reward amount by calling `pendingReward()`
              // this scenario occurred between block #(mockedBlock+9)-..#(mockedBlock+11)
              await this.farming.farmingRangeAsDeployer.addCampaignInfo(
                this.farming.stakingToken.address,
                this.farming.rewardToken.address,
                this.farming.mockedBlock.add(9).toString(),
              );

              await this.farming.farmingRangeAsDeployer.addRewardInfo(
                0,
                this.farming.mockedBlock.add(11).toString(),
                INITIAL_BONUS_REWARD_PER_BLOCK,
              );

              await this.farming.farmingRangeAsDeployer.addRewardInfo(
                0,
                this.farming.mockedBlock.add(21).toString(),
                INITIAL_BONUS_REWARD_PER_BLOCK.add(parseEther("100")), // 200 reward per block
              );
              // mint staking token to alice
              await this.farming.stakingTokenAsDeployer.mint(await this.signers.user.getAddress(), parseEther("100"));
              // mint staking token to bob
              await this.farming.stakingTokenAsDeployer.mint(await this.signers.feeTo.getAddress(), parseEther("100"));
              // alice & bob approve farming range
              await this.farming.stakingTokenAsAlice.approve(this.farming.farmingRange.address, parseEther("100"));
              await this.farming.stakingTokenAsBob.approve(this.farming.farmingRange.address, parseEther("100"));
              // alice deposit @block number #(mockedBlock+10)
              await this.farming.farmingRangeAsAlice.deposit(constants.Zero, parseEther("100"));
              // bob deposit @block number #(mockedBlock+11)
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
              expect(
                await (await this.farming.stakingToken.balanceOf(await this.signers.user.getAddress())).toString(),
              ).to.eq(parseEther("0"));
              expect(
                await (await this.farming.stakingToken.balanceOf(await this.signers.feeTo.getAddress())).toString(),
              ).to.eq(parseEther("0"));
              expect(
                await (await this.farming.farmingRangeAsAlice.campaignInfo(constants.Zero)).totalStaked.toString(),
              ).to.eq(parseEther("200"));
              expect(await this.farming.rewardToken.balanceOf(await this.signers.user.getAddress())).to.eq(
                parseEther("1200"),
              );
              expect(await this.farming.rewardToken.balanceOf(await this.signers.feeTo.getAddress())).to.eq(
                parseEther("1000"),
              );
            });
          });
          context("When alice finish deposit within the second phase", async function () {
            it("should accrue the correct reward corresponding to different phases", async function () {
              const mintedRewardPhase1 = INITIAL_BONUS_REWARD_PER_BLOCK.mul(
                this.farming.mockedBlock.add(11).sub(this.farming.mockedBlock.add(9)),
              );
              const mintedRewardPhase2 = INITIAL_BONUS_REWARD_PER_BLOCK.add(parseEther("100")).mul(
                this.farming.mockedBlock.add(21).sub(this.farming.mockedBlock.add(11)),
              );
              const totalMintedReward = mintedRewardPhase1.add(mintedRewardPhase2);
              // mint reward token to Deployer (when add rewardInfo)
              await this.farming.rewardTokenAsDeployer.mint(await this.signers.admin.getAddress(), totalMintedReward); // scenario: alice deposit #n amount staking token to the pool
              // when the time past, block number increase, alice expects to have her reward amount by calling `pendingReward()`
              // this scenario occurred between block #(mockedBlock+9)-..#(mockedBlock+11)
              await this.farming.farmingRangeAsDeployer.addCampaignInfo(
                this.farming.stakingToken.address,
                this.farming.rewardToken.address,
                this.farming.mockedBlock.add(9).toString(),
              );

              await this.farming.farmingRangeAsDeployer.addRewardInfo(
                0,
                this.farming.mockedBlock.add(11).toString(),
                INITIAL_BONUS_REWARD_PER_BLOCK,
              );

              await this.farming.farmingRangeAsDeployer.addRewardInfo(
                0,
                this.farming.mockedBlock.add(21).toString(),
                INITIAL_BONUS_REWARD_PER_BLOCK.add(parseEther("100")), // 200 reward per block
              );
              // mint staking token to alice
              await this.farming.stakingTokenAsDeployer.mint(await this.signers.user.getAddress(), parseEther("100"));
              // mint staking token to bob
              await this.farming.stakingTokenAsDeployer.mint(await this.signers.feeTo.getAddress(), parseEther("100"));
              // alice & bob approve farming range
              await this.farming.stakingTokenAsAlice.approve(this.farming.farmingRange.address, parseEther("100"));
              await this.farming.stakingTokenAsBob.approve(this.farming.farmingRange.address, parseEther("100"));

              // alice deposit @block number #(mockedBlock+10)
              await this.farming.farmingRangeAsAlice.deposit(constants.Zero, parseEther("100"));
              // skip to phase 2
              await advanceBlockTo(this.farming.mockedBlock.add(12).toNumber());
              // bob deposit @block number #(mockedBlock+13)

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

              expect(
                await (await this.farming.stakingToken.balanceOf(await this.signers.user.getAddress())).toString(),
              ).to.eq(parseEther("0"));
              expect(
                await (await this.farming.stakingToken.balanceOf(await this.signers.feeTo.getAddress())).toString(),
              ).to.eq(parseEther("0"));

              expect(
                await (await this.farming.farmingRangeAsAlice.campaignInfo(constants.Zero)).totalStaked.toString(),
              ).to.eq(parseEther("200"));
              expect(await this.farming.rewardToken.balanceOf(await this.signers.user.getAddress())).to.eq(
                parseEther("1400"),
              );
              expect(await this.farming.rewardToken.balanceOf(await this.signers.feeTo.getAddress())).to.eq(
                parseEther("800"),
              );
            });
          });
        });
      });
      context("When there are multiple campaigns", async function () {
        it("should correctly separate rewards and total staked", async function () {
          const mintedRewardCampaign1Phase1 = INITIAL_BONUS_REWARD_PER_BLOCK.mul(
            this.farming.mockedBlock.add(13).sub(this.farming.mockedBlock.add(10)),
          );
          const mintedRewardCampaign2Phase1 = INITIAL_BONUS_REWARD_PER_BLOCK.add(parseEther("100")).mul(
            this.farming.mockedBlock.add(21).sub(this.farming.mockedBlock.add(14)),
          );
          const totalMintedReward = mintedRewardCampaign2Phase1.add(mintedRewardCampaign1Phase1);
          // mint reward token to Deployer (when add rewardInfo)
          await this.farming.rewardTokenAsDeployer.mint(await this.signers.admin.getAddress(), totalMintedReward); // scenario: alice deposit #n amount staking token to the pool
          // when the time past, block number increase, alice expects to have her reward amount by calling `rewardToekn()`
          // this scenario occurred between block #(mockedBlock+10)-..#(mockedBlock+21) for campaign 0 and 1
          await this.farming.farmingRangeAsDeployer.addCampaignInfo(
            this.farming.stakingToken.address,
            this.farming.rewardToken.address,
            this.farming.mockedBlock.add(10).toString(),
          );

          await this.farming.farmingRangeAsDeployer.addCampaignInfo(
            this.farming.stakingToken.address,
            this.farming.rewardToken.address,
            this.farming.mockedBlock.add(14).toString(),
          );

          // set reward for campaign 0
          await this.farming.farmingRangeAsDeployer.addRewardInfo(
            0,
            this.farming.mockedBlock.add(13).toString(),
            INITIAL_BONUS_REWARD_PER_BLOCK,
          );

          // set reward for campaign 1
          await this.farming.farmingRangeAsDeployer.addRewardInfo(
            1,
            this.farming.mockedBlock.add(21).toString(),
            INITIAL_BONUS_REWARD_PER_BLOCK.add(parseEther("100")),
          );
          // mint staking token to alice
          await this.farming.stakingTokenAsDeployer.mint(await this.signers.user.getAddress(), parseEther("1000"));
          // mint staking token to bob
          await this.farming.stakingTokenAsDeployer.mint(await this.signers.feeTo.getAddress(), parseEther("1000"));
          // alice & bob approve farming range
          await this.farming.stakingTokenAsAlice.approve(this.farming.farmingRange.address, parseEther("1000"));
          await this.farming.stakingTokenAsBob.approve(this.farming.farmingRange.address, parseEther("1000"));

          // ### campaign 0 ###
          // alice deposit @block number #(mockedBlock+11)
          await this.farming.farmingRangeAsAlice.deposit(constants.Zero, parseEther("100"));
          // bob deposit @block number #(mockedBlock+12)
          await this.farming.farmingRangeAsBob.deposit(constants.Zero, parseEther("200"));

          let currentBlockNum = await latestBlockNumber();
          await advanceBlockTo(this.farming.mockedBlock.add(13).toNumber());

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

          expect(
            await (await this.farming.stakingToken.balanceOf(await this.signers.user.getAddress())).toString(),
          ).to.eq(parseEther("900"));
          expect(
            await (await this.farming.stakingToken.balanceOf(await this.signers.feeTo.getAddress())).toString(),
          ).to.eq(parseEther("800"));

          expect(
            await (await this.farming.farmingRangeAsAlice.campaignInfo(constants.Zero)).totalStaked.toString(),
          ).to.eq(parseEther("300"));
          expect(await this.farming.rewardToken.balanceOf(await this.signers.user.getAddress())).to.eq(
            parseEther("233.333333333333333333"),
          );
          expect(await this.farming.rewardToken.balanceOf(await this.signers.feeTo.getAddress())).to.eq(
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
          // reward per share calculated by 14 - 20 = 6 block diff * 200 rewards / 400 current staked from alice
          // = 1200 / 400 = 3 accu reward per share
          expectedAccRewardPerShare = BigNumber.from(3).mul(parseUnits("1", 20));
          expect((await this.farming.farmingRangeAsAlice.campaignInfo(1)).lastRewardBlock).to.eq(currentBlockNum);
          expect((await this.farming.farmingRangeAsAlice.campaignInfo(1)).accRewardPerShare).to.eq(
            expectedAccRewardPerShare,
          );
          expect((await this.farming.farmingRangeAsAlice.campaignInfo(1)).totalStaked).to.eq(parseEther("1000"));
          // harvest
          await this.farming.farmingRangeAsAlice.harvest([constants.One]);
          await this.farming.farmingRangeAsBob.harvest([constants.One]);
          // alice should expect to see her pending reward according to calculated reward per share and her deposit

          expect(
            await (await this.farming.stakingToken.balanceOf(await this.signers.user.getAddress())).toString(),
          ).to.eq(parseEther("500"));
          expect(
            await (await this.farming.stakingToken.balanceOf(await this.signers.feeTo.getAddress())).toString(),
          ).to.eq(parseEther("200"));
          expect(
            await (await this.farming.farmingRangeAsAlice.campaignInfo(constants.One)).totalStaked.toString(),
          ).to.eq(parseEther("1000"));
          expect(await this.farming.rewardToken.balanceOf(await this.signers.user.getAddress())).to.eq(
            parseEther("1513.333333333333333333"),
          );
          expect(await this.farming.rewardToken.balanceOf(await this.signers.feeTo.getAddress())).to.eq(
            parseEther("186.666666666666666666"),
          );
        });
      });
    });
  });
}
