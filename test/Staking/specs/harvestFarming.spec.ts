import { advanceBlockTo } from "../../helpers/time";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { parseEther } from "ethers/lib/utils";

export function shouldBehaveLikeHarvestFarming(): void {
  beforeEach(async function () {
    await this.contracts.staking.initializeFarming();
  });

  it("should harvest SDEX in farming pool", async function () {
    await this.contracts.staking.harvestFarming();
    expect(await this.contracts.smardexTokenTest.balanceOf(this.contracts.staking.address)).to.be.eq(0);

    const startFarmingBlock: BigNumber = this.misc.startBlock;
    //reward start block 8 with 1 each block
    await advanceBlockTo(startFarmingBlock.add(9).toNumber());

    await this.contracts.staking.harvestFarming();
    expect(await this.contracts.smardexTokenTest.balanceOf(this.contracts.staking.address)).to.be.eq(parseEther("2"));

    //reward start block 8 with 1 each block then 2 per block at block 11 so 3 + 5 * 2
    await advanceBlockTo(startFarmingBlock.add(15).toNumber());

    await this.contracts.staking.harvestFarming();
    expect(await this.contracts.smardexTokenTest.balanceOf(this.contracts.staking.address)).to.be.eq(
      parseEther("2").add(parseEther("11")),
    );
  });
}
