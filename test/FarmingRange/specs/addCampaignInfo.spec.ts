import { expect } from "chai";

export function shouldBehaveLikeAddCampaignInfo() {
  describe("#addCampaignInfo", async function () {
    it("should return a correct campaign info length", async function () {
      let length = await this.farming.farmingRangeAsDeployer.campaignInfoLen();
      expect(length).to.eq(0);
      await this.farming.farmingRangeAsDeployer.addCampaignInfo(
        this.farming.stakingToken.address,
        this.farming.rewardToken.address,
        this.farming.mockedBlock.add(9),
      );
      length = await this.farming.farmingRangeAsDeployer.campaignInfoLen();
      expect(length).to.eq(1);
    });

    it("should revert when startBlock is in the past", async function () {
      await expect(
        this.farming.farmingRangeAsDeployer.addCampaignInfo(
          this.farming.stakingToken.address,
          this.farming.rewardToken.address,
          this.farming.mockedBlock,
        ),
      ).to.be.reverted;
    });
  });
}
