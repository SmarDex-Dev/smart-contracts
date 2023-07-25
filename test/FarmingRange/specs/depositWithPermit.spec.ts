import { unitFixtureCampaignWith2rewards, UnitFixtureFarmingRange } from "../../fixtures";
import { INITIAL_BONUS_REWARD_PER_BLOCK } from "../utils";
import { expect } from "chai";
import { parseEther } from "ethers/lib/utils";
import { getPermitSignature } from "../../utils";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { BigNumber, constants } from "ethers";

export function shouldBehaveLikeDepositWithPermit() {
  let admin: SignerWithAddress;
  let alice: SignerWithAddress;
  const permitAmount = parseEther("100");
  describe("#depositWithPermit()", async function () {
    beforeEach(async function () {
      ({ admin, user: alice } = this.signers);
    });

    async function setupTest(
      admin: SignerWithAddress,
      alice: SignerWithAddress,
      permitAmount: BigNumber,
      farming: UnitFixtureFarmingRange,
    ) {
      await unitFixtureCampaignWith2rewards(farming, admin, INITIAL_BONUS_REWARD_PER_BLOCK, expect);
      // mint staking token to alice
      await farming.stakingTokenAsDeployer.mint(alice.address, permitAmount);

      const { v, r, s } = await getPermitSignature(
        alice,
        farming.stakingToken,
        farming.farmingRange.address,
        permitAmount,
      );

      expect(await farming.stakingToken.allowance(alice.address, farming.farmingRange.address)).to.be.eq(0);
      const userInfo = await farming.farmingRangeAsAlice.userInfo(constants.Zero, alice.address);
      expect(userInfo.amount).to.eq(constants.Zero);
      expect(userInfo.rewardDebt).to.eq(constants.Zero);
      return { v, r, s, userInfo };
    }

    it("should deposit with permit", async function () {
      const { v, r, s } = await setupTest(admin, alice, permitAmount, this.farming);

      await this.farming.farmingRangeAsAlice.depositWithPermit(0, permitAmount, false, constants.MaxUint256, v, r, s);

      const userInfo = await this.farming.farmingRangeAsAlice.userInfo(constants.Zero, alice.address);
      expect(userInfo.amount).to.eq(permitAmount);
      expect(userInfo.rewardDebt).to.eq(constants.Zero);
      expect(await this.farming.stakingToken.allowance(alice.address, this.farming.farmingRange.address)).to.be.eq(0);
    });

    it("should revert when user use permit from another user", async function () {
      const { v, r, s } = await setupTest(admin, alice, permitAmount, this.farming);

      await expect(
        this.farming.farmingRangeAsDeployer.depositWithPermit(0, permitAmount, false, constants.MaxUint256, v, r, s),
      ).to.be.reverted;

      const userInfo = await this.farming.farmingRangeAsAlice.userInfo(constants.Zero, alice.address);
      expect(userInfo.amount).to.eq(constants.Zero);
      expect(userInfo.rewardDebt).to.eq(constants.Zero);
      expect(await this.farming.stakingToken.allowance(alice.address, this.farming.farmingRange.address)).to.be.eq(0);
    });

    it("should revert when no permit", async function () {
      //prep work
      await unitFixtureCampaignWith2rewards(this.farming, admin, INITIAL_BONUS_REWARD_PER_BLOCK, expect);
      // mint staking token to alice
      await this.farming.stakingTokenAsDeployer.mint(alice.address, permitAmount);

      await expect(
        this.farming.farmingRangeAsAlice.depositWithPermit(
          0,
          permitAmount,
          false,
          constants.MaxUint256,
          10,
          constants.HashZero,
          constants.HashZero,
        ),
      ).to.be.reverted;

      const userInfo = await this.farming.farmingRangeAsAlice.userInfo(constants.Zero, alice.address);
      expect(userInfo.amount).to.eq(constants.Zero);
      expect(userInfo.rewardDebt).to.eq(constants.Zero);
    });
  });
}
