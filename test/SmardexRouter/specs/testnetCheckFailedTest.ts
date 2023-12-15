import { expect } from "chai";
import { BigNumber, constants } from "ethers";
import { deployERC20Test, deploySmardexPairTest } from "../../deployers";
import { parseEther } from "ethers/lib/utils";
import { Contracts, Signers } from "../../types";
import { GetAmountTrade } from "../../SmardexLibrary/utils";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { getImpersonatedSigner } from "@nomiclabs/hardhat-ethers/internal/helpers";
import hre, { ethers } from "hardhat";
import {
  FarmingRange,
  FarmingRange__factory,
  IERC20__factory,
  SmardexFactory__factory,
  SmardexPair__factory,
  SmardexRouter__factory,
  SmardexToken__factory,
} from "../../../typechain";
import { FEES_BASE, FEES_POOL } from "../../constants";

export function shouldBehaveLikeCheckFailedTest(): void {
  it("try revert case", async function () {
    const data: GetAmountTrade = {
      reserveToken0: parseEther("10.647726201504724974"),
      reserveToken1: parseEther("10725.399831"),
      fictiveReserveToken0: parseEther("3.812907415989527051"),
      fictiveReserveToken1: parseEther("2264.013573"),
      priceAverageToken0: parseEther("7.379104380048765348"),
      priceAverageToken1: parseEther("3649.906646"),

      amountInToken0: parseEther("0.382501826275633381"),
      amountOutToken1: parseEther("213.0"),

      expectedReserveToken0: parseEther("0"),
      expectedReserveToken1: parseEther("0"),
      expectedFictiveReserveToken0: parseEther("0"),
      expectedFictiveReserveToken1: parseEther("0"),
    };
    const WETHPartner = await deployERC20Test(parseEther("10000000"));

    this.contracts.smardexPairTest = await deploySmardexPairTest(
      this.contracts.smardexFactoryTest,
      this.contracts.WETH,
      WETHPartner,
    );
    const token0InPair = await this.contracts.smardexPairTest.token0();

    await WETHPartner.approve(this.contracts.routerForPairTest.address, constants.MaxUint256);
    // await this.contracts.token1.approve(this.contracts.routerForPairTest.address, constants.MaxUint256);

    await setupPair(this.contracts, this.signers, data, token0InPair === this.contracts.WETH.address);

    await expect(
      this.contracts.routerForPairTest.swapETHForExactTokens(
        data.amountOutToken1,
        [this.contracts.WETH.address, WETHPartner.address],
        this.signers.admin.address,
        constants.MaxUint256,
        {
          value: data.amountInToken0,
        },
      ),
    ).to.not.be.reverted;
  });

  it.skip("try revert case at a fixed block", async function () {
    await hre.network.provider.request({
      method: "hardhat_reset",
      params: [
        {
          forking: {
            jsonRpcUrl: process.env.URL_MUMBAI,
            blockNumber: 32289916,
          },
        },
      ],
    });

    const impersonatedSigner = await getImpersonatedSigner(hre, "0x845141d5e379170afc736e19d834182c3cae93a4");

    const routerContract = SmardexRouter__factory.connect(
      "0xfea8bdb813ea9c9af45d3dd389abbed8fdb4ff12",
      impersonatedSigner,
    );

    const result = await routerContract
      .connect(impersonatedSigner)
      .swapExactETHForTokens(
        318910845,
        ["0xD9f382B51Ed89A85171FB6A584e4940D1CaBE538", "0xEc1e8a6cE865C50f956ca922C3DE8F3242B2c17B"],
        impersonatedSigner.address,
        1677071309,
        {
          value: parseEther("0.5"),
        },
      );
    console.log(result);
    const receipt = await result.wait();
    console.log(receipt);
    await expect(result).to.not.be.reverted;
  });

  it.skip("check fees on snap", async function () {
    await hre.network.provider.request({
      method: "hardhat_reset",
      params: [
        {
          forking: {
            jsonRpcUrl: process.env.URL_MUMBAI,
            blockNumber: 32656578,
          },
        },
      ],
    });

    const impersonatedSigner = await getImpersonatedSigner(hre, "0xe109801d56ffb86322a637f9260ffcd101c2fe9d");

    const tokenSDEX = SmardexToken__factory.connect("0x3B20f0064eb855eECC7f3f7Da58c282C38e02607", impersonatedSigner);
    const tokenUSDT = SmardexToken__factory.connect("0xEc1e8a6cE865C50f956ca922C3DE8F3242B2c17B", impersonatedSigner);
    const routerContract = SmardexRouter__factory.connect(
      "0x3c7f9da73afe76f70324abba7fe924d5c8e81308",
      impersonatedSigner,
    );
    const factoryContract = SmardexFactory__factory.connect(await routerContract.factory(), impersonatedSigner);
    const pairAddress = await factoryContract.getPair(tokenSDEX.address, tokenUSDT.address);
    console.log(pairAddress);
    const pair = SmardexPair__factory.connect(pairAddress, impersonatedSigner);

    // const amountUSDT = parseUnits("100000", 6);
    const amountSmardex = parseEther("100000");

    const feesBefore = await pair.getFeeToAmounts();
    const reservesBefore = await pair.getReserves();

    console.log(await ethers.provider.getBlockNumber());

    const balanceUSDTBefore = await tokenUSDT.balanceOf(impersonatedSigner.address);
    let result = await routerContract
      .connect(impersonatedSigner)
      .swapTokensForExactTokens(
        "100000000000000000000000",
        26226898441,
        [tokenUSDT.address, tokenSDEX.address],
        impersonatedSigner.address,
        1677850602,
        {
          gasLimit: 139898,
        },
      );
    await result.wait();
    await expect(result).to.not.be.reverted;

    const usdtPaid = balanceUSDTBefore.sub(await tokenUSDT.balanceOf(impersonatedSigner.address));

    result = await routerContract
      .connect(impersonatedSigner)
      .swapExactTokensForTokens(
        "100000000000000000000000",
        26151072198,
        [tokenSDEX.address, tokenUSDT.address],
        impersonatedSigner.address,
        1677850636,
        {
          gasLimit: 136517,
        },
      );
    await result.wait();
    await expect(result).to.not.be.reverted;

    console.log(await ethers.provider.getBlockNumber());

    const reservesAfter = await pair.getReserves();
    const feesAfter = await pair.getFeeToAmounts();

    console.log(reservesBefore.reserve0_);
    console.log(reservesAfter.reserve0_);
    console.log(reservesBefore.reserve1_);
    console.log(reservesAfter.reserve1_);

    console.log(await factoryContract.feeTo());

    console.log(feesBefore.fees0_);
    console.log(feesAfter.fees0_);
    console.log(feesBefore.fees1_);
    console.log(feesAfter.fees1_);

    //token0 = SDEX
    expect(feesAfter.fees0_).to.be.eq(feesBefore.fees0_.add(amountSmardex.mul(FEES_POOL).div(FEES_BASE)));
    expect(feesAfter.fees1_).to.be.eq(feesBefore.fees1_.add(usdtPaid.mul(FEES_POOL).div(FEES_BASE)));
  });

  it.skip("check ethereum farming update script", async function () {
    await hre.network.provider.request({
      method: "hardhat_reset",
      params: [
        {
          forking: {
            jsonRpcUrl: process.env.URL_ETH_MAINNET,
            blockNumber: 16825305,
          },
        },
      ],
    });

    const impersonatedSigner = await getImpersonatedSigner(hre, "0xcaEc63ce78a0D4DAb2b5112295789A542A0fdAee");
    const farming = FarmingRange__factory.connect("0xe74A7a544534DA80fBaC4d2475a6fDc03388154f", impersonatedSigner);
    const rewardToken = IERC20__factory.connect((await farming.campaignInfo(0)).rewardToken, impersonatedSigner);
    const farmingRewardBalanceBefore = await rewardToken.balanceOf(farming.address);
    console.log(await rewardToken.balanceOf("0x25c4b95F00a01D3739815F026C52126F44034837"));

    let campaignId = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12];
    let rewardIndex = [
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
    ];

    let endBlock = [
      [
        16877502, 16927902, 16978302, 17028702, 19656702, 22284702, 24912702, 27540702, 30168702, 32796702, 35424702,
        38052702, 40680702, 43308702,
      ],
      [
        16877502, 16927902, 16978302, 17028702, 19656702, 22284702, 24912702, 27540702, 30168702, 32796702, 35424702,
        38052702, 40680702, 43308702,
      ],
      [
        16877502, 16927902, 16978302, 17028702, 19656702, 22284702, 24912702, 27540702, 30168702, 32796702, 35424702,
        38052702, 40680702, 43308702,
      ],
      [
        16877502, 16927902, 16978302, 17028702, 19656702, 22284702, 24912702, 27540702, 30168702, 32796702, 35424702,
        38052702, 40680702, 43308702,
      ],
      [
        16877502, 16927902, 16978302, 17028702, 19656702, 22284702, 24912702, 27540702, 30168702, 32796702, 35424702,
        38052702, 40680702, 43308702,
      ],
      [
        16877502, 16927902, 16978302, 17028702, 19656702, 22284702, 24912702, 27540702, 30168702, 32796702, 35424702,
        38052702, 40680702, 43308702,
      ],
      [
        16877502, 16927902, 16978302, 17028702, 19656702, 22284702, 24912702, 27540702, 30168702, 32796702, 35424702,
        38052702, 40680702, 43308702,
      ],
      [
        16877502, 16927902, 16978302, 17028702, 19656702, 22284702, 24912702, 27540702, 30168702, 32796702, 35424702,
        38052702, 40680702, 43308702,
      ],
      [
        16877502, 16927902, 16978302, 17028702, 19656702, 22284702, 24912702, 27540702, 30168702, 32796702, 35424702,
        38052702, 40680702, 43308702,
      ],
      [
        16877502, 16927902, 16978302, 17028702, 19656702, 22284702, 24912702, 27540702, 30168702, 32796702, 35424702,
        38052702, 40680702, 43308702,
      ],
      [
        16877502, 16927902, 16978302, 17028702, 19656702, 22284702, 24912702, 27540702, 30168702, 32796702, 35424702,
        38052702, 40680702, 43308702,
      ],
      [
        16877502, 16927902, 16978302, 17028702, 19656702, 22284702, 24912702, 27540702, 30168702, 32796702, 35424702,
        38052702, 40680702, 43308702,
      ],
    ];

    let rewardPerBlock = [
      [
        "2636713600168749670410",
        "1977535200126562252808",
        "1318356800084374835205",
        "659178400042187417602",
        "189626663025834736570",
        "94813331512917368285",
        "47406665756458684142",
        "23703332878229342071",
        "11851666439114671035",
        "5925833219557335517",
        "2962916609778667758",
        "1481458304889333879",
        "740729152444666939",
        "740729152444666939",
      ],
      [
        "2636713600168749670410",
        "1977535200126562252808",
        "1318356800084374835205",
        "659178400042187417602",
        "189626663025834736570",
        "94813331512917368285",
        "47406665756458684142",
        "23703332878229342071",
        "11851666439114671035",
        "5925833219557335517",
        "2962916609778667758",
        "1481458304889333879",
        "740729152444666939",
        "740729152444666939",
      ],
      [
        "823973000052734272003",
        "617979750039550704002",
        "411986500026367136001",
        "205993250013183568000",
        "59258332195573355178",
        "29629166097786677589",
        "14814583048893338794",
        "7407291524446669397",
        "3703645762223334698",
        "1851822881111667349",
        "925911440555833674",
        "462955720277916837",
        "231477860138958418",
        "231477860138958418",
      ],
      [
        "263671360016874967041",
        "197753520012656225280",
        "131835680008437483520",
        "65917840004218741760",
        "18962666302583473657",
        "9481333151291736828",
        "4740666575645868414",
        "2370333287822934207",
        "1185166643911467103",
        "592583321955733551",
        "296291660977866775",
        "148145830488933387",
        "74072915244466693",
        "74072915244466693",
      ],
      [
        "659178400042187417602",
        "494383800031640563202",
        "329589200021093708801",
        "164794600010546854400",
        "47406665756458684142",
        "23703332878229342071",
        "11851666439114671035",
        "5925833219557335517",
        "2962916609778667758",
        "1481458304889333879",
        "740729152444666939",
        "370364576222333469",
        "185182288111166734",
        "185182288111166734",
      ],
      [
        "659178400042187417602",
        "494383800031640563202",
        "329589200021093708801",
        "164794600010546854400",
        "47406665756458684142",
        "23703332878229342071",
        "11851666439114671035",
        "5925833219557335517",
        "2962916609778667758",
        "1481458304889333879",
        "740729152444666939",
        "370364576222333469",
        "185182288111166734",
        "185182288111166734",
      ],
      [
        "131835680008437483520",
        "98876760006328112640",
        "65917840004218741760",
        "32958920002109370880",
        "9481333151291736828",
        "4740666575645868414",
        "2370333287822934207",
        "1185166643911467103",
        "592583321955733551",
        "296291660977866775",
        "148145830488933387",
        "74072915244466693",
        "37036457622233346",
        "37036457622233346",
      ],
      [
        "131835680008437483520",
        "98876760006328112640",
        "65917840004218741760",
        "32958920002109370880",
        "9481333151291736828",
        "4740666575645868414",
        "2370333287822934207",
        "1185166643911467103",
        "592583321955733551",
        "296291660977866775",
        "148145830488933387",
        "74072915244466693",
        "37036457622233346",
        "37036457622233346",
      ],
      [
        "32958920002109370880",
        "24719190001582028160",
        "16479460001054685440",
        "8239730000527342720",
        "2370333287822934207",
        "1185166643911467103",
        "592583321955733551",
        "296291660977866775",
        "148145830488933387",
        "74072915244466693",
        "37036457622233346",
        "18518228811116673",
        "9259114405558336",
        "9259114405558336",
      ],
      [
        "32958920002109370880",
        "24719190001582028160",
        "16479460001054685440",
        "8239730000527342720",
        "2370333287822934207",
        "1185166643911467103",
        "592583321955733551",
        "296291660977866775",
        "148145830488933387",
        "74072915244466693",
        "37036457622233346",
        "18518228811116673",
        "9259114405558336",
        "9259114405558336",
      ],
      [
        "263671360016874967041",
        "197753520012656225280",
        "131835680008437483520",
        "65917840004218741760",
        "18962666302583473657",
        "9481333151291736828",
        "4740666575645868414",
        "2370333287822934207",
        "1185166643911467103",
        "592583321955733551",
        "296291660977866775",
        "148145830488933387",
        "74072915244466693",
        "74072915244466693",
      ],
      [
        "329589200021093708801",
        "247191900015820281601",
        "164794600010546854400",
        "82397300005273427200",
        "23703332878229342071",
        "11851666439114671035",
        "5925833219557335517",
        "2962916609778667758",
        "1481458304889333879",
        "740729152444666939",
        "370364576222333469",
        "185182288111166734",
        "92591144055583367",
        "92591144055583367",
      ],
    ];

    await farming.connect(impersonatedSigner).updateCampaignsRewards(campaignId, rewardIndex, endBlock, rewardPerBlock);

    await checkDataFarming(farming, campaignId, rewardIndex, endBlock, rewardPerBlock);

    campaignId = [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24];
    rewardIndex = [
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
    ];

    endBlock = [
      [
        16877502, 16927902, 16978302, 17028702, 19656702, 22284702, 24912702, 27540702, 30168702, 32796702, 35424702,
        38052702, 40680702, 43308702,
      ],
      [
        16877502, 16927902, 16978302, 17028702, 19656702, 22284702, 24912702, 27540702, 30168702, 32796702, 35424702,
        38052702, 40680702, 43308702,
      ],
      [
        16877502, 16927902, 16978302, 17028702, 19656702, 22284702, 24912702, 27540702, 30168702, 32796702, 35424702,
        38052702, 40680702, 43308702,
      ],
      [
        16877502, 16927902, 16978302, 17028702, 19656702, 22284702, 24912702, 27540702, 30168702, 32796702, 35424702,
        38052702, 40680702, 43308702,
      ],
      [
        16877502, 16927902, 16978302, 17028702, 19656702, 22284702, 24912702, 27540702, 30168702, 32796702, 35424702,
        38052702, 40680702, 43308702,
      ],
      [
        16877502, 16927902, 16978302, 17028702, 19656702, 22284702, 24912702, 27540702, 30168702, 32796702, 35424702,
        38052702, 40680702, 43308702,
      ],
      [
        16877502, 16927902, 16978302, 17028702, 19656702, 22284702, 24912702, 27540702, 30168702, 32796702, 35424702,
        38052702, 40680702, 43308702,
      ],
      [
        16877502, 16927902, 16978302, 17028702, 19656702, 22284702, 24912702, 27540702, 30168702, 32796702, 35424702,
        38052702, 40680702, 43308702,
      ],
      [
        16877502, 16927902, 16978302, 17028702, 19656702, 22284702, 24912702, 27540702, 30168702, 32796702, 35424702,
        38052702, 40680702, 43308702,
      ],
      [
        16877502, 16927902, 16978302, 17028702, 19656702, 22284702, 24912702, 27540702, 30168702, 32796702, 35424702,
        38052702, 40680702, 43308702,
      ],
      [
        16877502, 16927902, 16978302, 17028702, 19656702, 22284702, 24912702, 27540702, 30168702, 32796702, 35424702,
        38052702, 40680702, 43308702,
      ],
      [
        16877502, 16927902, 16978302, 17028702, 19656702, 22284702, 24912702, 27540702, 30168702, 32796702, 35424702,
        38052702, 40680702, 43308702,
      ],
    ];

    rewardPerBlock = [
      [
        "131835680008437483520",
        "98876760006328112640",
        "65917840004218741760",
        "32958920002109370880",
        "9481333151291736828",
        "4740666575645868414",
        "2370333287822934207",
        "1185166643911467103",
        "592583321955733551",
        "296291660977866775",
        "148145830488933387",
        "74072915244466693",
        "37036457622233346",
        "37036457622233346",
      ],
      [
        "329589200021093708801",
        "247191900015820281601",
        "164794600010546854400",
        "82397300005273427200",
        "23703332878229342071",
        "11851666439114671035",
        "5925833219557335517",
        "2962916609778667758",
        "1481458304889333879",
        "740729152444666939",
        "370364576222333469",
        "185182288111166734",
        "92591144055583367",
        "92591144055583367",
      ],
      [
        "131835680008437483520",
        "98876760006328112640",
        "65917840004218741760",
        "32958920002109370880",
        "9481333151291736828",
        "4740666575645868414",
        "2370333287822934207",
        "1185166643911467103",
        "592583321955733551",
        "296291660977866775",
        "148145830488933387",
        "74072915244466693",
        "37036457622233346",
        "37036457622233346",
      ],
      [
        "131835680008437483520",
        "98876760006328112640",
        "65917840004218741760",
        "32958920002109370880",
        "9481333151291736828",
        "4740666575645868414",
        "2370333287822934207",
        "1185166643911467103",
        "592583321955733551",
        "296291660977866775",
        "148145830488933387",
        "74072915244466693",
        "37036457622233346",
        "37036457622233346",
      ],
      [
        "65917840004218741760",
        "49438380003164056320",
        "32958920002109370880",
        "16479460001054685440",
        "4740666575645868414",
        "2370333287822934207",
        "1185166643911467103",
        "592583321955733551",
        "296291660977866775",
        "148145830488933387",
        "74072915244466693",
        "37036457622233346",
        "18518228811116673",
        "18518228811116673",
      ],
      [
        "65917840004218741760",
        "49438380003164056320",
        "32958920002109370880",
        "16479460001054685440",
        "4740666575645868414",
        "2370333287822934207",
        "1185166643911467103",
        "592583321955733551",
        "296291660977866775",
        "148145830488933387",
        "74072915244466693",
        "37036457622233346",
        "18518228811116673",
        "18518228811116673",
      ],
      [
        "65917840004218741760",
        "49438380003164056320",
        "32958920002109370880",
        "16479460001054685440",
        "4740666575645868414",
        "2370333287822934207",
        "1185166643911467103",
        "592583321955733551",
        "296291660977866775",
        "148145830488933387",
        "74072915244466693",
        "37036457622233346",
        "18518228811116673",
        "18518228811116673",
      ],
      [
        "65917840004218741760",
        "49438380003164056320",
        "32958920002109370880",
        "16479460001054685440",
        "4740666575645868414",
        "2370333287822934207",
        "1185166643911467103",
        "592583321955733551",
        "296291660977866775",
        "148145830488933387",
        "74072915244466693",
        "37036457622233346",
        "18518228811116673",
        "18518228811116673",
      ],
      [
        "65917840004218741760",
        "49438380003164056320",
        "32958920002109370880",
        "16479460001054685440",
        "4740666575645868414",
        "2370333287822934207",
        "1185166643911467103",
        "592583321955733551",
        "296291660977866775",
        "148145830488933387",
        "74072915244466693",
        "37036457622233346",
        "18518228811116673",
        "18518228811116673",
      ],
      [
        "65917840004218741760",
        "49438380003164056320",
        "32958920002109370880",
        "16479460001054685440",
        "4740666575645868414",
        "2370333287822934207",
        "1185166643911467103",
        "592583321955733551",
        "296291660977866775",
        "148145830488933387",
        "74072915244466693",
        "37036457622233346",
        "18518228811116673",
        "18518228811116673",
      ],
      [
        "32958920002109370880",
        "24719190001582028160",
        "16479460001054685440",
        "8239730000527342720",
        "2370333287822934207",
        "1185166643911467103",
        "592583321955733551",
        "296291660977866775",
        "148145830488933387",
        "74072915244466693",
        "37036457622233346",
        "18518228811116673",
        "9259114405558336",
        "9259114405558336",
      ],
      [
        "32958920002109370880",
        "24719190001582028160",
        "16479460001054685440",
        "8239730000527342720",
        "2370333287822934207",
        "1185166643911467103",
        "592583321955733551",
        "296291660977866775",
        "148145830488933387",
        "74072915244466693",
        "37036457622233346",
        "18518228811116673",
        "9259114405558336",
        "9259114405558336",
      ],
    ];

    await farming.connect(impersonatedSigner).updateCampaignsRewards(campaignId, rewardIndex, endBlock, rewardPerBlock);

    await checkDataFarming(farming, campaignId, rewardIndex, endBlock, rewardPerBlock);

    console.log(await rewardToken.balanceOf("0x25c4b95F00a01D3739815F026C52126F44034837"));
    const farmingRewardBalanceAfter = await rewardToken.balanceOf(farming.address);
    expect(farmingRewardBalanceAfter).to.be.eq(farmingRewardBalanceBefore);
  });

  async function checkDataFarming(
    farming: FarmingRange,
    campaignId: number[],
    rewardIndex: number[][],
    endBlock: number[][],
    rewardPerBlock: string[][],
  ) {
    for (let i = 0; i < campaignId.length; i++) {
      const rewardInfoLength = rewardIndex[i].length;
      for (let j = 0; j < rewardInfoLength; j++) {
        try {
          const rewardInfo = await farming.campaignRewardInfo(campaignId[i], rewardIndex[i][j]);
          expect(rewardInfo.endBlock).to.be.eq(endBlock[i][j]);
          expect(rewardInfo.rewardPerBlock).to.be.eq(BigNumber.from(rewardPerBlock[i][j]));
        } catch (e) {
          console.log(i);
          console.log(j);
          console.log(rewardPerBlock[i][j]);
        }
      }
    }
  }

  async function setupPair(
    contracts: Contracts,
    signers: Signers,
    getAmountTestCase: GetAmountTrade,
    isSwapToken0ToToken1: boolean,
  ) {
    await contracts.routerForPairTest.mint(
      contracts.smardexPairTest.address,
      signers.admin.address,
      isSwapToken0ToToken1 ? getAmountTestCase.reserveToken0 : getAmountTestCase.reserveToken1,
      isSwapToken0ToToken1 ? getAmountTestCase.reserveToken1 : getAmountTestCase.reserveToken0,
      signers.admin.address,
      { value: isSwapToken0ToToken1 ? getAmountTestCase.reserveToken0 : getAmountTestCase.reserveToken1 },
    );

    const reserves = await contracts.smardexPairTest.getReserves();
    await expect(reserves.reserve0_).to.be.eq(
      isSwapToken0ToToken1 ? getAmountTestCase.reserveToken0 : getAmountTestCase.reserveToken1,
    );
    await expect(reserves.reserve1_).to.be.eq(
      isSwapToken0ToToken1 ? getAmountTestCase.reserveToken1 : getAmountTestCase.reserveToken0,
    );

    await contracts.smardexPairTest.setFictivePoolValues(
      isSwapToken0ToToken1 ? getAmountTestCase.fictiveReserveToken0 : getAmountTestCase.fictiveReserveToken1,
      isSwapToken0ToToken1 ? getAmountTestCase.fictiveReserveToken1 : getAmountTestCase.fictiveReserveToken0,
    );
    const currentTimestamp = await time.latest();
    await contracts.smardexPairTest.setPriceAverage(
      isSwapToken0ToToken1 ? getAmountTestCase.priceAverageToken0 : getAmountTestCase.priceAverageToken1,
      isSwapToken0ToToken1 ? getAmountTestCase.priceAverageToken1 : getAmountTestCase.priceAverageToken0,
      currentTimestamp + 2 - 251, //add 2, so in the next block it will be the same timestamp
    );
  }
}
