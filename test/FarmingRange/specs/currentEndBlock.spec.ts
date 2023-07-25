import { expect } from "chai";
import { constants } from "ethers";
import { INITIAL_BONUS_REWARD_PER_BLOCK } from "../utils";
import { advanceBlockTo } from "../../helpers/time";

export function shouldBehaveLikeCurrentEndBlock() {
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
        let currentEndBlock = await this.farming.farmingRangeAsDeployer.currentEndBlock(0);
        expect(currentEndBlock).to.eq(this.farming.mockedBlock.add(9));

        await this.farming.farmingRangeAsDeployer.addRewardInfo(
          0,
          this.farming.mockedBlock.add(10),
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
}
