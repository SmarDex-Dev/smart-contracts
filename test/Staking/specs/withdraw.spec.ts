import { expect } from "chai";
import { parseEther } from "ethers/lib/utils";
import { parseShare, SMARDEX_ADMIN_BALANCE, SMARDEX_USER_BALANCE } from "../utils";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { ERC20Test, Staking } from "../../../typechain";
import { BigNumber, constants } from "ethers";

export function shouldBehaveLikeWithdraw(): void {
  let admin: SignerWithAddress;
  let user: SignerWithAddress;
  let staking: Staking;
  let sdex: ERC20Test;

  beforeEach(async function () {
    ({ admin, user } = this.signers);
    ({ staking, smardexToken: sdex } = this.contracts);

    await staking.initializeFarming();
  });

  it("can withdraw multiple time and still get the same exchange rate", async function () {
    await staking.deposit(parseEther("100"));
    expect(await staking.balanceOf(admin.address)).to.eq(0);
    expect(await sdex.balanceOf(admin.address)).to.eq(SMARDEX_ADMIN_BALANCE.sub(parseEther("100")));

    expect((await staking.userInfo(admin.address)).shares).to.be.eq(parseShare(parseEther("100")));

    await expect(staking.withdraw(admin.address, parseShare(parseEther("10"))))
      .to.emit(staking, "Withdraw")
      .withArgs(admin.address, admin.address, parseEther("10"), parseShare(parseEther("10")));

    expect(await sdex.balanceOf(admin.address)).to.eq(SMARDEX_ADMIN_BALANCE.sub(parseEther("90")));
    expect((await staking.userInfo(admin.address)).shares).to.be.eq(parseShare(parseEther("90")));

    await expect(staking.withdraw(admin.address, parseShare(parseEther("50"))))
      .to.emit(staking, "Withdraw")
      .withArgs(admin.address, admin.address, parseEther("50"), parseShare(parseEther("50")));
    expect(await sdex.balanceOf(admin.address)).to.eq(SMARDEX_ADMIN_BALANCE.sub(parseEther("40")));
    expect((await staking.userInfo(admin.address)).shares).to.be.eq(parseShare(parseEther("40")));
  });

  it("more tokens in pool increase the amount of tokens to receive ", async function () {
    await staking.connect(user).deposit(parseEther("100"));

    await staking.connect(user).withdraw(user.address, parseShare(parseEther("10")));
    expect(await sdex.balanceOf(user.address)).to.eq(SMARDEX_USER_BALANCE.sub(parseEther("100")).add(parseEther("10")));
    expect((await staking.userInfo(user.address)).shares).to.be.eq(parseShare(parseEther("90")));

    await sdex.transfer(staking.address, parseEther("90"));

    //should get 2x more token for the same withdraw
    await staking.connect(user).withdraw(user.address, parseShare(parseEther("10")));
    expect(await sdex.balanceOf(user.address)).to.eq(SMARDEX_USER_BALANCE.sub(parseEther("100")).add(parseEther("30")));
  });

  it("can withdraw token to another address", async function () {
    await staking.deposit(parseEther("100"));

    await expect(staking.withdraw(user.address, parseShare(parseEther("10"))))
      .to.emit(staking, "Withdraw")
      .withArgs(admin.address, user.address, parseEther("10"), parseShare(parseEther("10")));

    expect(await sdex.balanceOf(admin.address)).to.eq(SMARDEX_ADMIN_BALANCE.sub(parseEther("100")));

    expect(await sdex.balanceOf(user.address)).to.eq(SMARDEX_USER_BALANCE.add(parseEther("10")));
  });

  it("revert when no token shares", async function () {
    await expect(staking.withdraw(admin.address, 10)).to.be.revertedWith(
      "Staking::withdraw::can't withdraw more than user shares or zero",
    );

    await expect(staking.withdraw(admin.address, 0)).to.be.revertedWith(
      "Staking::withdraw::can't withdraw more than user shares or zero",
    );
  });

  it("check no tokens left after all users have withdrawn their shares ", async function () {
    await staking.deposit(2);
    await staking.connect(user).deposit(1);
    await sdex.transfer(staking.address, parseEther("1"));

    expect(await sdex.balanceOf(admin.address)).to.be.eq(SMARDEX_ADMIN_BALANCE.sub(parseEther("1")).sub(2));

    await staking.withdraw(admin.address, parseShare(BigNumber.from(2)));
    expect(await sdex.balanceOf(admin.address)).to.be.eq(
      SMARDEX_ADMIN_BALANCE.sub(parseEther("1")).add(BigNumber.from("666666666666666666")),
    );
    expect((await staking.userInfo(admin.address)).shares).to.be.eq(0);

    await staking.connect(user).withdraw(user.address, parseShare(BigNumber.from(1)));
    expect(await sdex.balanceOf(user.address)).to.be.eq(SMARDEX_USER_BALANCE.add(BigNumber.from("333333333333333334")));
    expect(await sdex.balanceOf(staking.address)).to.be.eq(0);
    expect((await staking.userInfo(user.address)).shares).to.be.eq(0);
  });

  it("max possible tokens in pool, deposit and withdraw ", async function () {
    const MAX_POSSIBLE_AMOUNT = parseEther("10000000000");
    await sdex.connect(user).mint(user.address, MAX_POSSIBLE_AMOUNT);
    await staking.connect(user).deposit(MAX_POSSIBLE_AMOUNT);

    const shares = (await staking.userInfo(user.address)).shares;

    // the next expect would revert with
    //  "VM Exception while processing transaction: reverted with panic code 17"
    //  if the code wasn't able to handle 10 billion sdex token with 18 decimals
    expect(await staking.sharesToTokens(shares)).to.be.eq(MAX_POSSIBLE_AMOUNT);
    expect(shares).to.be.eq(parseShare(MAX_POSSIBLE_AMOUNT));

    // add token
    await sdex.transfer(staking.address, parseEther("10"));

    expect(await staking.sharesToTokens(shares)).to.be.eq(parseEther("10").add(MAX_POSSIBLE_AMOUNT));

    // withdraw
    await staking.connect(user).withdraw(user.address, shares);

    expect(await sdex.balanceOf(staking.address)).to.eq(constants.Zero);
    expect((await staking.userInfo(user.address)).shares).to.be.eq(constants.Zero);
  });
}
