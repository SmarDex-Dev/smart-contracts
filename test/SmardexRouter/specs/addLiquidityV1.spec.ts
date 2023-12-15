import { parseEther } from "ethers/lib/utils";
import { BigNumber, constants } from "ethers";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { unitFixtureSmardexRouter } from "../../fixtures";

export function shouldBehaveLikeAddLiquidityV1(): void {
  context("When gas limit is too low to run the full transaction", function () {
    let addLiquidityRequiredGas: BigNumber;

    beforeEach("", async function () {
      /* -------------------------------------------------------------------------- */
      /*                        Get addLiquidity required gas                       */
      /* -------------------------------------------------------------------------- */

      // Make an addLiquidity call to get the required gas to run the full transaction
      await this.contracts.smardexFactory.setFeeTo(this.contracts.autoSwapper.address);

      // Approves pair tokens
      await this.contracts.token0.approve(this.contracts.smardexRouter.address, constants.MaxUint256);
      await this.contracts.token1.approve(this.contracts.smardexRouter.address, constants.MaxUint256);

      // Get required gas to run the full transaction with enough gas

      const addLiquidityTx = await this.contracts.smardexRouter.addLiquidity(
        {
          tokenA: this.contracts.token0.address,
          tokenB: this.contracts.token1.address,
          amountADesired: parseEther("1"),
          amountBDesired: parseEther("4"),
          amountAMin: 1,
          amountBMin: 1,
          fictiveReserveB: 0,
          fictiveReserveAMin: 0,
          fictiveReserveAMax: 0,
        },
        this.signers.admin.address,
        constants.MaxUint256,
      );

      const receipt = await addLiquidityTx.wait();

      // Store the required gas to run the full transaction
      addLiquidityRequiredGas = receipt.gasUsed;
    });

    it("Call fail when the gasLimit is insufficient to fully run addLiquidity", async function () {
      /* -------------------------------------------------------------------------- */
      /*                               Reload fixtures                              */
      /* -------------------------------------------------------------------------- */

      const { token0, token1, pair } = await loadFixture(unitFixtureSmardexRouter);

      this.contracts.token0 = token0;
      this.contracts.token1 = token1;
      this.contracts.smardexPair = pair;

      /* -------------------------------------------------------------------------- */
      /*                            Custom gasLimit call                            */
      /* -------------------------------------------------------------------------- */

      /* ------------------------------- Setup call ------------------------------- */

      await this.contracts.smardexFactory.setFeeTo(this.contracts.autoSwapper.address);
      // Approves pair tokens (new fixtures)
      await this.contracts.token0.approve(this.contracts.smardexRouter.address, constants.MaxUint256);
      await this.contracts.token1.approve(this.contracts.smardexRouter.address, constants.MaxUint256);

      /* ------------------------------ Check revert ------------------------------ */

      // Using a try catch because `.to.be.reverted` doesn't fetch
      try {
        // Execute call with insufficient gas to run _feeToSwap, but enough for call the rest

        await (
          await this.contracts.smardexRouter.addLiquidity(
            {
              tokenA: this.contracts.token0.address,
              tokenB: this.contracts.token1.address,
              amountADesired: parseEther("1"),
              amountBDesired: parseEther("4"),
              amountAMin: 1,
              amountBMin: 1,
              fictiveReserveB: 0,
              fictiveReserveAMin: 0,
              fictiveReserveAMax: 0,
            },
            this.signers.admin.address,
            constants.MaxUint256,
            { gasLimit: addLiquidityRequiredGas.mul(97).div(100) },
          )
        ).wait();
      } catch (err) {
        expect((err as Error).toString()).to.eq(
          "Error: Transaction reverted: contract call run out of gas and made the transaction revert",
        );
        expect((err as { stackTrace: string[] }).stackTrace.length).to.be.greaterThan(0);
        return;
      }

      // Throw error if the call didn't fail as expected
      throw new Error("Call did not failed as expected");
    });
  });
}
