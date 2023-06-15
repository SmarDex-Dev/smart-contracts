import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { ERC20Permit, Staking } from "../../../typechain";
import { parseEther } from "ethers/lib/utils";
import { getPermitSignature } from "../../utils";
import { expect } from "chai";
import { constants } from "ethers";
import { MINIMUM_SHARES, parseShare } from "../utils";

export function shouldBehaveLikeDepositWithPermit(): void {
  let user: SignerWithAddress;
  let staking: Staking;
  let sdex: ERC20Permit;

  const permitAmount = parseEther("10");

  beforeEach(async function () {
    ({ user } = this.signers);
    ({ staking, smardexTokenTest: sdex } = this.contracts);

    await staking.initializeFarming();

    await this.contracts.smardexTokenTest.connect(this.signers.user).approve(this.contracts.staking.address, 0);
  });

  it("should deposit with permit", async function () {
    const { v, r, s } = await getPermitSignature(user, sdex, staking.address, permitAmount);
    expect(await sdex.allowance(user.address, staking.address)).to.be.eq(0);

    await staking.connect(user).depositWithPermit(permitAmount, false, constants.MaxUint256, v, r, s);

    expect(await sdex.allowance(user.address, staking.address)).to.be.eq(0);
    expect((await staking.userInfo(user.address)).shares).to.be.eq(parseShare(permitAmount).sub(MINIMUM_SHARES));
  });

  it("should revert when not the same user", async function () {
    const { v, r, s } = await getPermitSignature(user, sdex, staking.address, permitAmount);
    expect(await sdex.allowance(user.address, staking.address)).to.be.eq(0);

    await expect(staking.depositWithPermit(permitAmount, false, constants.MaxUint256, v, r, s)).to.be.reverted;

    expect(await sdex.allowance(user.address, staking.address)).to.be.eq(0);
    expect((await staking.userInfo(user.address)).shares).to.be.eq(0);
  });

  it("should revert when no permit signature", async function () {
    expect(await sdex.allowance(user.address, staking.address)).to.be.eq(0);

    await expect(
      staking
        .connect(user)
        .depositWithPermit(permitAmount, false, constants.MaxUint256, 10, constants.HashZero, constants.HashZero),
    ).to.be.reverted;

    expect(await sdex.allowance(user.address, staking.address)).to.be.eq(0);
    expect((await staking.userInfo(user.address)).shares).to.be.eq(0);
  });
}
