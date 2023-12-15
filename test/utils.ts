import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { ERC20Permit, SmardexPair } from "../typechain";
import { BigNumberish, Signature, BigNumber } from "ethers";
import { constants } from "ethers/lib/ethers";
import { splitSignature } from "ethers/lib/utils";
import { ethers } from "hardhat";
import { ADDRESS_100 } from "./constants";

export function getSwapEncodedData(payer: string, path: string): string {
  return ethers.utils.AbiCoder.prototype.encode(["tuple(bytes,address)"], [[path, payer]]);
}

export async function getPermitSignature(
  signer: SignerWithAddress,
  token: ERC20Permit | SmardexPair,
  spender: string,
  value: BigNumberish = constants.MaxUint256,
  deadline = constants.MaxUint256,
  permitConfig?: { nonce?: BigNumberish; name?: string; chainId?: number; version?: string },
): Promise<Signature> {
  const [nonce, name, version, chainId] = await Promise.all([
    permitConfig?.nonce ?? token.nonces(signer.address),
    permitConfig?.name ?? token.name(),
    permitConfig?.version ?? "1",
    permitConfig?.chainId ?? signer.getChainId(),
  ]);

  return splitSignature(
    await signer._signTypedData(
      {
        name,
        version,
        chainId,
        verifyingContract: token.address,
      },
      {
        Permit: [
          {
            name: "owner",
            type: "address",
          },
          {
            name: "spender",
            type: "address",
          },
          {
            name: "value",
            type: "uint256",
          },
          {
            name: "nonce",
            type: "uint256",
          },
          {
            name: "deadline",
            type: "uint256",
          },
        ],
      },
      {
        owner: signer.address,
        spender,
        value,
        nonce,
        deadline,
      },
    ),
  );
}

/**
 * @dev Return the log in base 2, rounded down, of a positive value.
 * Returns 0 if given 0.
 */
function log2(value: BigNumber): BigNumber {
  let result = constants.Zero;
  if (value.shr(128).gt(0)) {
    // eslint-disable-next-line no-param-reassign
    value = value.shr(128);
    result = result.add(128);
  }
  if (value.shr(64).gt(0)) {
    // eslint-disable-next-line no-param-reassign
    value = value.shr(64);
    result = result.add(64);
  }
  if (value.shr(32).gt(0)) {
    // eslint-disable-next-line no-param-reassign
    value = value.shr(32);
    result = result.add(32);
  }
  if (value.shr(16).gt(0)) {
    // eslint-disable-next-line no-param-reassign
    value = value.shr(16);
    result = result.add(16);
  }
  if (value.shr(8).gt(0)) {
    // eslint-disable-next-line no-param-reassign
    value = value.shr(8);
    result = result.add(8);
  }
  if (value.shr(4).gt(0)) {
    // eslint-disable-next-line no-param-reassign
    value = value.shr(4);
    result = result.add(4);
  }
  if (value.shr(2).gt(0)) {
    // eslint-disable-next-line no-param-reassign
    value = value.shr(2);
    result = result.add(2);
  }
  if (value.shr(1).gt(0)) {
    result = result.add(1);
  }
  return result;
}

/**
 * @dev Returns the square root of a number. If the number is not a perfect square, the value is rounded down.
 *
 * Inspired by Henry S. Warren, Jr.'s "Hacker's Delight" (Chapter 11).
 */
export function sqrt(a: BigNumber): BigNumber {
  if (a.eq(constants.Zero)) {
    return constants.Zero;
  }

  // For our first guess, we get the biggest power of 2 which is smaller than the square root of the target.
  //
  // We know that the "msb" (most significant bit) of our target number `a` is a power of 2 such that we have
  // `msb(a) <= a < 2*msb(a)`. This value can be written `msb(a)=2**k` with `k=log2(a)`.
  //
  // This can be rewritten `2**log2(a) <= a < 2**(log2(a) + 1)`
  // → `sqrt(2**k) <= sqrt(a) < sqrt(2**(k+1))`
  // → `2**(k/2) <= sqrt(a) < 2**((k+1)/2) <= 2**(k/2 + 1)`
  //
  // Consequently, `2**(log2(a) / 2)` is a good first approximation of `sqrt(a)` with at least 1 correct bit.
  let result = constants.One.shl(log2(a).div(2).toNumber());

  // At this point `result` is an estimation with one bit of precision. We know the true value is a uint128,
  // since it is the square root of a uint256. Newton's method converges quadratically (precision doubles at
  // every iteration). We thus need at most 7 iteration to turn our partial result with one bit of precision
  // into the expected uint128 result.
  result = result.add(a.div(result)).shr(1);
  result = result.add(a.div(result)).shr(1);
  result = result.add(a.div(result)).shr(1);
  result = result.add(a.div(result)).shr(1);
  result = result.add(a.div(result)).shr(1);
  result = result.add(a.div(result)).shr(1);
  result = result.add(a.div(result)).shr(1);
  return result.lt(a.div(result)) ? result : a.div(result);
}

export async function latestBlockNumberL2Arbitrum(): Promise<BigNumber> {
  const arbSysCoreFactory = await ethers.getContractFactory("ArbSysCoreTest");
  const arbSysCoreTest = arbSysCoreFactory.attach(ADDRESS_100);
  return await arbSysCoreTest.arbBlockNumber();
}
