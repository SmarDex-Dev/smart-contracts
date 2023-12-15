import { expect } from "chai";
import { parseEther } from "ethers/lib/utils";
import { MINIMUM_SHARES, parseShare, SMARDEX_ADMIN_BALANCE, SMARDEX_USER_BALANCE } from "../utils";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { ERC20Test, Staking } from "../../../typechain";
import { BigNumber, constants } from "ethers";
import { advanceBlockTo } from "../../helpers/time";

export function shouldBehaveLikeEmergencyWithdraw(): void {
  let admin: SignerWithAddress;
  let user: SignerWithAddress;
  let staking: Staking;
  let sdex: ERC20Test;

  const AMOUNT_TOKENS_FOR_ADMIN = parseShare(parseEther("100"))
    .sub(MINIMUM_SHARES)
    .mul(parseEther("100"))
    .div(parseShare(parseEther("100")));
  const AMOUNT_TOKENS_FOR_MINIMUM_SHARES = parseEther("100").sub(AMOUNT_TOKENS_FOR_ADMIN);

  beforeEach(async function () {
    ({ admin, user } = this.signers);
    ({ staking, smardexTokenTest: sdex } = this.contracts);

    await staking.initializeFarming();
  });

  it("can't emergency withdraw multiple time", async function () {
    await staking.deposit(parseEther("100"));
    expect(await staking.balanceOf(admin.address)).to.eq(0);
    expect(await sdex.balanceOf(admin.address)).to.eq(SMARDEX_ADMIN_BALANCE.sub(parseEther("100")));

    expect((await staking.userInfo(admin.address)).shares).to.be.eq(parseShare(parseEther("100")).sub(MINIMUM_SHARES));

    await expect(staking.emergencyWithdraw(admin.address))
      .to.emit(staking, "EmergencyWithdraw")
      .withArgs(
        admin.address,
        admin.address,
        AMOUNT_TOKENS_FOR_ADMIN,
        parseShare(parseEther("100")).sub(MINIMUM_SHARES),
      );

    expect(await sdex.balanceOf(admin.address)).to.eq(SMARDEX_ADMIN_BALANCE.sub(AMOUNT_TOKENS_FOR_MINIMUM_SHARES));
    expect(await sdex.balanceOf(staking.address)).to.eq(AMOUNT_TOKENS_FOR_MINIMUM_SHARES);
    expect((await staking.userInfo(admin.address)).shares).to.be.eq(0);

    await expect(staking.emergencyWithdraw(admin.address)).to.be.revertedWith(
      "Staking::emergencyWithdraw::no shares to withdraw",
    );
  });

  it("should not harvest farming", async function () {
    await staking.deposit(parseEther("100"));

    await advanceBlockTo(this.misc.startBlock.add(100).toNumber());

    await expect(staking.emergencyWithdraw(admin.address))
      .to.emit(staking, "EmergencyWithdraw")
      .withArgs(
        admin.address,
        admin.address,
        AMOUNT_TOKENS_FOR_ADMIN,
        parseShare(parseEther("100")).sub(MINIMUM_SHARES),
      );
    expect(await sdex.balanceOf(admin.address)).to.eq(SMARDEX_ADMIN_BALANCE.sub(AMOUNT_TOKENS_FOR_MINIMUM_SHARES));
    expect(await sdex.balanceOf(staking.address)).to.eq(AMOUNT_TOKENS_FOR_MINIMUM_SHARES);
    expect((await staking.userInfo(admin.address)).shares).to.be.eq(0);
  });

  it("more tokens in pool increase the amount of tokens to receive ", async function () {
    await staking.connect(user).deposit(parseEther("100"));

    await staking.connect(user).withdraw(user.address, parseShare(parseEther("10")));
    expect(await sdex.balanceOf(user.address)).to.eq(SMARDEX_USER_BALANCE.sub(parseEther("100")).add(parseEther("10")));
    expect((await staking.userInfo(user.address)).shares).to.be.eq(parseShare(parseEther("90")).sub(MINIMUM_SHARES));

    await sdex.transfer(staking.address, parseEther("90"));

    //should get 2x more token for the same withdraw
    await staking.connect(user).emergencyWithdraw(user.address);
    expect(await sdex.balanceOf(user.address)).to.eq(
      SMARDEX_USER_BALANCE.add(parseEther("90")).sub(AMOUNT_TOKENS_FOR_MINIMUM_SHARES),
    );
  });

  it("can emergency withdraw token to another address", async function () {
    await staking.deposit(parseEther("100"));

    await expect(staking.emergencyWithdraw(user.address))
      .to.emit(staking, "EmergencyWithdraw")
      .withArgs(
        admin.address,
        user.address,
        AMOUNT_TOKENS_FOR_ADMIN,
        parseShare(parseEther("100")).sub(MINIMUM_SHARES),
      );

    expect(await sdex.balanceOf(admin.address)).to.eq(SMARDEX_ADMIN_BALANCE.sub(parseEther("100")));

    expect(await sdex.balanceOf(user.address)).to.eq(
      SMARDEX_USER_BALANCE.add(parseEther("100")).sub(AMOUNT_TOKENS_FOR_MINIMUM_SHARES),
    );
  });

  it("revert when no token shares", async function () {
    await expect(staking.emergencyWithdraw(admin.address)).to.be.revertedWith(
      "Staking::emergencyWithdraw::no shares to withdraw",
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

    await staking.emergencyWithdraw(admin.address);
    expect(await sdex.balanceOf(admin.address)).to.be.eq(
      SMARDEX_ADMIN_BALANCE.sub(parseEther("1")).add(parseEther("1").mul(sharesAdmin).div(totalShares)),
    );
    expect((await staking.userInfo(admin.address)).shares).to.be.eq(0);

    const sharesUser = (await staking.userInfo(user.address)).shares;
    expect(sharesUser).to.be.eq(parseShare(BigNumber.from(1)));
    await staking.connect(user).emergencyWithdraw(user.address);
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
    await staking.connect(user).emergencyWithdraw(user.address);

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
    await staking.connect(user).emergencyWithdraw(user.address);

    expect(await sdex.balanceOf(staking.address)).to.be.gt(constants.Zero);
    expect((await staking.userInfo(user.address)).shares).to.be.eq(constants.Zero);
  });
}
