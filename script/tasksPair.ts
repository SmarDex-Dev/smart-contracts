import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber, constants, Contract } from "ethers";
import { formatEther, parseEther, parseUnits } from "ethers/lib/utils";
import { readFile } from "fs/promises";
import { HardhatRuntimeEnvironment } from "hardhat/types";

export const makePair = async (
  {
    token0,
    token1,
    mintable,
    random,
    liquidity0,
    liquidity1,
  }: { token0: string; token1: string; mintable?: boolean; random?: boolean; liquidity0?: string; liquidity1?: string },
  hre: HardhatRuntimeEnvironment,
) => {
  const network = await hre.ethers.provider.getNetwork();
  const chainId = network.chainId;
  const waitingConfirmations = chainId !== 1337 ? 4 : 0;

  const signer = (await hre.ethers.getSigners())[0];

  console.log("Making pair or adding liquidity with signer : ", signer.address);

  const tokenAbi = [
    ...(await hre.ethers.getContractAt("SmardexTokenTest", token0)).interface.format("full"),
    {
      type: "function",
      name: "mint",
      constant: false,
      stateMutability: "payable",
      payable: true,
      inputs: [{ type: "uint256", name: "amount" }],
      outputs: [],
    },
  ];
  const token0Contract = new Contract(token0, tokenAbi, signer);
  const token1Contract = new Contract(token1, tokenAbi, signer);

  const decimalsT0 = await getDecimals(token0Contract);
  const decimalsT1 = await getDecimals(token1Contract);
  const values = random
    ? [
        parseUnits(liquidity0 || "100", decimalsT0).mul((10 ** (3 * Math.random()) * Math.random() + 1).toFixed(0)),
        parseUnits(liquidity1 || "100", decimalsT1).mul((10 ** (4 * Math.random()) * Math.random() + 1).toFixed(0)),
      ]
    : [parseUnits(liquidity0 || "100000", decimalsT0), parseUnits(liquidity1 || "100000", decimalsT1)];
  let bal0 = await token0Contract.balanceOf(signer.address);
  let bal1 = await token1Contract.balanceOf(signer.address);
  console.log("Balance tokens ", { balance0: bal0, balance1: bal1 });

  if (mintable && (bal0.lt(values[0]) || bal1.lt(values[1]))) {
    if (bal0.lt(values[0]) && bal1.lt(values[1]))
      await mintTokens(signer.address, token0Contract, values[0], token1Contract, values[1], waitingConfirmations);
    else if (bal0.lt(values[0]))
      await mintTokens(signer.address, token0Contract, values[0], undefined, undefined, waitingConfirmations);
    else if (bal1.lt(values[1]))
      await mintTokens(signer.address, token1Contract, values[1], undefined, undefined, waitingConfirmations);

    bal0 = await token0Contract.balanceOf(signer.address);
    bal1 = await token1Contract.balanceOf(signer.address);
    console.log("Balance tokens after mint", { balance0: bal0, balance1: bal1 });
  }

  const smardexRouterAddress = await getDeployedRouterAddress(hre.network.name);
  const smardexRouter = await hre.ethers.getContractAt("SmardexRouter", smardexRouterAddress);
  await addAllowance(token0Contract, smardexRouter, signer, waitingConfirmations);
  await addAllowance(token1Contract, smardexRouter, signer, waitingConfirmations);

  console.log("Now adding Liquidity : ", values);
  if (bal0.lt(values[0] || bal1.lt(values[1])))
    throw new Error("Not enough balance ! " + bal0.toString() + " / " + bal1.toString());

  // Now we add liquidity, router will take tokens
  const addLiquidity = await smardexRouter.addLiquidity(
    token0,
    token1,
    values[0],
    values[1],
    0,
    0,
    signer.address,
    constants.MaxUint256,
  );
  console.log("addLiquidity Tx hash : ", addLiquidity.hash);
  console.log("Waiting for confirmations...");
  await addLiquidity.wait(waitingConfirmations);
  console.log("Done.");
};

export const removeLiquidity = async (
  { token0, token1, lp }: { token0: string; token1: string; lp?: string },
  hre: HardhatRuntimeEnvironment,
) => {
  const network = await hre.ethers.provider.getNetwork();
  const chainId = network.chainId;
  const waitingConfirmations = chainId !== 1337 ? 4 : 0;

  const signer = (await hre.ethers.getSigners())[0];

  console.log("Making pair or adding liquidity with signer : ", signer.address);

  const pair = await getPair({ token0, token1 }, hre);
  const balanceLP = await pair.balanceOf(signer.address);

  console.log("Balance LP ", formatEther(balanceLP));

  if (balanceLP.lte(0)) throw new Error("You dont have LP on this pair of tokens...");

  const smardexRouterAddress = await getDeployedRouterAddress(hre.network.name);
  const smardexRouter = await hre.ethers.getContractAt("SmardexRouter", smardexRouterAddress);
  await addAllowance(pair, smardexRouter, signer, waitingConfirmations);

  if (!lp) lp = balanceLP.toString();
  console.log("Now removing Liquidity : ", lp);
  if (BigNumber.from(lp).lt(balanceLP)) throw new Error("Not enough balance ! " + balanceLP.toString());

  // Now we add liquidity, router will take tokens
  const removeLiquidity = await smardexRouter.removeLiquidity(
    token0,
    token1,
    lp,
    0,
    0,
    signer.address,
    constants.MaxUint256,
  );
  console.log("removeLiquidity Tx hash : ", removeLiquidity.hash);
  console.log("Waiting for confirmations...");
  await removeLiquidity.wait(waitingConfirmations);
  console.log("Done.");
};

const mintTokens = async (
  to: string,
  token0: Contract,
  liquidity0: BigNumber,
  token1?: Contract,
  liquidity1?: BigNumber,
  wait?: number,
) => {
  let tx0, tx1;
  console.log("token address: ", token0.address, "mint qty:", liquidity0);
  try {
    tx0 = await token0["mint(uint256)"](liquidity0);
  } catch (error: any) {
    // console.error(error.message);
    console.error("Failed to mint(uint256), trying with 'to' param... ");
    tx0 = await token0["mint(address,uint256)"](to, liquidity0);
    console.log("Successfully mint with 'to' param !");
  }
  if (token1) {
    console.log("token address: ", token1.address, "mint qty:", liquidity1);
    try {
      tx1 = await token1["mint(uint256)"](liquidity1);
    } catch (error: any) {
      // console.error(error.message);
      console.error("Failed to mint(uint256), trying with 'to' param... ");
      tx1 = await token1["mint(address,uint256)"](to, liquidity1);
      console.log("Successfully mint with 'to' param !");
    }
  }
  wait && (await Promise.all([tx0.wait(wait), tx1?.wait(wait)]));
};

export const swapPair = async (
  {
    tokenin,
    tokenout,
    amountin,
    amountout,
    random,
    mint,
  }: { tokenin: string; tokenout: string; amountin?: string; amountout?: string; random?: boolean; mint?: boolean },
  hre: HardhatRuntimeEnvironment,
) => {
  if (!amountin && !amountout && !random) throw new Error("Require at least random or amountIn");
  const network = await hre.ethers.provider.getNetwork();
  const chainId = network.chainId;
  const waitingConfirmations = chainId !== 1337 ? 4 : 0;
  const signer = (await hre.ethers.getSigners())[0];
  console.log("swapping pair with signer : ", signer.address);

  const tokenAbi = [
    ...(await hre.ethers.getContractAt("SmardexTokenTest", tokenin)).interface.format("full"),
    {
      type: "function",
      name: "mint",
      constant: false,
      stateMutability: "payable",
      payable: true,
      inputs: [{ type: "uint256", name: "amount" }],
      outputs: [],
    },
  ];
  const token0Contract = new Contract(tokenin, tokenAbi, signer);

  const smardexRouterAddress = await getDeployedRouterAddress(hre.network.name);
  const smardexRouter = await hre.ethers.getContractAt("SmardexRouter", smardexRouterAddress);

  await addAllowance(token0Contract, smardexRouter, signer, waitingConfirmations);

  const decimals = await getDecimals(token0Contract);
  const amount = random
    ? parseUnits("100", decimals).mul((10 ** (4 * Math.random()) * Math.random() + 1).toFixed(0))
    : parseUnits(amountin || "1000", decimals);
  console.log("Swap amount : ", amount);
  if (mint) await mintTokens(signer.address, token0Contract, amount, undefined, undefined, waitingConfirmations);
  const balance = await token0Contract.balanceOf(signer.address);
  if (amount.gt(balance)) throw new Error("Not enough balance for swap : " + balance.toString());
  const swapTx = await smardexRouter.swapExactTokensForTokensSupportingFeeOnTransferTokens(
    amount,
    amountout || 1,
    [tokenin, tokenout],
    signer.address,
    constants.MaxUint256,
  );
  console.log("Swap Tx hash : ", swapTx.hash);
  console.log("Waiting for confirmations...");
  await swapTx.wait(waitingConfirmations);
  console.log("Done.");
};

const addAllowance = async (
  tokenContract: Contract,
  smardexRouter: Contract,
  signer: SignerWithAddress,
  wait?: number,
) => {
  const allowance0 = await tokenContract.allowance(signer.address, smardexRouter.address);

  if (allowance0.lt(parseEther("1000000000000"))) {
    console.log("Increasing allowance...");
    const approve0 = await tokenContract.approve(smardexRouter.address, constants.MaxUint256);
    await approve0.wait(wait);
  } else console.log("Allowance is enough.");
};

const getDecimals = async (tokenContract: Contract) => {
  let decimals = 0; // if the function "decimal" does not exist on the token, consider decimals = 0
  try {
    decimals = await tokenContract.decimals();
    return decimals;
  } catch (e) {
    return 0;
  }
};

export const getPair = async (
  { token0, token1 }: { token0: string; token1: string },
  hre: HardhatRuntimeEnvironment,
) => {
  const factory = await loadContract("SmardexFactory", hre);
  const pairAddress = (await factory.getPair(token0, token1)) as string;

  if (pairAddress === constants.AddressZero) {
    throw new Error(`Error, pair with tokens ${token0} - ${token1} does not exist`);
  }

  const pair = await hre.ethers.getContractAt("SmardexPair", pairAddress);
  const r = await pair.getReserves();
  const rlf = await pair.getFictiveReserves();

  console.log(
    `token0: ${token0} token1: ${token1} pair: ${pairAddress} ` +
      `r0: ${r.reserve0_} r1: ${r.reserve1_} rlf0: ${rlf.fictiveReserve0_} rlf1: ${rlf.fictiveReserve1_}`,
  );

  return pair;
};

async function loadContract(contractName: string, hre: HardhatRuntimeEnvironment): Promise<Contract> {
  let contractAdr: string;

  if (hre.network.name === "hardhat") {
    const contractDeployer = await hre.deployments.get(contractName);
    contractAdr = contractDeployer.address;
  } else {
    try {
      contractAdr = (await import(`../deployments/${hre.network.name}/${contractName}.json`)).address;
    } catch (e) {
      throw new Error(
        `Error while fetching addresses, maybe you didn't deployed the ${contractName} on the network '${hre.network.name}' ?`,
      );
    }
  }

  return await hre.ethers.getContractAt(contractName, contractAdr);
}

const getDeployedRouterAddress = async (networkName: string): Promise<string> => {
  const deploymentJsonFile =
    networkName !== "unknown" &&
    (await readFile(
      __dirname + "/../deployments/" + (networkName === "hardhat" ? "localhost" : networkName) + "/SmardexRouter.json",
      { encoding: "utf-8" },
    ));
  const smardexRouterAddress = deploymentJsonFile ? JSON.parse(deploymentJsonFile).address : constants.AddressZero;
  console.log("Router Address : ", smardexRouterAddress);
  return smardexRouterAddress;
};

export const deployToken = async (
  { name, symbol, supply, test }: { name: string; symbol: string; supply: BigNumber; test?: boolean },
  hre: HardhatRuntimeEnvironment,
): Promise<string> => {
  const contractFactory = test
    ? await hre.ethers.getContractFactory("SmardexTokenTest")
    : await hre.ethers.getContractFactory("SmardexToken");
  const deployed = await contractFactory.deploy(name, symbol, supply);
  await deployed.deployed();

  console.log(`successfully deployed ${test ? "test-" : ""}token "${name}" "${symbol}" "${supply}"`);
  console.log(`tx: ${deployed.deployTransaction.hash}`);
  console.log(`contract address: ${deployed.address}`);

  return deployed.address;
};
