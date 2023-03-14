import { expect } from "chai";
import { parseEther } from "ethers/lib/utils";
import { parseShare, SMARDEX_ADMIN_BALANCE, SMARDEX_USER_BALANCE } from "../utils";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { ERC20Permit, FarmingRange, Staking } from "../../../typechain";

export function shouldBehaveLikeDeposit(): void {
  let admin: SignerWithAddress;
  let user: SignerWithAddress;
  let staking: Staking;
  let sdex: ERC20Permit;
  let farming: FarmingRange;

  beforeEach(async function () {
    ({ admin, user } = this.signers);
    ({ staking, farming, smardexToken: sdex } = this.contracts);

    await staking.initializeFarming();
  });

  it("can deposit multiple time and get the same exchange rate", async function () {
    //deposit 10
    await expect(staking.deposit(parseEther("10")))
      .to.emit(staking, "Deposit")
      .withArgs(admin.address, parseEther("10"), parseShare(parseEther("10")));

    expect(await staking.balanceOf(admin.address)).to.eq(0);
    expect(await staking.balanceOf(farming.address)).to.eq(1);
    expect(await sdex.balanceOf(staking.address)).to.eq(parseEther("10"));
    expect(await sdex.balanceOf(admin.address)).to.eq(SMARDEX_ADMIN_BALANCE.sub(parseEther("10")));
    expect((await staking.userInfo(admin.address)).shares).to.be.eq(parseShare(parseEther("10")));

    //deposit 20
    await expect(staking.deposit(parseEther("20")))
      .to.emit(staking, "Deposit")
      .withArgs(admin.address, parseEther("20"), parseShare(parseEther("20")));
    expect(await staking.balanceOf(farming.address)).to.eq(1);
    expect(await sdex.balanceOf(admin.address)).to.eq(SMARDEX_ADMIN_BALANCE.sub(parseEther("30")));
    expect((await staking.userInfo(admin.address)).shares).to.be.eq(parseShare(parseEther("30")));

    //deposit 30
    await expect(staking.deposit(parseEther("30")))
      .to.emit(staking, "Deposit")
      .withArgs(admin.address, parseEther("30"), parseShare(parseEther("30")));
    expect(await staking.balanceOf(farming.address)).to.eq(1);
    expect(await sdex.balanceOf(admin.address)).to.eq(SMARDEX_ADMIN_BALANCE.sub(parseEther("60")));
    expect((await staking.userInfo(admin.address)).shares).to.be.eq(parseShare(parseEther("60")));
  });

  it("more tokens in pool decrease the amount of shares to receive", async function () {
    await sdex.transfer(staking.address, parseEther("10"));

    await staking.connect(user).deposit(parseEther("10"));
    expect(await staking.balanceOf(user.address)).to.eq(0);
    expect(await staking.balanceOf(farming.address)).to.eq(1);
    expect(await sdex.balanceOf(user.address)).to.eq(SMARDEX_USER_BALANCE.sub(parseEther("10")));
    expect((await staking.userInfo(user.address)).shares).to.be.eq(parseShare(parseEther("10")));

    // 10 SDEX deposit  / (20 SDEX balance / 10 current shares) = 5 new shares
    await staking.connect(user).deposit(parseEther("10"));
    expect((await staking.userInfo(user.address)).shares).to.be.eq(parseShare(parseEther("15")));

    await sdex.transfer(staking.address, parseEther("30"));

    // 10 SDEX deposit  / (60 SDEX balance / 15 current shares) = 2.5 new shares
    await staking.connect(user).deposit(parseEther("10"));
    expect((await staking.userInfo(user.address)).shares).to.be.eq(parseShare(parseEther("17.5")));
  });

  it("revert when no token amount", async function () {
    await expect(staking.deposit(0)).to.be.revertedWith("Staking::deposit::can't deposit zero token");
  });

  it("check all users can deposit and receive share even with low deposit ", async function () {
    await sdex.transfer(staking.address, parseEther("1"));
    await staking.deposit(2);
    await staking.connect(user).deposit(1);

    expect((await staking.userInfo(admin.address)).shares).to.be.gt(0);
    expect((await staking.userInfo(user.address)).shares).to.be.gt(0);
  });
}
