import { BigNumber } from "ethers";
import { parseEther, parseUnits } from "ethers/lib/utils";

export const CAMPAIGN_COST: BigNumber = parseEther("21");
export const SMARDEX_ADMIN_BALANCE: BigNumber = parseEther("9000").sub(CAMPAIGN_COST);
export const SMARDEX_USER_BALANCE: BigNumber = parseEther("1000");
export const MINIMUM_SHARES: BigNumber = BigNumber.from(1000);

export function parseShare(share: BigNumber): BigNumber {
  return parseUnits(share.toString(), 18);
}
