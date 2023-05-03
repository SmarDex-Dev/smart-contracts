import { advanceBlockTo } from "../../helpers/time";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { parseEther } from "ethers/lib/utils";
import { parseShare } from "../utils";

export function shouldBehaveLikeSharesToTokens(): void {
  beforeEach(async function () {
    await this.contracts.staking.initializeFarming();
  });

  it("check values", async function () {
    expect(await this.contracts.staking.sharesToTokens(parseShare(parseEther("10")))).to.be.eq(parseEther("10"));
    await this.contracts.staking.deposit(parseEther("10"));
    expect(await this.contracts.staking.sharesToTokens(parseShare(parseEther("10")))).to.be.eq(parseEther("10"));

    await this.contracts.smardexTokenTest.transfer(this.contracts.staking.address, parseEther("5"));
    expect(await this.contracts.staking.sharesToTokens(parseShare(parseEther("10")))).to.be.eq(parseEther("15"));
    expect(await this.contracts.staking.sharesToTokens(parseShare(parseEther("5")))).to.be.eq(parseEther("7.5"));

    const startFarmingBlock: BigNumber = this.misc.startBlock;
    //reward start block 8 with 1 each block
    //current block not included in the math because view function
    await advanceBlockTo(startFarmingBlock.add(9).toNumber());

    expect(await this.contracts.staking.sharesToTokens(parseShare(parseEther("10")))).to.be.eq(parseEther("16"));

    //reward start block 8 with 1 each block then 2 per block at block 11 so 3 + 5 * 2
    await advanceBlockTo(startFarmingBlock.add(15).toNumber());

    expect(await this.contracts.staking.sharesToTokens(parseShare(parseEther("10")))).to.be.eq(parseEther("26"));
  });
}
