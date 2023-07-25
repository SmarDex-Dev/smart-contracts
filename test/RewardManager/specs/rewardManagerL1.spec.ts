import { expect } from "chai";
import { constants } from "ethers";
import { RewardManagerTest, RewardManagerTestL2, RewardManagerTestL2Arbitrum } from "../../../typechain";

export function shouldHaveStakingFunction() {
  let rewardManagerTest: RewardManagerTest | RewardManagerTestL2 | RewardManagerTestL2Arbitrum;

  beforeEach(function () {
    ({ rewardManagerTest } = this.contracts);
  });
  describe("Constructor and init L1", async function () {
    it("should have deployed address for Staking", async function () {
      expect(await (rewardManagerTest as RewardManagerTest).staking()).to.not.eq(constants.AddressZero);
    });
  });
}
