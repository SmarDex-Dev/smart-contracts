import { expect } from "chai";
import { parseEther } from "ethers/lib/utils";
import { MINIMUM_SHARES, parseShare, SMARDEX_ADMIN_BALANCE, SMARDEX_USER_BALANCE } from "../utils";
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
    ({ staking, smardexTokenTest: sdex } = this.contracts);

    await staking.initializeFarming();
  });

  it("can withdraw multiple time and still get the same exchange rate", async function () {
    await staking.deposit(parseEther("100"));
    expect(await staking.balanceOf(admin.address)).to.eq(0);
    expect(await sdex.balanceOf(admin.address)).to.eq(SMARDEX_ADMIN_BALANCE.sub(parseEther("100")));

    expect((await staking.userInfo(admin.address)).shares).to.be.eq(parseShare(parseEther("100")).sub(MINIMUM_SHARES));

    await expect(staking.withdraw(admin.address, parseShare(parseEther("10"))))
      .to.emit(staking, "Withdraw")
      .withArgs(admin.address, admin.address, parseEther("10"), parseShare(parseEther("10")));

    expect(await sdex.balanceOf(admin.address)).to.eq(SMARDEX_ADMIN_BALANCE.sub(parseEther("90")));
    expect((await staking.userInfo(admin.address)).shares).to.be.eq(parseShare(parseEther("90")).sub(MINIMUM_SHARES));

    await expect(staking.withdraw(admin.address, parseShare(parseEther("50"))))
      .to.emit(staking, "Withdraw")
      .withArgs(admin.address, admin.address, parseEther("50"), parseShare(parseEther("50")));
    expect(await sdex.balanceOf(admin.address)).to.eq(SMARDEX_ADMIN_BALANCE.sub(parseEther("40")));
    expect((await staking.userInfo(admin.address)).shares).to.be.eq(parseShare(parseEther("40")).sub(MINIMUM_SHARES));
  });

  it("more tokens in pool increase the amount of tokens to receive ", async function () {
    await staking.connect(user).deposit(parseEther("100"));

    await staking.connect(user).withdraw(user.address, parseShare(parseEther("10")));
    expect(await sdex.balanceOf(user.address)).to.eq(SMARDEX_USER_BALANCE.sub(parseEther("100")).add(parseEther("10")));
    expect((await staking.userInfo(user.address)).shares).to.be.eq(parseShare(parseEther("90")).sub(MINIMUM_SHARES));

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

  it("check still tokens left after all users have withdrawn their shares ", async function () {
    await staking.deposit(2);
    await staking.connect(user).deposit(1);
    await sdex.transfer(staking.address, parseEther("1"));

    expect(await sdex.balanceOf(admin.address)).to.be.eq(SMARDEX_ADMIN_BALANCE.sub(parseEther("1")).sub(2));

    const sharesAdmin = (await staking.userInfo(admin.address)).shares;
    const totalShares = await staking.totalShares();
    expect(sharesAdmin).to.be.eq(parseShare(BigNumber.from(2)).sub(MINIMUM_SHARES));
    expect(totalShares).to.be.eq(parseShare(BigNumber.from(3)));

    await staking.withdraw(admin.address, parseShare(BigNumber.from(2)).sub(MINIMUM_SHARES));
    expect(await sdex.balanceOf(admin.address)).to.be.eq(
      SMARDEX_ADMIN_BALANCE.sub(parseEther("1")).add(parseEther("1").mul(sharesAdmin).div(totalShares)),
    );
    expect((await staking.userInfo(admin.address)).shares).to.be.eq(0);

    const sharesUser = (await staking.userInfo(user.address)).shares;
    expect(sharesUser).to.be.eq(parseShare(BigNumber.from(1)));
    await staking.connect(user).withdraw(user.address, sharesUser);
    expect(await sdex.balanceOf(user.address)).to.be.eq(
      SMARDEX_USER_BALANCE.add(parseEther("1").mul(sharesUser).div(totalShares)),
    );
    expect(await sdex.balanceOf(staking.address)).to.be.gt(0);
    expect((await staking.userInfo(user.address)).shares).to.be.eq(0);
  });

  it("max possible tokens in pool, deposit and withdraw ", async function () {
    const MAX_POSSIBLE_AMOUNT = parseEther("10000000000");
    await sdex.connect(user).mint(user.address, MAX_POSSIBLE_AMOUNT);
    await staking.connect(user).deposit(MAX_POSSIBLE_AMOUNT);

    const userShares = (await staking.userInfo(user.address)).shares;
    const totalShares = await staking.totalShares();

    // the next expect would revert with
    //  "VM Exception while processing transaction: reverted with panic code 17"
    //  if the code wasn't able to handle 10 billion sdex token with 18 decimals
    expect(await staking.sharesToTokens(userShares)).to.be.eq(
      MAX_POSSIBLE_AMOUNT.mul(parseShare(MAX_POSSIBLE_AMOUNT).sub(MINIMUM_SHARES)).div(parseShare(MAX_POSSIBLE_AMOUNT)),
    );
    expect(userShares).to.be.eq(parseShare(MAX_POSSIBLE_AMOUNT).sub(MINIMUM_SHARES));
    expect(totalShares).to.be.eq(parseShare(MAX_POSSIBLE_AMOUNT));

    // add token
    await sdex.transfer(staking.address, parseEther("10"));
    const stakingBalance = await sdex.balanceOf(staking.address);

    expect(await staking.sharesToTokens(userShares)).to.be.eq(
      stakingBalance.mul(parseShare(MAX_POSSIBLE_AMOUNT).sub(MINIMUM_SHARES)).div(parseShare(MAX_POSSIBLE_AMOUNT)),
    );

    // withdraw
    await staking.connect(user).withdraw(user.address, userShares);

    expect(await sdex.balanceOf(staking.address)).to.be.gt(constants.Zero);
    expect((await staking.userInfo(user.address)).shares).to.be.eq(constants.Zero);
  });

  it("low deposit then max possible tokens in pool, then withdraw ", async function () {
    const MAX_POSSIBLE_AMOUNT = parseEther("10000000000");
    await sdex.connect(user).mint(user.address, MAX_POSSIBLE_AMOUNT);
    await staking.connect(user).deposit(1);
    await staking.connect(user).deposit(MAX_POSSIBLE_AMOUNT.sub(1));

    const userShares = (await staking.userInfo(user.address)).shares;
    const totalShares = await staking.totalShares();

    expect(await staking.sharesToTokens(userShares)).to.be.eq(
      MAX_POSSIBLE_AMOUNT.mul(parseShare(MAX_POSSIBLE_AMOUNT).sub(MINIMUM_SHARES)).div(parseShare(MAX_POSSIBLE_AMOUNT)),
    );
    expect(userShares).to.be.eq(parseShare(MAX_POSSIBLE_AMOUNT).sub(MINIMUM_SHARES));
    expect(totalShares).to.be.eq(parseShare(MAX_POSSIBLE_AMOUNT));

    // add token
    await sdex.transfer(staking.address, parseEther("10"));
    const stakingBalance = await sdex.balanceOf(staking.address);

    expect(await staking.sharesToTokens(userShares)).to.be.eq(
      stakingBalance.mul(parseShare(MAX_POSSIBLE_AMOUNT).sub(MINIMUM_SHARES)).div(parseShare(MAX_POSSIBLE_AMOUNT)),
    );

    // withdraw
    await staking.connect(user).withdraw(user.address, userShares);

    expect(await sdex.balanceOf(staking.address)).to.be.gt(constants.Zero);
    expect((await staking.userInfo(user.address)).shares).to.be.eq(constants.Zero);
  });

  it("Audit test - Shares inflation", async function () {
    const attBalanceBefore = await sdex.balanceOf(user.address);
    const victimBalanceBefore = await sdex.balanceOf(admin.address);
    const depositAmount = parseEther("10");

    //console.log("***** BEFORE ATTACK *****");
    //console.log("Attacker token balance before deposit", attBalanceBefore.toString());
    //console.log("token balance of vault", (await sdex.balanceOf(staking.address)).toString());

    //console.log("***** FIRST DEPOSIT - Attacker *****");
    await staking.connect(user).deposit(1);
    //console.log("Attacker shares", (await staking.userInfo(user.address)).shares);
    //console.log("Attacker token balance after deposit", await sdex.balanceOf(user.address));
    //console.log("Total shares:", await staking.totalShares());

    //console.log("***** FIRST WITHDRAW - Attacker *****");
    await staking.connect(user).withdraw(user.address, (await staking.userInfo(user.address)).shares.sub(1));
    //console.log("Attacker shares", (await staking.userInfo(user.address)).shares);
    //console.log("Attacker token balance after withdraw", await sdex.balanceOf(user.address));
    //console.log("Total shares:", await staking.totalShares());

    //console.log("***** TRANSFER - Attacker *****");
    await sdex.connect(user).transfer(staking.address, depositAmount);
    //console.log("Attacker shares", (await staking.userInfo(user.address)).shares);
    //console.log("Attacker token balance after deposit", await sdex.balanceOf(user.address));
    //console.log("Total shares:", await staking.totalShares());

    //console.log("***** FRONTRAN DEPOSIT - Victim *****");
    await staking.connect(admin).deposit(depositAmount);
    //console.log("Victim shares", (await staking.userInfo(admin.address)).shares);
    //console.log("Total shares:", await staking.totalShares());

    //console.log("***** SECOND WITHDRAW - Attacker *****");
    await staking.connect(user).withdraw(user.address, (await staking.userInfo(user.address)).shares);
    const attBalanceAfter = await sdex.balanceOf(user.address);

    //console.log("Attacker shares", (await staking.userInfo(user.address)).shares);
    //console.log("Attacker token balance after withdraw", attBalanceAfter);
    //console.log("Total shares:", await staking.totalShares());

    expect((await staking.userInfo(admin.address)).shares).to.gt(constants.Zero);
    expect(attBalanceAfter).to.lt(attBalanceBefore.add(depositAmount));
    expect(await sdex.balanceOf(admin.address)).to.eq(victimBalanceBefore.sub(depositAmount));
    await expect(staking.connect(admin).withdraw(admin.address, (await staking.userInfo(admin.address)).shares)).to.not
      .be.reverted;
  });
}
