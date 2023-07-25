import { expect } from "chai";

export function shouldBehaveLikeUpdateCampaign() {
  describe("#updateCampaign()", async function () {
    it("should reverted since there is no campaign for this id", async function () {
      await expect(this.farming.farmingRangeAsDeployer.updateCampaign(0)).to.be.revertedWith(
        "FarmingRange::_updateCampaign::Campaign id not valid",
      );
    });
  });
}
