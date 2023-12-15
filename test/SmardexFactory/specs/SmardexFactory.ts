import { expect } from "chai";
import { createPair, TEST_ADDRESSES } from "../utils";

import { SmardexFactory, SmardexPair__factory } from "../../../typechain";

export function shouldBehaveLikeSmardexFactory(): void {
  const bytecode: string = SmardexPair__factory.bytecode;

  const ownableMessage: string = "Ownable: caller is not the owner";

  it("createPair", async function () {
    await (this.contracts.smardexFactory as SmardexFactory).closeWhitelist();
    await createPair(TEST_ADDRESSES, this.contracts.smardexFactory, bytecode);
  });

  it("createPair:reverse", async function () {
    await (this.contracts.smardexFactory as SmardexFactory).closeWhitelist();
    await createPair(TEST_ADDRESSES.slice().reverse() as [string, string], this.contracts.smardexFactory, bytecode);
  });

  it("setFeeTo", async function () {
    await expect(
      this.contracts.smardexFactory.connect(this.signers.user).setFeeTo(this.signers.user.address),
    ).to.be.revertedWith(ownableMessage);

    const oldFeeTo = await this.contracts.smardexFactory.feeTo();

    await expect(this.contracts.smardexFactory.setFeeTo(this.signers.admin.address))
      .to.emit(this.contracts.smardexFactory, "FeeToUpdated")
      .withArgs(oldFeeTo, this.signers.admin.address);

    expect(await this.contracts.smardexFactory.feeTo()).to.eq(this.signers.admin.address);
  });
}
