import { expect } from "chai";
import { BigNumber, constants } from "ethers";
import { parseEther } from "ethers/lib/utils";

import {
  ERC20Permit,
  FarmingRange__factory,
  RewardManagerTest,
  RewardManagerTestL2,
  RewardManagerTestL2Arbitrum,
  TetherToken,
} from "../../../typechain";

import { INITIAL_BONUS_REWARD_PER_BLOCK } from "../../FarmingRange/utils";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { ethers } from "hardhat";
import { latestBlockNumber } from "../../helpers/time";

export function shouldBehaveLikeRewardManager() {
  let admin: SignerWithAddress;
  let rewardManagerTest: RewardManagerTest | RewardManagerTestL2 | RewardManagerTestL2Arbitrum;
  let smardexToken: ERC20Permit;
  let startBlock: BigNumber;
  let tether: TetherToken;

  beforeEach(async function () {
    ({ admin } = this.signers);
    ({ rewardManagerTest, smardexToken, tether } = this.contracts);
    ({ startBlock } = this.misc);
  });

  describe("Constructor and init", async function () {
    it("should have deployed address for Farming with owner set", async function () {
      const farmingAddress = await rewardManagerTest.farming();
      expect(farmingAddress).to.not.eq(constants.AddressZero);
      const farmingContract = FarmingRange__factory.connect(farmingAddress, admin);
      expect(await farmingContract.owner()).to.eq(admin.address);
    });
    it("should not deploy when start farming parameter is before current block", async function () {
      const factory = await ethers.getContractFactory("RewardManagerTest");
      await expect(factory.deploy(admin.address, smardexToken.address, 0, { gasLimit: 10000000 })).to.be.revertedWith(
        "RewardManager:start farming is in the past",
      );
    });
    context("When reward Manager is a contract", function () {
      it("should be able to add reward info and approve reward tokens on reward Manager", async function () {
        const farmingAddress = await rewardManagerTest.farming();
        const farmingContract = FarmingRange__factory.connect(farmingAddress, admin);
        await smardexToken.transfer(rewardManagerTest.address, parseEther("10000"));

        const balance = await smardexToken.balanceOf(rewardManagerTest.address);

        expect((await farmingContract.campaignInfo(0)).rewardToken).to.eq(smardexToken.address);

        // add the first reward info
        expect(await smardexToken.allowance(rewardManagerTest.address, farmingContract.address)).to.eq(0);
        await farmingContract.addRewardInfo(0, startBlock.add(11), INITIAL_BONUS_REWARD_PER_BLOCK);
        //If allowance is more than 0 then resetAllowance worked
        expect(await smardexToken.allowance(rewardManagerTest.address, farmingContract.address)).to.eq(
          constants.MaxUint256,
        );
        // and then reward info added should work smoothly
        await farmingContract.addRewardInfo(0, startBlock.add(20), INITIAL_BONUS_REWARD_PER_BLOCK.add(1));
        //and balance should be diminished on rewardManager
        const balance_after = await smardexToken.balanceOf(rewardManagerTest.address);
        expect(balance_after).to.be.lt(balance);
      });

      it("should be able to call resetAllowance for the token rewarded in a campaign and set the allowance to max", async function () {
        const farmingAddress = await rewardManagerTest.farming();
        const farmingContract = FarmingRange__factory.connect(farmingAddress, admin);

        expect(await smardexToken.allowance(rewardManagerTest.address, farmingContract.address)).to.eq(0);

        await rewardManagerTest.resetAllowance(0);
        expect(await smardexToken.allowance(rewardManagerTest.address, farmingContract.address)).to.eq(
          constants.MaxUint256,
        );
      });
      it("should be able to call resetAllowance for the token rewarded in a campaign, with allowance not 0 and set the allowance to max", async function () {
        const farmingAddress = await rewardManagerTest.farming();
        const farmingContract = FarmingRange__factory.connect(farmingAddress, admin);

        await rewardManagerTest.setAllowance(smardexToken.address, 10);
        expect(await smardexToken.allowance(rewardManagerTest.address, farmingContract.address)).to.eq(10);

        await rewardManagerTest.resetAllowance(0);
        expect(await smardexToken.allowance(rewardManagerTest.address, farmingContract.address)).to.eq(
          constants.MaxUint256,
        );
      });

      it("should revert when calling resetAllowance to an non existent campaign id", async function () {
        await expect(rewardManagerTest.resetAllowance(1)).to.revertedWith("RewardManager:campaignId:wrong campaign ID");
      });
    });
    context("When reward Manager does not have reward tokens", function () {
      it("should be able to add reward info and approve reward tokens on reward Manager", async function () {
        const farmingAddress = await rewardManagerTest.farming();
        const farmingContract = FarmingRange__factory.connect(farmingAddress, admin);

        expect((await farmingContract.campaignInfo(0)).rewardToken).to.eq(smardexToken.address);
        // we dont have tokens !
        await expect(
          farmingContract.addRewardInfo(0, startBlock.add(11), INITIAL_BONUS_REWARD_PER_BLOCK),
        ).to.be.reverted;
      });
    });
    it("should have reward Manager in farming contract", async function () {
      const farmingAddress = await rewardManagerTest.farming();
      expect(farmingAddress).to.not.eq(constants.AddressZero);
      const farmingContract = FarmingRange__factory.connect(farmingAddress, admin);
      expect(await farmingContract.rewardManager()).to.eq(rewardManagerTest.address);
    });

    context("When tether is a reward token", function () {
      it("should be able to call resetAllowance when allowance is 0 and set the allowance to max", async function () {
        const farmingAddress = await rewardManagerTest.farming();
        const farmingContract = FarmingRange__factory.connect(farmingAddress, admin);

        await farmingContract.addCampaignInfo(
          smardexToken.address,
          tether.address,
          (await latestBlockNumber()).add(100),
        );

        expect(await tether.allowance(rewardManagerTest.address, farmingContract.address)).to.eq(0);

        await rewardManagerTest.resetAllowance(1);
        expect(await tether.allowance(rewardManagerTest.address, farmingContract.address)).to.eq(constants.MaxUint256);
      });

      it("should be able to call resetAllowance when allowance is not 0 and set the allowance to max", async function () {
        const farmingAddress = await rewardManagerTest.farming();
        const farmingContract = FarmingRange__factory.connect(farmingAddress, admin);

        await farmingContract.addCampaignInfo(
          smardexToken.address,
          tether.address,
          (await latestBlockNumber()).add(100),
        );

        await rewardManagerTest.setAllowance(tether.address, 10);
        expect(await tether.allowance(rewardManagerTest.address, farmingContract.address)).to.eq(10);

        await rewardManagerTest.resetAllowance(1);
        expect(await tether.allowance(rewardManagerTest.address, farmingContract.address)).to.eq(constants.MaxUint256);
      });
    });
  });
}
