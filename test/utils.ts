import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { ERC20Permit, SmardexPair } from "../typechain";
import { BigNumberish, ethers, Signature } from "ethers";
import { constants } from "ethers/lib/ethers";
import { splitSignature } from "ethers/lib/utils";

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

export function getCurrentTimestampInSecond() {
  return Math.floor(Date.now() / 1000);
}
