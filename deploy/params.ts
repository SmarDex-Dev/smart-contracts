// Set true in case L1 deployment
// with Factory already deployed
export const isV1Pair: boolean = false; // default false

// SPECIFY THIS PARAMETER BEFORE DEPLOYING !!
export function startBlockStaking(): number {
  const startBlock: number = 0;
  if (startBlock === 0) throw new Error("Please set start block in params.ts");
  return startBlock;
}

export default function () {
  // DO NOTHING
}
