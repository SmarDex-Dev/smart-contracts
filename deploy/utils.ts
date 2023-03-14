import { BigNumber, Wallet } from "ethers";
import { parseEther } from "ethers/lib/utils";

export async function saveDeployment(name: string, content: string, saveDotFile: Function) {
  const oldProto = String.prototype.startsWith;

  // overload prototype to bypass startsWith(".") interdiction
  String.prototype.startsWith = () => true;

  await saveDotFile(name + ".json", content);

  String.prototype.startsWith = oldProto;
}

export async function sendEtherTo(qty: BigNumber, adr: string, provider: any) {
  // create signer object
  const hardhatDefaultSigner = new Wallet(
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    provider,
  );

  // send one ether to us
  await hardhatDefaultSigner.sendTransaction({ value: qty, to: adr });
}

export default () => {};
