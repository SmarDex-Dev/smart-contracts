import { parseEther } from "ethers/lib/utils";
import { expect } from "chai";
import { constants } from "ethers";
import { INITIAL_BONUS_REWARD_PER_BLOCK } from "../utils";
import { advanceBlockTo } from "../../helpers/time";

export function shouldRefundRewardManager() {
  describe("Reward manager refunds", async function () {
    context("When bob is the first depositor of the campaign", async function () {
      it("should send first phase non-distributed SDEX to reward manager", async function () {
        /* -------------------------------------------------------------------------- */
        /*                             Setup test context                             */
        /* -------------------------------------------------------------------------- */
        const rewardManagerAddress = await this.farming.farmingRange.rewardManager();

        const mintedRewardPhase1 = INITIAL_BONUS_REWARD_PER_BLOCK.mul(
          this.farming.mockedBlock.add(19).sub(this.farming.mockedBlock.add(9)),
        );
        const mintedRewardPhase2 = INITIAL_BONUS_REWARD_PER_BLOCK.add(parseEther("100")).mul(
          this.farming.mockedBlock.add(29).sub(this.farming.mockedBlock.add(19)),
        );

        const mintedReward = mintedRewardPhase1.add(mintedRewardPhase2);
        // mint reward token to Deployer (when add rewardInfo)
        await this.farming.rewardTokenAsDeployer.mint(this.signers.admin.address, mintedReward); // scenario: bob deposit #n amount staking token to the pool during the phase 2

        /* ---------------- Create farming campaign and reward phase ---------------- */

        // this scenario occurred between block #(mockedBlock+9)-..#(mockedBlock+29)
        await this.farming.farmingRangeAsDeployer.addCampaignInfo(
          this.farming.stakingToken.address,
          this.farming.rewardToken.address,
          this.farming.mockedBlock.add(9),
        );

        // Add phase 1
        // Start @block number #(mockedBlock+9)
        // End @block number #(mockedBlock+19)
        // Reward per block: 100
        await this.farming.farmingRangeAsDeployer.addRewardInfo(
          0,
          this.farming.mockedBlock.add(19),
          INITIAL_BONUS_REWARD_PER_BLOCK,
        );

        // Add phase 1
        // Start @block number #(mockedBlock+19)
        // End @block number #(mockedBlock+29)
        // Reward per block: 200
        await this.farming.farmingRangeAsDeployer.addRewardInfo(
          0,
          this.farming.mockedBlock.add(29),
          INITIAL_BONUS_REWARD_PER_BLOCK.add(parseEther("100")), // 200 reward per block
        );

        /* ---------------------- Get initial contract balances --------------------- */

        // get initial balances
        const rewardManagerInitialBalance = await this.farming.rewardToken.balanceOf(rewardManagerAddress);
        const farmingRangeInitialBalance = await this.farming.rewardToken.balanceOf(this.farming.farmingRange.address);

        /* -------------------------------------------------------------------------- */
        /*                           Bob setup & interaction                          */
        /* -------------------------------------------------------------------------- */

        // mint staking token to bob
        await this.farming.stakingTokenAsDeployer.mint(this.signers.feeTo.address, parseEther("100"));
        // bob approve farming range
        await this.farming.stakingTokenAsBob.approve(this.farming.farmingRange.address, parseEther("100"));
        // Since no deposits need to be made in Phase 1, we will proceed directly to Phase 2.
        await advanceBlockTo(this.farming.mockedBlock.add(24).toNumber());
        // bob deposit @block number #(mockedBlock+24)
        await this.farming.farmingRangeAsBob.deposit(constants.Zero, parseEther("100"));

        // Get pending reward @block number #(mockedBlock+29)
        await advanceBlockTo(this.farming.mockedBlock.add(29).toNumber());
        // The rewards from the Phase 1 should not be in the pendingReward
        // Check pending rewards @block number #(mockedBlock+25)
        // (29 - 25) * 200 = 800
        const bobWithdraw = await this.farming.farmingRangeAsBob.pendingReward(
          constants.Zero,
          this.signers.feeTo.address,
        );
        expect(bobWithdraw).to.eq(parseEther("800"));

        // bob withdraw @block number #(mockedBlock+30)
        // (29 - 25) * 200 = 800
        await this.farming.farmingRangeAsBob.withdraw(constants.Zero, parseEther("100"));

        /* -------------------------------------------------------------------------- */
        /*                           Check refunded amounts                           */
        /* -------------------------------------------------------------------------- */

        // the total rewards of the Phase 1 should have been transferred to the rewardManager
        // check the RewardManager and FarmingRange balances
        const rewardManagerFinalBalance = await this.farming.rewardToken.balanceOf(rewardManagerAddress);
        const farmingRangeFinalBalance = await this.farming.rewardToken.balanceOf(this.farming.farmingRange.address);

        // RewardManager received the Phase 1 rewards and non-distributed phase 2 rewards
        // phase1Rewards + phase2Rewards - bobWithdraw
        // 1000 + 2000 - 800 = 2200
        expect(rewardManagerFinalBalance.sub(rewardManagerInitialBalance)).to.eq(
          mintedRewardPhase1.add(mintedRewardPhase2.sub(bobWithdraw)),
        );
        expect(rewardManagerFinalBalance.sub(rewardManagerInitialBalance)).to.eq(parseEther("2200"));

        // FarmingRange sent the Phase 1 rewards and non-distributed phase 2 rewards
        // phase1Rewards + phase2Rewards - bobWithdraw
        // 1000 + 2000 - 800 = 2200
        expect(farmingRangeInitialBalance.sub(farmingRangeFinalBalance).sub(bobWithdraw)).to.eq(
          mintedRewardPhase1.add(mintedRewardPhase2.sub(bobWithdraw)),
        );
        expect(farmingRangeInitialBalance.sub(farmingRangeFinalBalance).sub(bobWithdraw)).to.eq(parseEther("2200"));
      });
      it("should send the 3 first phases non-distributed SDEX to reward manager", async function () {
        /* -------------------------------------------------------------------------- */
        /*                             Setup test context                             */
        /* -------------------------------------------------------------------------- */
        const rewardManagerAddress = await this.farming.farmingRange.rewardManager();

        const mintedRewardPhase1 = INITIAL_BONUS_REWARD_PER_BLOCK.mul(
          this.farming.mockedBlock.add(11).sub(this.farming.mockedBlock.add(9)),
        );
        const mintedRewardPhase2 = INITIAL_BONUS_REWARD_PER_BLOCK.mul(
          this.farming.mockedBlock.add(13).sub(this.farming.mockedBlock.add(11)),
        );
        const mintedRewardPhase3 = INITIAL_BONUS_REWARD_PER_BLOCK.mul(
          this.farming.mockedBlock.add(15).sub(this.farming.mockedBlock.add(13)),
        );
        const mintedRewardPhase4 = INITIAL_BONUS_REWARD_PER_BLOCK.add(parseEther("100")).mul(
          this.farming.mockedBlock.add(29).sub(this.farming.mockedBlock.add(15)),
        );

        const mintedReward = mintedRewardPhase1.add(mintedRewardPhase2).add(mintedRewardPhase3).add(mintedRewardPhase4);
        // mint reward token to Deployer (when add rewardInfo)
        await this.farming.rewardTokenAsDeployer.mint(this.signers.admin.address, mintedReward); // scenario: bob deposit #n amount staking token to the pool during the phase 2

        /* ---------------- Create farming campaign and reward phase ---------------- */

        // this scenario occurred between block #(mockedBlock+9)-..#(mockedBlock+29)
        await this.farming.farmingRangeAsDeployer.addCampaignInfo(
          this.farming.stakingToken.address,
          this.farming.rewardToken.address,
          this.farming.mockedBlock.add(9),
        );

        // Add phase 1
        // Start @block number #(mockedBlock+9)
        // End @block number #(mockedBlock+11)
        // Reward per block: 100
        await this.farming.farmingRangeAsDeployer.addRewardInfo(
          0,
          this.farming.mockedBlock.add(11),
          INITIAL_BONUS_REWARD_PER_BLOCK,
        );

        // Add phase 2
        // Start @block number #(mockedBlock+11)
        // End @block number #(mockedBlock+13)
        // Reward per block: 100
        await this.farming.farmingRangeAsDeployer.addRewardInfo(
          0,
          this.farming.mockedBlock.add(13),
          INITIAL_BONUS_REWARD_PER_BLOCK,
        );

        // Add phase 3
        // Start @block number #(mockedBlock+13)
        // End @block number #(mockedBlock+15)
        // Reward per block: 100
        await this.farming.farmingRangeAsDeployer.addRewardInfo(
          0,
          this.farming.mockedBlock.add(15),
          INITIAL_BONUS_REWARD_PER_BLOCK,
        );

        // Add phase 4
        // Start @block number #(mockedBlock+15)
        // End @block number #(mockedBlock+29)
        // Reward per block: 200
        await this.farming.farmingRangeAsDeployer.addRewardInfo(
          0,
          this.farming.mockedBlock.add(29),
          INITIAL_BONUS_REWARD_PER_BLOCK.add(parseEther("100")),
        );

        /* ---------------------- Get initial contract balances --------------------- */

        // get initial balances
        const rewardManagerInitialBalance = await this.farming.rewardToken.balanceOf(rewardManagerAddress);
        const farmingRangeInitialBalance = await this.farming.rewardToken.balanceOf(this.farming.farmingRange.address);

        /* -------------------------------------------------------------------------- */
        /*                           Bob setup & interaction                          */
        /* -------------------------------------------------------------------------- */

        // mint staking token to bob
        await this.farming.stakingTokenAsDeployer.mint(this.signers.feeTo.address, parseEther("100"));
        // bob approve farming range
        await this.farming.stakingTokenAsBob.approve(this.farming.farmingRange.address, parseEther("100"));
        // Since no deposits need to be made in Phase 1 2 and 3, we will proceed directly to Phase 4.
        await advanceBlockTo(this.farming.mockedBlock.add(24).toNumber());
        // bob deposit @block number #(mockedBlock+24)
        await this.farming.farmingRangeAsBob.deposit(constants.Zero, parseEther("100"));

        // Get pendingReward @block number #(mockedBlock+26)
        await advanceBlockTo(this.farming.mockedBlock.add(26).toNumber());
        // The rewards from the Phase 1 should not be in the pendingReward
        // Check pending rewards @block number #(mockedBlock+26)
        // (26 - 25) * 200 = 200
        const bobPendingRewards = await this.farming.farmingRangeAsBob.pendingReward(
          constants.Zero,
          this.signers.feeTo.address,
        );
        expect(bobPendingRewards).to.eq(parseEther("200"));

        // bob withdraw @block number #(mockedBlock+27)
        // Withdraw (27 - 25) * 200 = 400
        await this.farming.farmingRangeAsBob.withdraw(constants.Zero, parseEther("100"));
        // Bob has withdraw @block number #(mockedBlock+27) 400 rewards tokens
        const bobWithdraw = bobPendingRewards.add(parseEther("200"));

        // the total rewards of the Phase 1 should have been transfered to the rewardManager
        // check the RewardManager and FarmingRange balances
        const rewardManagerFinalBalance = await this.farming.rewardToken.balanceOf(rewardManagerAddress);
        const farmingRangeFinalBalance = await this.farming.rewardToken.balanceOf(this.farming.farmingRange.address);

        /* -------------------------------------------------------------------------- */
        /*                           Check refunded amounts                           */
        /* -------------------------------------------------------------------------- */

        // RewardManager received the Phase 1 2, 3 rewards and non distributed phase 4 rewards
        // Phase 1: (11 - 9)  * 100 = 200
        // Phase 2: (13 - 11) * 100 = 200
        // Phase 3: (15 - 13) * 100 = 200
        // Phase 4: (29 - 15) * 200 - 400(bobWithdraw) - notElapsedRewards
        //        = (29 - 15) * 200 - 400 - (29 - 27) * 200
        //        = 2800 - 400 - 400 = 2000
        // Total: 200 + 200 + 200 + 2000 = 2600
        expect(rewardManagerFinalBalance.sub(rewardManagerInitialBalance)).to.eq(
          mintedRewardPhase1
            .add(mintedRewardPhase2)
            .add(mintedRewardPhase3)
            .add(mintedRewardPhase4.sub(bobWithdraw))
            .sub(parseEther("400")),
        );
        expect(rewardManagerFinalBalance.sub(rewardManagerInitialBalance)).to.eq(parseEther("2600"));

        // FarmingRange sent the Phase 1 2, 3 rewards and non-distributed phase 4 rewards
        // Phase 1: (11 - 9)  * 100 = 200
        // Phase 2: (13 - 11) * 100 = 200
        // Phase 3: (15 - 13) * 100 = 200
        // Phase 4: (29 - 15) * 200 - notElapsedRewards
        //        = (29 - 15) * 200 - (29 - 27) * 200
        //        = 2800 - 400 = 2400
        // Total: 200 + 200 + 200 + 2400 = 3000
        expect(farmingRangeInitialBalance.sub(farmingRangeFinalBalance)).to.eq(
          mintedRewardPhase1
            .add(mintedRewardPhase2)
            .add(mintedRewardPhase3)
            .add(mintedRewardPhase4.sub(parseEther("400"))),
        );
        expect(farmingRangeInitialBalance.sub(farmingRangeFinalBalance)).to.eq(parseEther("3000"));
      });
      context("When bob withdraw in the middle second reward phase", async function () {
        context("When Alice deposit few blocks after bob's withdraw", async function () {
          it("Should send only the rewards between bob's withdraw and alice's deposit", async function () {
            // => create a test that check if the reward manager get the right amount of reward tokens when bob deposit before the beginning of the first reward frame,
            //    withdraw in the middle of the second reward frame and alice deposit a few blocks after bob's withdraw but before the end of the second reward frame.

            /* -------------------------------------------------------------------------- */
            /*                             Setup test context                             */
            /* -------------------------------------------------------------------------- */
            const rewardManagerAddress = await this.farming.farmingRange.rewardManager();

            const mintedRewardPhase1 = INITIAL_BONUS_REWARD_PER_BLOCK.mul(
              this.farming.mockedBlock.add(19).sub(this.farming.mockedBlock.add(9)),
            );
            const mintedRewardPhase2 = INITIAL_BONUS_REWARD_PER_BLOCK.add(parseEther("100")).mul(
              this.farming.mockedBlock.add(29).sub(this.farming.mockedBlock.add(19)),
            );

            const mintedReward = mintedRewardPhase1.add(mintedRewardPhase2);
            // mint reward token to Deployer (when add rewardInfo)
            await this.farming.rewardTokenAsDeployer.mint(this.signers.admin.address, mintedReward);

            /* ---------------- Create farming campaign and reward phase ---------------- */

            // this scenario occurred between block #(mockedBlock+9)-..#(mockedBlock+29)
            await this.farming.farmingRangeAsDeployer.addCampaignInfo(
              this.farming.stakingToken.address,
              this.farming.rewardToken.address,
              this.farming.mockedBlock.add(9),
            );

            // Add phase 1
            // Start @block number #(mockedBlock+9)
            // End @block number #(mockedBlock+19)
            // Reward per block: 100
            await this.farming.farmingRangeAsDeployer.addRewardInfo(
              0,
              this.farming.mockedBlock.add(19),
              INITIAL_BONUS_REWARD_PER_BLOCK,
            );

            // Add phase 1
            // Start @block number #(mockedBlock+19)
            // End @block number #(mockedBlock+29)
            // Reward per block: 200
            await this.farming.farmingRangeAsDeployer.addRewardInfo(
              0,
              this.farming.mockedBlock.add(29),
              INITIAL_BONUS_REWARD_PER_BLOCK.add(parseEther("100")), // 200 reward per block
            );

            /* ---------------------- Get initial contract balances --------------------- */

            // get initial balances
            const rewardManagerInitialBalance = await this.farming.rewardToken.balanceOf(rewardManagerAddress);

            /* -------------------------------------------------------------------------- */
            /*                           Bob setup & interaction                          */
            /* -------------------------------------------------------------------------- */

            // Mint staking token to bob
            await this.farming.stakingTokenAsDeployer.mint(this.signers.feeTo.address, parseEther("100"));
            // Bob approves farming range
            await this.farming.stakingTokenAsBob.approve(this.farming.farmingRange.address, parseEther("100"));

            // Bob deposits before the beginning of the first reward frame
            await this.farming.farmingRangeAsBob.deposit(constants.Zero, parseEther("100"));

            // Advance to middle of second reward frame
            await advanceBlockTo(this.farming.mockedBlock.add(21).toNumber());

            // Bob withdraws in the middle of second reward frame
            await this.farming.farmingRangeAsBob.withdraw(constants.Zero, parseEther("100"));

            /* -------------------------------------------------------------------------- */
            /*                          Alice setup & interaction                         */
            /* -------------------------------------------------------------------------- */

            // Mint staking token to alice
            await this.farming.stakingTokenAsDeployer.mint(this.signers.user.address, parseEther("200"));
            // Alice approves farming range
            await this.farming.stakingTokenAsAlice.approve(this.farming.farmingRange.address, parseEther("200"));
            // Alice deposits few blocks after bob's withdraw but before the end of the second reward frame
            await advanceBlockTo(this.farming.mockedBlock.add(26).toNumber());
            await this.farming.farmingRangeAsAlice.deposit(constants.Zero, parseEther("200"));

            /* -------------------------------------------------------------------------- */
            /*                           Check refunded amounts                           */
            /* -------------------------------------------------------------------------- */

            // The Phase 2 rewards between blocks 21 (bob withdraw) and 26 (alice deposit) should
            // have been transferred to the rewardManager.
            // Check the RewardManager balances
            const rewardManagerFinalBalance = await this.farming.rewardToken.balanceOf(rewardManagerAddress);

            // RewardManager received the Phase 2 rewards between blocks 21 (bob withdraw) and 26 (alice deposit)
            // phase2Rewards - (21 - 19) * 200 - (29 - 26) * 200
            // 2000 - 2 * 200 - 3 * 200 = 2000 - 400 - 600 = 1000
            expect(rewardManagerFinalBalance.sub(rewardManagerInitialBalance)).to.eq(parseEther("1000"));
            expect(rewardManagerFinalBalance.sub(rewardManagerInitialBalance)).to.eq(
              mintedRewardPhase2.sub(parseEther("400")).sub(parseEther("600")),
            );
          });
        });
      });
    });
    context("When alice deposit before the campaign start block", async function () {
      context("When alice withdraw before the campaign start block", async function () {
        it("should send first phase non-distributed SDEX to reward manager", async function () {
          /* -------------------------------------------------------------------------- */
          /*                             Setup test context                             */
          /* -------------------------------------------------------------------------- */

          const rewardManagerAddress = await this.farming.farmingRange.rewardManager();

          const mintedRewardPhase1 = INITIAL_BONUS_REWARD_PER_BLOCK.mul(
            this.farming.mockedBlock.add(29).sub(this.farming.mockedBlock.add(19)),
          );
          const mintedRewardPhase2 = INITIAL_BONUS_REWARD_PER_BLOCK.add(parseEther("100")).mul(
            this.farming.mockedBlock.add(39).sub(this.farming.mockedBlock.add(29)),
          );

          const mintedReward = mintedRewardPhase1.add(mintedRewardPhase2);
          // mint reward token to Deployer (when add rewardInfo)
          await this.farming.rewardTokenAsDeployer.mint(this.signers.admin.address, mintedReward);

          /* ---------------- Create farming campaign and reward phase ---------------- */

          // this scenario occurred between block #(mockedBlock+19)-..#(mockedBlock+39)
          await this.farming.farmingRangeAsDeployer.addCampaignInfo(
            this.farming.stakingToken.address,
            this.farming.rewardToken.address,
            this.farming.mockedBlock.add(19),
          );

          // Add phase 1
          // Start @block number #(mockedBlock+19)
          // End @block number #(mockedBlock+29)
          // Reward per block: 100
          await this.farming.farmingRangeAsDeployer.addRewardInfo(
            0,
            this.farming.mockedBlock.add(29),
            INITIAL_BONUS_REWARD_PER_BLOCK,
          );

          // Add phase 1
          // Start @block number #(mockedBlock+29)
          // End @block number #(mockedBlock+39)
          // Reward per block: 200
          await this.farming.farmingRangeAsDeployer.addRewardInfo(
            0,
            this.farming.mockedBlock.add(39),
            INITIAL_BONUS_REWARD_PER_BLOCK.add(parseEther("100")), // 200 reward per block
          );

          /* ---------------------- Get initial contract balances --------------------- */

          // get initial balances
          const rewardManagerInitialBalance = await this.farming.rewardToken.balanceOf(rewardManagerAddress);
          const farmingRangeInitialBalance = await this.farming.rewardToken.balanceOf(
            this.farming.farmingRange.address,
          );

          /* -------------------------------------------------------------------------- */
          /*                     Bob & Alice setup and interactions                     */
          /* -------------------------------------------------------------------------- */

          // mint staking token to bob & alice
          await this.farming.stakingTokenAsDeployer.mint(this.signers.feeTo.address, parseEther("100"));
          await this.farming.stakingTokenAsDeployer.mint(this.signers.user.address, parseEther("100"));

          // bob & alice approve farming range
          await this.farming.stakingTokenAsBob.approve(this.farming.farmingRange.address, parseEther("100"));
          await this.farming.stakingTokenAsAlice.approve(this.farming.farmingRange.address, parseEther("100"));

          /* --------------------------- Alice interactions --------------------------- */

          // Alice deposit and withdraw @block number #(mockedBlock+11)
          await this.farming.farmingRangeAsAlice.deposit(constants.Zero, parseEther("100"));
          // advance to block 14 to withdraw
          await advanceBlockTo(this.farming.mockedBlock.add(14).toNumber());
          await this.farming.farmingRangeAsAlice.withdraw(constants.Zero, parseEther("100"));

          // Alice shouldn't receive rewards
          expect(await this.farming.rewardToken.balanceOf(this.signers.user.address)).to.eq(constants.Zero);

          /* ---------------------------- Bob interactions ---------------------------- */

          await advanceBlockTo(this.farming.mockedBlock.add(28).toNumber());
          // bob deposit @block number #(mockedBlock+29)
          await this.farming.farmingRangeAsBob.deposit(constants.Zero, parseEther("100"));

          // Get pending reward @block number #(mockedBlock+36)
          await advanceBlockTo(this.farming.mockedBlock.add(36).toNumber());

          // The rewards from the Phase 1 should not be in the pendingReward
          // Check pending rewards
          // (36 - 29) * 200 = 1400
          const bobPendingRewards = await this.farming.farmingRangeAsBob.pendingReward(
            constants.Zero,
            this.signers.feeTo.address,
          );
          expect(bobPendingRewards).to.eq(parseEther("1400"));

          // bob withdraw @block number #(mockedBlock+37)
          // (37 - 29) * 200 = 1600
          await this.farming.farmingRangeAsBob.withdraw(constants.Zero, parseEther("100"));
          // Bob has withdrawn one block later
          const bobWithdraw = bobPendingRewards.add(parseEther("200"));

          /* -------------------------------------------------------------------------- */
          /*                           Check refunded amounts                           */
          /* -------------------------------------------------------------------------- */

          // the total rewards of the Phase 1 should have been transferred to the rewardManager
          // check the RewardManager and FarmingRange balances
          const rewardManagerFinalBalance = await this.farming.rewardToken.balanceOf(rewardManagerAddress);
          const farmingRangeFinalBalance = await this.farming.rewardToken.balanceOf(this.farming.farmingRange.address);

          // RewardManager received the Phase 1 rewards and non-distributed phase 2 rewards (0 in this case)
          // phase1Rewards + phase2Rewards - bobWithdraw - notElapsedRewards
          // Phase 1: (29 - 19) * 100 = 1000
          // Phase 2: (39 - 29) * 200 - (37 - 29) * 200 - (39 - 37) * 200
          //        = 2000 - 1600 - 400
          //        = 0
          expect(rewardManagerFinalBalance.sub(rewardManagerInitialBalance)).to.eq(mintedRewardPhase1);
          expect(rewardManagerFinalBalance.sub(rewardManagerInitialBalance)).to.eq(parseEther("1000"));

          // FarmingRange sent the Phase 1 rewards and non-distributed phase 2 rewards (0)
          // phase1Rewards + bobWithdraw
          // 1000 + 1600 = 2600
          expect(farmingRangeInitialBalance.sub(farmingRangeFinalBalance)).to.eq(mintedRewardPhase1.add(bobWithdraw));
          expect(farmingRangeInitialBalance.sub(farmingRangeFinalBalance)).to.eq(parseEther("2600"));
        });
      });
      context("When alice withdraw in the middle of the first reward phase", async function () {
        context("When bob deposit and withdraw in the first phase", async function () {
          it("should send only first phase non-distributed SDEX to reward manager", async function () {
            /* -------------------------------------------------------------------------- */
            /*                             Setup test context                             */
            /* -------------------------------------------------------------------------- */
            const rewardManagerAddress = await this.farming.farmingRange.rewardManager();

            const mintedRewardPhase1 = INITIAL_BONUS_REWARD_PER_BLOCK.mul(
              this.farming.mockedBlock.add(29).sub(this.farming.mockedBlock.add(19)),
            );
            const mintedRewardPhase2 = INITIAL_BONUS_REWARD_PER_BLOCK.add(parseEther("100")).mul(
              this.farming.mockedBlock.add(39).sub(this.farming.mockedBlock.add(29)),
            );

            const mintedReward = mintedRewardPhase1.add(mintedRewardPhase2);
            // mint reward token to Deployer (when add rewardInfo)
            await this.farming.rewardTokenAsDeployer.mint(this.signers.admin.address, mintedReward);

            /* ---------------- Create farming campaign and reward phase ---------------- */

            // this scenario occurred between block #(mockedBlock+19)-..#(mockedBlock+39)
            await this.farming.farmingRangeAsDeployer.addCampaignInfo(
              this.farming.stakingToken.address,
              this.farming.rewardToken.address,
              this.farming.mockedBlock.add(19),
            );

            // Add phase 1
            // Start @block number #(mockedBlock+19)
            // End @block number #(mockedBlock+29)
            // Reward per block: 100
            await this.farming.farmingRangeAsDeployer.addRewardInfo(
              0,
              this.farming.mockedBlock.add(29),
              INITIAL_BONUS_REWARD_PER_BLOCK,
            );

            // Add phase 1
            // Start @block number #(mockedBlock+29)
            // End @block number #(mockedBlock+39)
            // Reward per block: 200
            await this.farming.farmingRangeAsDeployer.addRewardInfo(
              0,
              this.farming.mockedBlock.add(39),
              INITIAL_BONUS_REWARD_PER_BLOCK.add(parseEther("100")), // 200 reward per block
            );

            /* ---------------------- Get initial contract balances --------------------- */

            // get initial balances
            const rewardManagerInitialBalance = await this.farming.rewardToken.balanceOf(rewardManagerAddress);
            const farmingRangeInitialBalance = await this.farming.rewardToken.balanceOf(
              this.farming.farmingRange.address,
            );

            /* -------------------------------------------------------------------------- */
            /*                     Bob & Alice setup and interactions                     */
            /* -------------------------------------------------------------------------- */

            // mint staking token to bob & alice
            await this.farming.stakingTokenAsDeployer.mint(this.signers.feeTo.address, parseEther("100"));
            await this.farming.stakingTokenAsDeployer.mint(this.signers.user.address, parseEther("100"));

            // bob & alice approve farming range
            await this.farming.stakingTokenAsBob.approve(this.farming.farmingRange.address, parseEther("100"));
            await this.farming.stakingTokenAsAlice.approve(this.farming.farmingRange.address, parseEther("100"));

            /* --------------------------- Alice interactions --------------------------- */

            // Alice deposit @block number #(mockedBlock+11)
            await this.farming.farmingRangeAsAlice.deposit(constants.Zero, parseEther("100"));
            // advance to block 23 to withdraw
            await advanceBlockTo(this.farming.mockedBlock.add(23).toNumber());
            // Alice withdraw @block number #(mockedBlock+24)
            await this.farming.farmingRangeAsAlice.withdraw(constants.Zero, parseEther("100"));

            // Alice should receive some rewards
            // (24 - 19) * 100 = 500
            const aliceReceivedRewards = await this.farming.rewardToken.balanceOf(this.signers.user.address);
            expect(aliceReceivedRewards).to.eq(parseEther("500"));

            /* ----------------------------- Bob interaction ---------------------------- */

            // proceed to Phase 2 for bob deposit.
            await advanceBlockTo(this.farming.mockedBlock.add(34).toNumber());
            // bob deposit @block number #(mockedBlock+35)
            await this.farming.farmingRangeAsBob.deposit(constants.Zero, parseEther("100"));

            // Advance block to @block number #(mockedBlock+36)
            await advanceBlockTo(this.farming.mockedBlock.add(36).toNumber());
            // The rewards from the Phase 1 should not be in the pendingReward
            // Check pending rewards @block number #(mockedBlock+35)
            // (36 - 35) * 200 = 200
            const bobPendingRewards = await this.farming.farmingRangeAsBob.pendingReward(
              constants.Zero,
              this.signers.feeTo.address,
            );
            expect(bobPendingRewards).to.eq(parseEther("200"));

            // Check pending rewards @block number #(mockedBlock+37)
            // (37 - 35) * 200 = 400
            await this.farming.farmingRangeAsBob.withdraw(constants.Zero, parseEther("100"));
            const bobWithdraw = bobPendingRewards.add(parseEther("200"));

            /* -------------------------------------------------------------------------- */
            /*                           Check refunded amounts                           */
            /* -------------------------------------------------------------------------- */

            // the total rewards of the Phase 1 should have been transferred to the rewardManager
            // check the RewardManager and FarmingRange balances
            const rewardManagerFinalBalance = await this.farming.rewardToken.balanceOf(rewardManagerAddress);
            const farmingRangeFinalBalance = await this.farming.rewardToken.balanceOf(
              this.farming.farmingRange.address,
            );

            // RewardManager received the Phase 1 and phase 2 non-distributed rewards
            // Phase 1: phase1Rewards - aliceWithdraw
            //        = (29 - 19) * 100 - (24 - 19) * 100
            //        = 1000 - 500 = 500
            // Phase 2: phase2Rewards - bobWithdraw - notElapsedRewards
            //        = (39 - 29) * 200 - (37 - 35) * 200 - (39 - 37) * 200
            //        = 2000 - 400 - 400 = 1200
            // Total: 1200 + 500 = 1700
            expect(rewardManagerFinalBalance.sub(rewardManagerInitialBalance)).to.eq(
              mintedRewardPhase1
                .sub(aliceReceivedRewards)
                .add(mintedRewardPhase2.sub(bobWithdraw).sub(parseEther("400"))),
            );
            expect(rewardManagerFinalBalance.sub(rewardManagerInitialBalance)).to.eq(parseEther("1700"));

            // FarmingRange sent the Phase 1 and phase 2 non-distributed rewards
            // Phase 1: (29 - 19) * 100 = 1000
            // Phase 2: phase2Rewards - notElapsedRewards
            //        = (39 - 29) * 200 - (39 - 37) * 200
            //        = 2000 - 400 = 1600
            // Total: 1000 + 1600 = 2600
            expect(farmingRangeInitialBalance.sub(farmingRangeFinalBalance)).to.eq(
              mintedRewardPhase1.add(mintedRewardPhase2.sub(parseEther("400"))),
            );
            expect(farmingRangeInitialBalance.sub(farmingRangeFinalBalance)).to.eq(parseEther("2600"));
          });
          context("When cat deposit and withdraw in the second phase", async function () {
            it("should send all and only the non-distributed SDEX to reward manager", async function () {
              /* -------------------------------------------------------------------------- */
              /*                             Setup test context                             */
              /* -------------------------------------------------------------------------- */
              const rewardManagerAddress = await this.farming.farmingRange.rewardManager();

              const mintedRewardPhase1 = INITIAL_BONUS_REWARD_PER_BLOCK.mul(
                this.farming.mockedBlock.add(29).sub(this.farming.mockedBlock.add(19)),
              );
              const mintedRewardPhase2 = INITIAL_BONUS_REWARD_PER_BLOCK.add(parseEther("100")).mul(
                this.farming.mockedBlock.add(39).sub(this.farming.mockedBlock.add(29)),
              );

              const mintedReward = mintedRewardPhase1.add(mintedRewardPhase2);
              // mint reward token to Deployer (when add rewardInfo)
              await this.farming.rewardTokenAsDeployer.mint(this.signers.admin.address, mintedReward);

              /* ---------------- Create farming campaign and reward phase ---------------- */

              // this scenario occurred between block #(mockedBlock+19)-..#(mockedBlock+39)
              await this.farming.farmingRangeAsDeployer.addCampaignInfo(
                this.farming.stakingToken.address,
                this.farming.rewardToken.address,
                this.farming.mockedBlock.add(19),
              );

              // Add phase 1
              // Start @block number #(mockedBlock+19)
              // End @block number #(mockedBlock+29)
              // Reward per block: 100
              await this.farming.farmingRangeAsDeployer.addRewardInfo(
                0,
                this.farming.mockedBlock.add(29),
                INITIAL_BONUS_REWARD_PER_BLOCK,
              );

              // Add phase 1
              // Start @block number #(mockedBlock+29)
              // End @block number #(mockedBlock+39)
              // Reward per block: 200
              await this.farming.farmingRangeAsDeployer.addRewardInfo(
                0,
                this.farming.mockedBlock.add(39),
                INITIAL_BONUS_REWARD_PER_BLOCK.add(parseEther("100")), // 200 reward per block
              );

              /* ---------------------- Get initial contract balances --------------------- */

              const rewardManagerInitialBalance = await this.farming.rewardToken.balanceOf(rewardManagerAddress);
              const farmingRangeInitialBalance = await this.farming.rewardToken.balanceOf(
                this.farming.farmingRange.address,
              );

              /* -------------------------------------------------------------------------- */
              /*                      Setup Blob, Alice and Cat account                     */
              /* -------------------------------------------------------------------------- */

              // mint staking token to cat, bob & alice
              await this.farming.stakingTokenAsDeployer.mint(this.signers.feeTo.address, parseEther("100"));
              await this.farming.stakingTokenAsDeployer.mint(this.signers.user.address, parseEther("100"));
              await this.farming.stakingTokenAsDeployer.mint(this.signers.user2.address, parseEther("100"));

              // cat, bob & alice approve farming range
              await this.farming.stakingTokenAsBob.approve(this.farming.farmingRange.address, parseEther("100"));
              await this.farming.stakingTokenAsAlice.approve(this.farming.farmingRange.address, parseEther("100"));
              await this.farming.stakingTokenAsCat.approve(this.farming.farmingRange.address, parseEther("100"));

              /* --------------------------- Alice interactions --------------------------- */

              // Alice deposit @block number #(mockedBlock+11)
              await this.farming.farmingRangeAsAlice.deposit(constants.Zero, parseEther("100"));

              // advance to block 21 to withdraw
              await advanceBlockTo(this.farming.mockedBlock.add(21).toNumber());
              await this.farming.farmingRangeAsAlice.withdraw(constants.Zero, parseEther("100"));

              // Alice should receive some rewards
              // (22 - 19) * 100 = 300
              const aliceWithdraw = await this.farming.rewardToken.balanceOf(this.signers.user.address);
              expect(aliceWithdraw).to.eq(parseEther("300"));

              /* ---------------------------- Bob interactions ---------------------------- */

              // advance to block 25 to deposit
              await advanceBlockTo(this.farming.mockedBlock.add(25).toNumber());
              // Bob deposit @block number #(mockedBlock+25)
              await this.farming.farmingRangeAsBob.deposit(constants.Zero, parseEther("100"));
              // Bob deposit @block number #(mockedBlock+26)
              await this.farming.farmingRangeAsBob.withdraw(constants.Zero, parseEther("100"));

              // Bob should receive some rewards
              // (26 - 25) * 100 = 100
              const bobWithdraw = await this.farming.rewardToken.balanceOf(this.signers.feeTo.address);
              expect(bobWithdraw).to.eq(parseEther("100"));

              /* ---------------------------- Cat interactions ---------------------------- */

              // advance to block 33 to withdraw
              await advanceBlockTo(this.farming.mockedBlock.add(33).toNumber());
              // Alice deposit @block number #(mockedBlock+33)
              await this.farming.farmingRangeAsCat.deposit(constants.Zero, parseEther("100"));
              // advance to block 37 to withdraw
              await advanceBlockTo(this.farming.mockedBlock.add(37).toNumber());
              await this.farming.farmingRangeAsCat.withdraw(constants.Zero, parseEther("100"));

              // Alice should receive some rewards
              // (37 - 33) * 200 = 800
              const catWithdraw = await this.farming.rewardToken.balanceOf(this.signers.user2.address);
              expect(catWithdraw).to.eq(parseEther("800"));

              /* -------------------------------------------------------------------------- */
              /*                           Check refunded amounts                           */
              /* -------------------------------------------------------------------------- */

              // the rewards of the Phase 1 should have been transferred to the rewardManager
              // check the RewardManager and FarmingRange balances
              const rewardManagerFinalBalance = await this.farming.rewardToken.balanceOf(rewardManagerAddress);
              const farmingRangeFinalBalance = await this.farming.rewardToken.balanceOf(
                this.farming.farmingRange.address,
              );

              // RewardManager received the rewards between Alice and Bob, and between Bob and Cat
              // Phase 1: phase1Rewards - aliceWithdraw - bobWithdraw
              //        = (29 - 19) * 100 - (22 - 19) * 100 - (26 - 25) * 100
              //        = 1000 - 300 - 100 = 600
              // Phase 2: phase2Rewards - catWithdraw - notElapsedRewards
              //        = (39 - 29) * 200 - (37 - 33) * 200 - (39 - 38) * 200
              //        = 2000 - 800 - 200 = 1000
              // Total = 600 + 1000 = 1600
              expect(rewardManagerFinalBalance.sub(rewardManagerInitialBalance)).to.eq(
                mintedRewardPhase1
                  .sub(aliceWithdraw)
                  .sub(bobWithdraw)
                  .add(mintedRewardPhase2.sub(catWithdraw).sub(parseEther("200"))),
              );
              expect(rewardManagerFinalBalance.sub(rewardManagerInitialBalance)).to.eq(parseEther("1600"));

              // FarmingRange sent the rewards
              // Phase 1: (29 - 19) * 100 = 1000
              // Phase 2: (39 - 29) * 200 - (29 - 38) * 200
              //        = 2000 - 200 = 1800
              // Total = 1000 + 1800 = 2800
              expect(farmingRangeInitialBalance.sub(farmingRangeFinalBalance)).to.eq(
                mintedRewardPhase1.add(mintedRewardPhase2.sub(parseEther("200"))),
              );
              expect(farmingRangeInitialBalance.sub(farmingRangeFinalBalance)).to.eq(parseEther("2800"));
            });
          });
        });
      });
    });
  });
}
