import { expect } from "chai";
import { constants } from "ethers";
import { INITIAL_BONUS_REWARD_PER_BLOCK } from "../utils";
import { advanceBlockTo } from "../../helpers/time";
import { parseEther } from "ethers/lib/utils";

export function shouldBehaveLikeCurrentRewardPerBlock() {
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
        await this.farming.rewardTokenAsDeployer.mint(this.signers.admin.address, mintedReward);
        await this.farming.farmingRangeAsDeployer.addCampaignInfo(
          this.farming.stakingToken.address,
          this.farming.rewardToken.address,
          this.farming.mockedBlock.add(8),
        );
        await this.farming.farmingRangeAsDeployer.addRewardInfo(
          0,
          this.farming.mockedBlock.add(9),
          INITIAL_BONUS_REWARD_PER_BLOCK,
        );
        let currentRewardPerBlock = await this.farming.farmingRangeAsDeployer.currentRewardPerBlock(0);
        expect(currentRewardPerBlock).to.eq(INITIAL_BONUS_REWARD_PER_BLOCK);

        await advanceBlockTo(this.farming.mockedBlock.add(8).toNumber());
        await this.farming.farmingRangeAsDeployer.addRewardInfo(
          0,
          this.farming.mockedBlock.add(10),
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
        await this.farming.rewardTokenAsDeployer.mint(this.signers.admin.address, mintedReward);
        await this.farming.farmingRangeAsDeployer.addCampaignInfo(
          this.farming.stakingToken.address,
          this.farming.rewardToken.address,
          this.farming.mockedBlock.add(8),
        );
        await this.farming.farmingRangeAsDeployer.addRewardInfo(
          0,
          this.farming.mockedBlock.add(9),
          INITIAL_BONUS_REWARD_PER_BLOCK,
        );
        let currentRewardPerBlock = await this.farming.farmingRangeAsDeployer.currentRewardPerBlock(0);
        expect(currentRewardPerBlock).to.eq(INITIAL_BONUS_REWARD_PER_BLOCK);

        await advanceBlockTo(this.farming.mockedBlock.add(8).toNumber());
        await this.farming.farmingRangeAsDeployer.addRewardInfo(
          0,
          this.farming.mockedBlock.add(10),
          INITIAL_BONUS_REWARD_PER_BLOCK.add(parseEther("500")),
        );
        await advanceBlockTo(this.farming.mockedBlock.add(100).toNumber());
        currentRewardPerBlock = await this.farming.farmingRangeAsDeployer.currentRewardPerBlock(0);
        expect(currentRewardPerBlock).to.eq(0);
      });
    });
  });
}
