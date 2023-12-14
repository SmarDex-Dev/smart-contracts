import { expect } from "chai";
import { addRewardsInfos } from "../utils";

export function shouldRevertAtMaxRewardLimitArbitrum() {
  const nbRewardInfo: number = 28589; // 28589 OK -  28590 out of gas

  describe.skip("Max reward info limit Arbitrum", async function () {
    // this transaction is expected to be executed normally
    it("should not revert due of big reward info limit ", async function () {
      // to optimize add reward info without running out of gas
      await addRewardsInfos(
        nbRewardInfo,
        this.farming.farmingRangeAsDeployer,
        this.farming.stakingTokenAsDeployer,
        this.farming.rewardTokenAsDeployer,
        this.farming.mockedBlock,
      );

      await expect(this.farming.farmingRangeAsDeployer.updateCampaign(0)).to.not.be.reverted;
    });

    // this transaction is expected to be reverted out of gas with 1 wei more than above
    it("should revert out of gas due of big reward info limit ", async function () {
      // to optimize add reward info without running out of gas
      await addRewardsInfos(
        nbRewardInfo + 1,
        this.farming.farmingRangeAsDeployer,
        this.farming.stakingTokenAsDeployer,
        this.farming.rewardTokenAsDeployer,
        this.farming.mockedBlock,
      );

      try {
        await this.farming.farmingRangeAsDeployer.updateCampaign(0);
        throw new Error("Not reverted as expected");
      } catch (e: any) {
        expect(e.message).to.be.equal("Transaction ran out of gas");
      }
    });
  });
}
