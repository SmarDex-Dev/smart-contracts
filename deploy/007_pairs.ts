import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import { mainnets, getTestTokenArgs, getTetherTokenArgs, wethAtifacts, abiPaths, chainsData as data } from "./utils";
import { isV1Pair } from "./params";
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy, save } = deployments;
  const { getContractAt, BigNumber, provider, getContractFactory } = hre.ethers;
  const { admin } = await getNamedAccounts();

  const factory = await deployments.get("SmardexFactory");

  const router = isV1Pair ? await deployments.get("SmardexRouterV2") : await deployments.get("SmardexRouter");

  const isMainnet: boolean = mainnets.includes(await hre.getChainId());

  // filter chain related data from json file
  const list = data.filter(networkData => networkData.network === hre.network.name);

  if (list.length > 0) {
    // list of tokens
    const tokenList = list[0].tokens;

    for (let i = 0; i < tokenList.length; i++) {
      const token = tokenList[i];

      const isTether: boolean = token.artifact === "TetherToken";
      // group of tokens to deploy sorted by contract artifact
      console.log(token.address);
      if (!isMainnet && (isTether || token.artifact === "TestToken") && token.address === "") {
        await deploy(token.artifact, {
          from: admin,
          args: isTether ? getTetherTokenArgs() : getTestTokenArgs(token),
          log: true,
        });

        tokenList[i].address = (await deployments.get(token.artifact)).address;
      } else {
        if (token.artifact === "") token.artifact = "SmardexTokenTest";

        if (token.address === "") {
          token.address = (await deployments.get(token.artifact)).address;
        }

        const tokenInstance = await getContractFactory(token.artifact);

        await save(token.name, {
          address: token.address,
          abi: JSON.parse(tokenInstance.interface.format("json") as string),
        });
      }
    }

    // filter each native weth for any chain
    const weth = tokenList.filter(token => wethAtifacts.includes(token.artifact))[0];

    // token pais to deploy
    const pairs = list[0].pairs;
    const factoryInstance = await getContractAt("SmardexFactory", factory.address);

    // get correct router instance
    const routerInstance = isV1Pair
      ? await getContractAt("SmardexRouter", router.address)
      : await getContractAt("SmardexRouterV2", router.address);

    for (let i = 0; i < pairs.length; i++) {
      const tokenA = tokenList.filter(token => token.name === pairs[i].tokenA)[0];
      const tokenB = tokenList.filter(token => token.name === pairs[i].tokenB)[0];

      const tokenAFactory = await hre.ethers.getContractFactory(tokenA.artifact);
      const tokenAInstance = tokenAFactory.attach(tokenA.address);
      const tokenBFactory = await hre.ethers.getContractFactory(tokenB.artifact);
      const tokenBInstance = tokenBFactory.attach(tokenB.address);

      pairs[i].address = await factoryInstance.getPair(tokenAInstance.address, tokenBInstance.address);

      const notExist: boolean = pairs[i].address.toLowerCase() === hre.ethers.constants.AddressZero.toLowerCase();

      // create pair if doesn't exist
      if (notExist) {
        // check balance token A
        const balanceA = await tokenAInstance.balanceOf(admin);

        if (balanceA.lt(BigNumber.from(pairs[i].amountA))) {
          // specific weth behavior A
          if (tokenA.name === weth.name) {
            await (await tokenAInstance.deposit({ value: BigNumber.from(pairs[i].amountA).sub(balanceA) })).wait();
          } else {
            // other tokens behavior
            if (!isMainnet) {
              await (await tokenAInstance.mint(admin, pairs[i].amountA)).wait();
            } else {
              throw new Error(`No enough ${tokenA.name} balance.`);
            }
          }
        }

        // check balance token B
        const balanceB = await tokenBInstance.balanceOf(admin);

        if (balanceB.lt(BigNumber.from(pairs[i].amountB))) {
          // specific weth behavior B
          if (tokenB.name === weth.name) {
            await (await tokenBInstance.deposit({ value: BigNumber.from(pairs[i].amountB).sub(balanceB) })).wait();
          } else {
            // other tokens behavior
            if (!isMainnet) {
              await (await tokenBInstance.mint(admin, pairs[i].amountB)).wait();
            } else {
              throw new Error(`No enough ${tokenB.name} balance.`);
            }
          }
        }

        // tether reset allowance A
        if (tokenA.artifact === "TetherToken") {
          const allowance = await tokenAInstance.allowance(admin, router.address);
          if (allowance.gt(BigNumber.from(0))) {
            await (await tokenAInstance.approve(router.address, 0, { gasLimit: 5000000 })).wait();
          }
        }

        // router approve A
        await (await tokenAInstance.approve(router.address, pairs[i].amountA, { gasLimit: 5000000 })).wait();

        // tether reset allowance B
        if (tokenB.artifact === "TetherToken") {
          const allowance = await tokenBInstance.allowance(admin, router.address);
          if (allowance.gt(BigNumber.from(0))) {
            await (await tokenBInstance.approve(router.address, 0, { gasLimit: 5000000 })).wait();
          }
        }

        // router approve B
        await (await tokenBInstance.approve(router.address, pairs[i].amountB, { gasLimit: 5000000 })).wait();

        const now: number = (await provider.getBlock("latest")).timestamp;

        // pair creation and optional liquidity providing
        if (pairs[i].address === "" && (pairs[i].amountA === "0" || pairs[i].amountB === "0")) {
          await (await factoryInstance.createPair(tokenAInstance.address, tokenBInstance.address)).wait();
        } else if (pairs[i].address === "") {
          const params = {
            tokenA: tokenAInstance.address,
            tokenB: tokenBInstance.address,
            amountADesired: pairs[i].amountA,
            amountBDesired: pairs[i].amountB,
            amountAMin: pairs[i].amountA,
            amountBMin: pairs[i].amountB,
            fictiveReserveB: pairs[i].amountB,
            fictiveReserveAMin: pairs[i].amountA,
            fictiveReserveAMax: pairs[i].amountA,
          };

          await (
            await routerInstance.addLiquidity(params, admin, (now + 500).toString(), {
              gasLimit: 5000000,
              gasPrice: "10000000",
            })
          ).wait();
        }

        // save pair just created
        pairs[i].address = await factoryInstance.getPair(tokenAInstance.address, tokenBInstance.address);
      }

      const pairArtifact = isV1Pair ? "SmardexPairV1" : "SmardexPair";

      await save(tokenA.name + "-" + tokenB.name, {
        address: pairs[i].address,
        abi: (await import(abiPaths[pairArtifact as keyof typeof abiPaths])).abi,
      });

      console.log(
        "Pair saved: " +
          tokenA.name +
          "-" +
          tokenB.name +
          (notExist ? " created at " : " already deployed at ") +
          pairs[i].address,
      );
    }
  }
};

export default func;
func.tags = ["Pairs"];
