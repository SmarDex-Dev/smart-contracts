import { FarmingRange } from "../../typechain";
import { expect } from "chai";
import { parseEther } from "ethers/lib/utils";

export const INITIAL_BONUS_REWARD_PER_BLOCK = parseEther("100");

export async function checkTotalRewards(farming: FarmingRange) {
  //check totalReward
  const campaignInfoBeforeUpdate = await farming.campaignInfo(0);
  const rewardBefore1 = await farming.campaignRewardInfo(0, 0);
  const rewardBefore2 = await farming.campaignRewardInfo(0, 1);
  expect(campaignInfoBeforeUpdate.totalRewards).to.be.eq(
    rewardBefore1.rewardPerBlock
      .mul(rewardBefore1.endBlock.sub(campaignInfoBeforeUpdate.startBlock))
      .add(rewardBefore2.rewardPerBlock.mul(rewardBefore2.endBlock.sub(rewardBefore1.endBlock))),
  );
}
