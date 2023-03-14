import { advanceBlockTo } from "../../helpers/time";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { parseEther } from "ethers/lib/utils";
import { parseShare } from "../utils";

export function shouldBehaveLikeTokensToShares(): void {
  beforeEach(async function () {
    await this.contracts.staking.initializeFarming();
  });

  it("check values", async function () {
    expect(await this.contracts.staking.tokensToShares(parseEther("10"))).to.be.eq(parseShare(parseEther("10")));
    await this.contracts.staking.deposit(parseEther("10"));
    expect(await this.contracts.staking.tokensToShares(parseEther("10"))).to.be.eq(parseShare(parseEther("10")));

    // tokens * 10 shares  / 20 SDEX
    await this.contracts.smardexToken.transfer(this.contracts.staking.address, parseEther("10"));
    expect(await this.contracts.staking.tokensToShares(parseEther("1"))).to.be.eq(parseShare(parseEther("0.5")));
    expect(await this.contracts.staking.tokensToShares(parseEther("2"))).to.be.eq(parseShare(parseEther("1")));

    const startFarmingBlock: BigNumber = this.misc.startBlock;
    //reward start block 8 with 1 each block
    //current block not included in the math because view function
    await advanceBlockTo(startFarmingBlock.add(9).toNumber());
    expect(await this.contracts.staking.tokensToShares(parseEther("10"))).to.be.eq(
      BigNumber.from("4761904761904761904761904761904761904"),
    );

    //reward start block 8 with 1 each block then 2 per block at block 11 so 3 + 1 * 2
    //10 tokens * 10 shares  / 25 SDEX
    await advanceBlockTo(startFarmingBlock.add(12).toNumber());
    expect(await this.contracts.staking.tokensToShares(parseEther("10"))).to.be.eq(parseShare(parseEther("4")));
  });
}
