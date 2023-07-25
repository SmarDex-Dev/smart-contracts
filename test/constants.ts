import { BigNumber, constants } from "ethers/lib/ethers";

export const MAX_UINT128 = constants.Two.pow(128).sub(1);
export const MINIMUM_LIQUIDITY = BigNumber.from("1000");

export const FEES_LP = BigNumber.from("500"); //this is expressed per FEES_BASE
export const FEES_POOL = BigNumber.from("200"); //this is expressed per FEES_BASE
export const FEES_BASE = BigNumber.from("1000000");
export const MAX_FEES = BigNumber.from("100000");

const FEES_TOTAL = FEES_LP.add(FEES_POOL); //this is expressed per FEES_BASE
export const FEES_TOTAL_REVERSED = FEES_BASE.sub(FEES_TOTAL);

export const ADDRESS_DEAD = "0x000000000000000000000000000000000000dEaD";
export const ADDRESS_100 = "0x0000000000000000000000000000000000000064";

export const MAX_BLOCK_DIFF_SECONDS = BigNumber.from(300);

export const PANIC_CODE_ARITHMETIC_UNDERFLOW_OVERFLOW = "0x11";

export const PCT = BigNumber.from("1");
export const BASE = BigNumber.from("10000000000000");
