import { HardhatRuntimeEnvironment } from "hardhat/types";
import { parseEther } from "ethers/lib/utils";
import { ERC20Test, SmardexRouter, WETH9 } from "../typechain";
import { BigNumber, constants, ContractTransaction } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { FunctionFragment } from "@ethersproject/abi";

interface GasData {
  hop: number;
  gasMin: BigNumber;
  gasMax: BigNumber;
  gasAvg: BigNumber;
}

interface GasFunction {
  swapExactTokensForTokens: GasData[];
  swapTokensForExactTokens: GasData[];
  swapTokensForExactETH: GasData[];
  swapETHForExactTokens: GasData[];
  swapExactETHForTokens: GasData[];
  swapExactTokensForETH: GasData[];
}

const NB_TX = 20;

export async function generateSwapGasCost(args: undefined, hre: HardhatRuntimeEnvironment) {
  const { getContractAt } = hre.ethers;
  const signers = await hre.ethers.getSigners();
  const erc20TestFactory = await hre.ethers.getContractFactory("ERC20Test");

  const routerAddress = await getDeployedAddress(hre, "SmardexRouter");
  const factoryAddress = await getDeployedAddress(hre, "SmardexFactory");
  const wethAddress = await getDeployedAddress(hre, "WETH9");
  const router = await getContractAt("SmardexRouter", routerAddress);
  const factory = await getContractAt("SmardexFactory", factoryAddress);
  const weth = await getContractAt("WETH9", wethAddress);

  await hre.network.provider.request({
    method: "hardhat_reset",
    params: [
      {
        forking: {
          jsonRpcUrl: process.env.URL_ETH_MAINNET,
        },
      },
    ],
  });

  await hre.network.provider.send("hardhat_setBalance", [signers[0].address, "0x52B7D2DCC80CD2E4000000"]);

  const tokens: ERC20Test[] = [];

  for (let i = 0; i < 6; i++) {
    console.log("Generating data with " + i + " hops");
    tokens.push(await erc20TestFactory.deploy(constants.MaxUint256));
    const erc20 = await getContractAt("ERC20Test", tokens[i].address);
    await erc20.connect(signers[0]).approve(routerAddress, constants.MaxUint256);

    await factory.createPair(tokens[i].address, wethAddress);
    await router.addLiquidityETH(
      tokens[i].address,
      parseEther("100000"),
      parseEther("100000"),
      parseEther("100000"),
      signers[0].address,
      constants.MaxUint256,
      { value: parseEther("100000") },
    );
  }
  for (let i = 0; i < 6; i++) {
    const nextAddress = i === 5 ? tokens[0].address : tokens[i + 1].address;

    await factory.createPair(tokens[i].address, nextAddress);
    const pairAddress = await factory.getPair(tokens[i].address, nextAddress);
    const pair = await getContractAt("SmardexPairTest", pairAddress);

    const token0 = await pair.token0();
    const token1 = await pair.token1();

    await router.addLiquidity(
      token0,
      token1,
      parseEther("100000"),
      parseEther("100000"),
      parseEther("100000"),
      parseEther("100000"),
      signers[0].address,
      constants.MaxUint256,
    );
  }
  const gasData: GasFunction = {
    swapExactTokensForTokens: [],
    swapTokensForExactTokens: [],
    swapTokensForExactETH: [],
    swapETHForExactTokens: [],
    swapExactETHForTokens: [],
    swapExactTokensForETH: [],
  };

  for (let i = 0; i < 5; i++) {
    gasData.swapExactTokensForTokens.push(
      await generateGasData(
        i + 1,
        router,
        signers[0],
        router.interface.functions["swapExactTokensForTokens(uint256,uint256,address[],address,uint256)"],
        tokens,
        weth,
      ),
    );

    gasData.swapTokensForExactTokens.push(
      await generateGasData(
        i + 1,
        router,
        signers[0],
        router.interface.functions["swapTokensForExactTokens(uint256,uint256,address[],address,uint256)"],
        tokens,
        weth,
      ),
    );

    gasData.swapTokensForExactETH.push(
      await generateGasData(
        i + 1,
        router,
        signers[0],
        router.interface.functions["swapTokensForExactETH(uint256,uint256,address[],address,uint256)"],
        tokens,
        weth,
      ),
    );

    gasData.swapETHForExactTokens.push(
      await generateGasData(
        i + 1,
        router,
        signers[0],
        router.interface.functions["swapETHForExactTokens(uint256,address[],address,uint256)"],
        tokens,
        weth,
      ),
    );

    gasData.swapExactETHForTokens.push(
      await generateGasData(
        i + 1,
        router,
        signers[0],
        router.interface.functions["swapExactETHForTokens(uint256,address[],address,uint256)"],
        tokens,
        weth,
      ),
    );
    gasData.swapExactTokensForETH.push(
      await generateGasData(
        i + 1,
        router,
        signers[0],
        router.interface.functions["swapExactTokensForETH(uint256,uint256,address[],address,uint256)"],
        tokens,
        weth,
      ),
    );
  }

  console.log(gasData);
}

async function generateGasData(
  hop: number,
  router: SmardexRouter,
  signer: SignerWithAddress,
  functionFragment: FunctionFragment,
  tokens: ERC20Test[],
  weth: WETH9,
): Promise<GasData> {
  let gasData: GasData = {
    hop: hop,
    gasAvg: constants.Zero,
    gasMin: constants.Zero,
    gasMax: constants.Zero,
  };
  let tmpAvg = constants.Zero;
  for (let i = 0; i < NB_TX; i++) {
    const gasUsed = await generateTx(hop, functionFragment, router, signer, tokens, weth);
    tmpAvg = tmpAvg.add(gasUsed);
    gasData = checkGas(gasData, gasUsed);
  }
  gasData.gasAvg = tmpAvg.div(NB_TX);
  return gasData;
}

async function generateTx(
  hop: number,
  functionFragment: FunctionFragment,
  router: SmardexRouter,
  signer: SignerWithAddress,
  tokens: ERC20Test[],
  weth: WETH9,
): Promise<BigNumber> {
  let path: string[] = [];
  let tx: ContractTransaction;
  const amount = randomAmount();
  if (
    functionFragment ===
    router.interface.functions["swapExactTokensForTokens(uint256,uint256,address[],address,uint256)"]
  ) {
    path = generatePath(hop, tokens, weth.address, false, false);
    tx = await router.swapExactTokensForTokens(amount, 0, path, signer.address, constants.MaxUint256);
  } else if (
    functionFragment ===
    router.interface.functions["swapTokensForExactTokens(uint256,uint256,address[],address,uint256)"]
  ) {
    path = generatePath(hop, tokens, weth.address, false, false);
    tx = await router.swapTokensForExactTokens(
      amount,
      constants.MaxUint256,
      path,
      signer.address,
      constants.MaxUint256,
    );
  } else if (
    functionFragment === router.interface.functions["swapTokensForExactETH(uint256,uint256,address[],address,uint256)"]
  ) {
    path = generatePath(hop, tokens, weth.address, true, true);
    tx = await router.swapTokensForExactETH(amount, constants.MaxUint256, path, signer.address, constants.MaxUint256);
  } else if (
    functionFragment === router.interface.functions["swapETHForExactTokens(uint256,address[],address,uint256)"]
  ) {
    path = generatePath(hop, tokens, weth.address, true, false);
    tx = await router.swapETHForExactTokens(amount, path, signer.address, constants.MaxUint256, {
      value: parseEther("1000"),
    });
  } else if (
    functionFragment === router.interface.functions["swapExactETHForTokens(uint256,address[],address,uint256)"]
  ) {
    path = generatePath(hop, tokens, weth.address, true, false);
    tx = await router.swapExactETHForTokens(0, path, signer.address, constants.MaxUint256, { value: amount });
  } else if (
    functionFragment === router.interface.functions["swapExactTokensForETH(uint256,uint256,address[],address,uint256)"]
  ) {
    path = generatePath(hop, tokens, weth.address, true, true);
    tx = await router.swapExactTokensForETH(amount, 0, path, signer.address, constants.MaxUint256);
  }
  const receipt = await tx!.wait();
  return receipt.gasUsed;
}

function generatePath(hop: number, tokens: ERC20Test[], weth: string, wethInPath: boolean, toWeth: boolean): string[] {
  const path: string[] = [];
  let currentIndex: number | undefined = undefined;
  const reverse: boolean = Math.random() < 0.5;
  for (let i = 0; i < hop + 1; i++) {
    if ((wethInPath && !toWeth && i === 0) || (wethInPath && toWeth && i === hop)) {
      path.push(weth);
    } else if (currentIndex === undefined) {
      currentIndex = Math.floor(Math.random() * tokens.length);
      path.push(tokens[currentIndex].address);
    } else if (reverse) {
      currentIndex = currentIndex === 0 ? tokens.length - 1 : currentIndex - 1;
      path.push(tokens[currentIndex].address);
    } else {
      currentIndex = currentIndex === tokens.length - 1 ? 0 : currentIndex + 1;
      path.push(tokens[currentIndex].address);
    }
  }
  return path;
}

function randomAmount(): BigNumber {
  return parseEther((Math.floor(Math.random() * 10) + 1).toString());
}

function checkGas(gasData: GasData, gasUsed: BigNumber): GasData {
  if (gasData.gasMin.eq(0) || gasData.gasMin.gt(gasUsed)) {
    gasData.gasMin = gasUsed;
  }
  if (gasData.gasMax.eq(0) || gasData.gasMax.lt(gasUsed)) {
    gasData.gasMax = gasUsed;
  }
  return gasData;
}

async function getDeployedAddress(hre: HardhatRuntimeEnvironment, contractName: string): Promise<string> {
  try {
    return (await import(`../deployments/ethereum/${contractName}.json`)).address;
  } catch (e) {
    throw new Error(
      `Error while fetching addresses, maybe you didn't deployed the ${contractName} on the network ethereum ?`,
    );
  }
}
