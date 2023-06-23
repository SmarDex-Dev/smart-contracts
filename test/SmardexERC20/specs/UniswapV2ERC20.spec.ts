import { expect } from "chai";
import { defaultAbiCoder, keccak256, parseEther, toUtf8Bytes } from "ethers/lib/utils";
import { constants } from "ethers/lib/ethers";
import { getPermitSignature } from "../../utils";
import hre from "hardhat";

const TOTAL_SUPPLY = parseEther("10000");
const TEST_AMOUNT = parseEther("10");

export function shouldBehaveLikeUniswapV2ERC20(): void {
  it("name, symbol, decimals, totalSupply, balanceOf, DOMAIN_SEPARATOR, PERMIT_TYPEHASH", async function () {
    const name = await this.contracts.smardexToken.name();
    expect(name).to.eq("SmarDex LP-Token");
    expect(await this.contracts.smardexToken.symbol()).to.eq("SDEX-LP");
    expect(await this.contracts.smardexToken.decimals()).to.eq(18);
    expect(await this.contracts.smardexToken.totalSupply()).to.eq(TOTAL_SUPPLY);
    expect(await this.contracts.smardexToken.balanceOf(this.signers.admin.address)).to.eq(TOTAL_SUPPLY);
    expect(await this.contracts.smardexToken.DOMAIN_SEPARATOR()).to.eq(
      keccak256(
        defaultAbiCoder.encode(
          ["bytes32", "bytes32", "bytes32", "uint256", "address"],
          [
            keccak256(
              toUtf8Bytes("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
            ),
            keccak256(toUtf8Bytes(name)),
            keccak256(toUtf8Bytes("1")),
            hre.network.config.chainId,
            this.contracts.smardexToken.address,
          ],
        ),
      ),
    );
  });

  it("approve", async function () {
    await expect(this.contracts.smardexToken.approve(this.signers.user.address, TEST_AMOUNT))
      .to.emit(this.contracts.smardexToken, "Approval")
      .withArgs(this.signers.admin.address, this.signers.user.address, TEST_AMOUNT);
    expect(await this.contracts.smardexToken.allowance(this.signers.admin.address, this.signers.user.address)).to.eq(
      TEST_AMOUNT,
    );
  });

  it("transfer", async function () {
    await expect(this.contracts.smardexToken.transfer(this.signers.user.address, TEST_AMOUNT))
      .to.emit(this.contracts.smardexToken, "Transfer")
      .withArgs(this.signers.admin.address, this.signers.user.address, TEST_AMOUNT);
    expect(await this.contracts.smardexToken.balanceOf(this.signers.admin.address)).to.eq(
      TOTAL_SUPPLY.sub(TEST_AMOUNT),
    );
    expect(await this.contracts.smardexToken.balanceOf(this.signers.user.address)).to.eq(TEST_AMOUNT);
  });

  it("transfer:fail", async function () {
    await expect(this.contracts.smardexToken.transfer(this.signers.user.address, TOTAL_SUPPLY.add(1))).to.be.reverted; // ds-math-sub-underflow
    await expect(this.contracts.smardexToken.connect(this.signers.user).transfer(this.signers.admin.address, 1)).to.be
      .reverted; // ds-math-sub-underflow
  });

  it("transferFrom", async function () {
    await this.contracts.smardexToken.approve(this.signers.user.address, TEST_AMOUNT);
    await expect(
      this.contracts.smardexToken
        .connect(this.signers.user)
        .transferFrom(this.signers.admin.address, this.signers.user.address, TEST_AMOUNT),
    )
      .to.emit(this.contracts.smardexToken, "Transfer")
      .withArgs(this.signers.admin.address, this.signers.user.address, TEST_AMOUNT);
    expect(await this.contracts.smardexToken.allowance(this.signers.admin.address, this.signers.user.address)).to.eq(0);
    expect(await this.contracts.smardexToken.balanceOf(this.signers.admin.address)).to.eq(
      TOTAL_SUPPLY.sub(TEST_AMOUNT),
    );
    expect(await this.contracts.smardexToken.balanceOf(this.signers.user.address)).to.eq(TEST_AMOUNT);
  });

  it("transferFrom:max", async function () {
    await this.contracts.smardexToken.approve(this.signers.user.address, constants.MaxUint256);
    await expect(
      this.contracts.smardexToken
        .connect(this.signers.user)
        .transferFrom(this.signers.admin.address, this.signers.user.address, TEST_AMOUNT),
    )
      .to.emit(this.contracts.smardexToken, "Transfer")
      .withArgs(this.signers.admin.address, this.signers.user.address, TEST_AMOUNT);
    expect(await this.contracts.smardexToken.allowance(this.signers.admin.address, this.signers.user.address)).to.eq(
      constants.MaxUint256,
    );
    expect(await this.contracts.smardexToken.balanceOf(this.signers.admin.address)).to.eq(
      TOTAL_SUPPLY.sub(TEST_AMOUNT),
    );
    expect(await this.contracts.smardexToken.balanceOf(this.signers.user.address)).to.eq(TEST_AMOUNT);
  });

  it("permit", async function () {
    const value = 123;

    const { v, r, s } = await getPermitSignature(
      this.signers.admin,
      this.contracts.smardexToken,
      this.signers.user.address,
      value,
    );

    expect(await this.contracts.smardexToken.allowance(this.signers.admin.address, this.signers.user.address)).to.be.eq(
      0,
    );
    await this.contracts.smardexToken.permit(
      this.signers.admin.address,
      this.signers.user.address,
      value,
      constants.MaxUint256,
      v,
      r,
      s,
    );
    expect(await this.contracts.smardexToken.allowance(this.signers.admin.address, this.signers.user.address)).to.be.eq(
      value,
    );
  });
}
