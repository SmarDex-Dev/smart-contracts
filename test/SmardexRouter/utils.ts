import { ERC20Test, SmardexRouter } from "../../typechain";
import { BigNumber, constants } from "ethers";
import { Context } from "mocha";

export interface MintTestData {
  liquidity_provided_token0: BigNumber;
  liquidity_provided_token1: BigNumber;
  expected_LP_tokens_received?: BigNumber;
  expected_revert_reason?: string;
  force_reserve0_last_fictive?: BigNumber;
  force_reserve1_last_fictive?: BigNumber;
  expected_state_after_mint?: SmardexPairStateTestData;
}

export interface SmardexPairStateTestData {
  reserve0: BigNumber;
  reserve1: BigNumber;
  fictiveReserve0: BigNumber;
  fictiveReserve1: BigNumber;
}

export interface SwapTestData {
  mint_test_data?: MintTestData;
  transfer_amount0?: BigNumber;
  transfer_amount1?: BigNumber;
  amount0_out: BigNumber;
  amount1_out: BigNumber;
  to?: string;
  expected_revert_reason?: string;
  expected_state_after_swap?: SmardexPairStateTestData;
}

export async function WETHPairInitialize(this: Context, WETHPartnerAmount: BigNumber, ETHAmount: BigNumber) {
  await this.contracts.WETHPartner.approve(this.contracts.smardexRouter.address, WETHPartnerAmount);
  await this.contracts.WETH.deposit({ value: ETHAmount });
  await this.contracts.WETH.approve(this.contracts.smardexRouter.address, ETHAmount);
  await this.contracts.smardexRouter.addLiquidity(
    this.contracts.WETHPartner.address,
    this.contracts.WETH.address,
    WETHPartnerAmount,
    ETHAmount,
    1,
    1,
    this.signers.admin.address,
    constants.MaxUint256,
  );
}

export async function addLiquidity(
  token0Amount: BigNumber,
  token1Amount: BigNumber,
  token0: ERC20Test,
  token1: ERC20Test,
  router: SmardexRouter,
  recipientAddress: string,
) {
  await router.addLiquidity(
    token0.address,
    token1.address,
    token0Amount,
    token1Amount,
    1,
    1,
    recipientAddress,
    constants.MaxUint256,
  );
}
