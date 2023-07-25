import { BigNumber } from "ethers";
import { parseEther } from "ethers/lib/utils";
import { expect } from "chai";
import { FEES_LP, FEES_POOL } from "../constants";
export interface GetAmountTrade {
  reserveToken0: BigNumber;
  reserveToken1: BigNumber;
  fictiveReserveToken0: BigNumber;
  fictiveReserveToken1: BigNumber;
  priceAverageToken0: BigNumber;
  priceAverageToken1: BigNumber;
  amountInToken0: BigNumber;
  amountOutToken1: BigNumber;
  expectedReserveToken0: BigNumber;
  expectedReserveToken1: BigNumber;
  expectedFictiveReserveToken0: BigNumber;
  expectedFictiveReserveToken1: BigNumber;
}

export interface GetAmountParametersStruct {
  amount: BigNumber;
  reserveIn: BigNumber;
  reserveOut: BigNumber;
  fictiveReserveIn: BigNumber;
  fictiveReserveOut: BigNumber;
  priceAverageIn: BigNumber;
  priceAverageOut: BigNumber;
  feesLP: BigNumber;
  feesPool: BigNumber;
}

export const getAmountSimpleTestData: GetAmountTrade[] = [
  {
    reserveToken1: parseEther("11.081173096220"),
    reserveToken0: parseEther("158209.6837795040"),
    fictiveReserveToken1: parseEther("4.04163654811020"),
    fictiveReserveToken0: parseEther("100513.6717545470"),
    priceAverageToken1: parseEther("1"),
    priceAverageToken0: parseEther("8529.466838"),

    amountOutToken1: parseEther("4.038807354450"),
    amountInToken0: parseEther("143588517.897173038549105682"),

    expectedReserveToken1: parseEther("7.04236574177"),
    expectedReserveToken0: parseEther("143718009.87737310794139586"),
    expectedFictiveReserveToken1: parseEther("0.0028291936602"),
    expectedFictiveReserveToken0: parseEther("143660313.86534815094139586"),
  },
  {
    reserveToken1: parseEther("143718009.8773240"),
    reserveToken0: parseEther("7.042365741770"),
    fictiveReserveToken1: parseEther("143660313.8652990"),
    fictiveReserveToken0: parseEther("0.0028291936602010"),
    priceAverageToken1: parseEther("8529.466838"),
    priceAverageToken0: parseEther("1"),

    amountOutToken1: parseEther("143559820.282216999999996584"),
    amountInToken0: parseEther("4.044467627359546797"),

    expectedReserveToken1: parseEther("158189.595107000000003416"),
    expectedReserveToken0: parseEther("11.086024475604074886"),
    expectedFictiveReserveToken1: parseEther("100493.583082000000003416"),
    expectedFictiveReserveToken0: parseEther("4.046487927494275886"),
  },
  {
    reserveToken1: parseEther("14.0790730962204"),
    reserveToken0: parseEther("115392.024049914"),
    fictiveReserveToken1: parseEther("7.039536548110200"),
    fictiveReserveToken0: parseEther("57696.01202495700"),
    priceAverageToken1: parseEther("1"),
    priceAverageToken0: parseEther("8195.99580606564"),

    amountOutToken1: parseEther("1.998600"),
    amountInToken0: parseEther("22890.98919389760"),

    expectedReserveToken1: parseEther("12.080473096220"),
    expectedReserveToken0: parseEther("138278.435045973"),
    expectedFictiveReserveToken1: parseEther("5.040936548110200"),
    expectedFictiveReserveToken0: parseEther("80582.42302101580"),
  },
  {
    reserveToken1: parseEther("14.0790730962204"),
    reserveToken0: parseEther("115392.024049914"),
    fictiveReserveToken1: parseEther("14.0790730962204"),
    fictiveReserveToken0: parseEther("115392.024049914"),
    priceAverageToken1: parseEther("1"),
    priceAverageToken0: parseEther("8195.99580606564"),

    amountOutToken1: parseEther("1.998600"),
    amountInToken0: parseEther("22890.98919389760"),

    expectedReserveToken1: parseEther("12.080473096220"),
    expectedReserveToken0: parseEther("138278.435045973"),
    expectedFictiveReserveToken1: parseEther("5.040936548110200"),
    expectedFictiveReserveToken0: parseEther("80582.42302101580"),
  },
  {
    reserveToken1: parseEther("115392.0240499140"),
    reserveToken0: parseEther("14.07907309622040"),
    fictiveReserveToken1: parseEther("57696.01202495700"),
    fictiveReserveToken0: parseEther("7.03953654811020"),
    priceAverageToken1: parseEther("8197.99580606564"),
    priceAverageToken0: parseEther("1"),

    amountOutToken1: parseEther("7172.135478994585570236"),
    amountInToken0: parseEther("1"),

    expectedReserveToken1: parseEther("108219.888570919414429764"),
    expectedReserveToken0: parseEther("15.078873096220399999"),
    expectedFictiveReserveToken1: parseEther("50523.876545962414431078"),
    expectedFictiveReserveToken0: parseEther("8.039336548110199999"),
  },
];

export const getAmount2TradesTestData: GetAmountTrade[] = [
  {
    reserveToken1: parseEther("26.067680096220"),
    reserveToken0: parseEther("79494.057306898"),
    fictiveReserveToken1: parseEther("18.901259335386200"),
    fictiveReserveToken0: parseEther("20718.80166304650"),
    priceAverageToken1: parseEther("1"),
    priceAverageToken0: parseEther("8505.736023"),

    amountOutToken1: parseEther("14"),
    amountInToken0: parseEther("59075.369409364976002771"),

    expectedReserveToken1: parseEther("12.06768009622"),
    expectedReserveToken0: parseEther("138557.61164238110300757"),
    expectedFictiveReserveToken1: parseEther("5.027167808751975025"),
    expectedFictiveReserveToken0: parseEther("80853.300236037811691695"),
  },
  {
    reserveToken1: parseEther("138438.576589534"),
    reserveToken0: parseEther("12.070480096220"),
    fictiveReserveToken1: parseEther("80742.56456457710"),
    fictiveReserveToken0: parseEther("5.03094354811020"),
    priceAverageToken1: parseEther("8505.736023"),
    priceAverageToken0: parseEther("1"),

    amountOutToken1: parseEther("58944.519282387892878071"),
    amountInToken0: parseEther("14"),

    expectedReserveToken1: parseEther("79494.057307146107121929"),
    expectedReserveToken0: parseEther("26.067680096219999999"),
    expectedFictiveReserveToken1: parseEther("20718.801662702244947244"),
    expectedFictiveReserveToken0: parseEther("18.901259335319134619"),
  },
  {
    reserveToken1: parseEther("14.8470627092787"),
    reserveToken0: parseEther("112484.184376481"),
    fictiveReserveToken1: parseEther("8.09435352361766"),
    fictiveReserveToken0: parseEther("51232.8575373919"),
    priceAverageToken1: parseEther("1"),
    priceAverageToken0: parseEther("8179.15409880139"),

    amountOutToken1: parseEther("1"),
    amountInToken0: parseEther("7226.753102787566908880"),

    expectedReserveToken1: parseEther("13.847062709278700000"),
    expectedReserveToken0: parseEther("119709.492128648009395497"),
    expectedFictiveReserveToken1: parseEther("6.735614406147914143"),
    expectedFictiveReserveToken0: parseEther("55523.982766505844237403"),
  },
  {
    reserveToken1: parseEther("119700.5920159950"),
    reserveToken0: parseEther("13.84726270927870"),
    fictiveReserveToken1: parseEther("53094.86786642850"),
    fictiveReserveToken0: parseEther("6.441406027101710"),
    priceAverageToken1: parseEther("8197.83791416109"),
    priceAverageToken0: parseEther("1"),

    amountOutToken1: parseEther("7216.407639514371353522"),
    amountInToken0: parseEther("1"),

    expectedReserveToken1: parseEther("112484.184376480628646478"),
    expectedReserveToken0: parseEther("14.847062709278699999"),
    expectedFictiveReserveToken1: parseEther("51232.857537391979202756"),
    expectedFictiveReserveToken0: parseEther("8.094353523617659658"),
  },
];

// getAmountIn params arrays side: -1
const argsIn: BigNumber[][] = [
  [
    BigNumber.from("1"),
    BigNumber.from("0"),
    BigNumber.from("100"),
    BigNumber.from("0"),
    BigNumber.from("50"),
    BigNumber.from("1"),
    BigNumber.from("1"),
    FEES_LP,
    FEES_POOL,
  ],
  [
    BigNumber.from("1"),
    BigNumber.from("100"),
    BigNumber.from("0"),
    BigNumber.from("50"),
    BigNumber.from("0"),
    BigNumber.from("1"),
    BigNumber.from("1"),
    FEES_LP,
    FEES_POOL,
  ],
  [
    BigNumber.from("0"),
    BigNumber.from("100"),
    BigNumber.from("100"),
    BigNumber.from("10"),
    BigNumber.from("10"),
    BigNumber.from("1"),
    BigNumber.from("1"),
    FEES_LP,
    FEES_POOL,
  ],
  [
    BigNumber.from("1"),
    BigNumber.from("100"),
    BigNumber.from("100"),
    BigNumber.from("10"),
    BigNumber.from("10"),
    BigNumber.from("1"),
    BigNumber.from("1"),
    FEES_LP,
    FEES_POOL,
  ],
];

// getAmountOut params arrays side: +1
const argsOut: BigNumber[][] = [
  [
    BigNumber.from("2"),
    BigNumber.from("0"),
    BigNumber.from("100"),
    BigNumber.from("0"),
    BigNumber.from("50"),
    BigNumber.from("1"),
    BigNumber.from("1"),
    FEES_LP,
    FEES_POOL,
  ],
  [
    BigNumber.from("2"),
    BigNumber.from("100"),
    BigNumber.from("0"),
    BigNumber.from("100"),
    BigNumber.from("0"),
    BigNumber.from("1"),
    BigNumber.from("1"),
    FEES_LP,
    FEES_POOL,
  ],
  [
    BigNumber.from("0"),
    BigNumber.from("100"),
    BigNumber.from("100"),
    BigNumber.from("50"),
    BigNumber.from("50"),
    BigNumber.from("1"),
    BigNumber.from("1"),
    FEES_LP,
    FEES_POOL,
  ],
  [
    BigNumber.from("1"),
    BigNumber.from("100"),
    BigNumber.from("100"),
    BigNumber.from("50"),
    BigNumber.from("50"),
    BigNumber.from("10"),
    BigNumber.from("10"),
    FEES_LP,
    FEES_POOL,
  ],
];

// to format getAmounts parameters
export const getAmountsParams = (side: number) => {
  const arr: GetAmountParametersStruct[] = [];
  const args: BigNumber[][] = side < 0 ? argsIn : argsOut;

  for (let i = 0; i < args.length; i++) {
    arr.push({
      amount: args[i][0],
      reserveIn: args[i][1],
      reserveOut: args[i][2],
      fictiveReserveIn: args[i][3],
      fictiveReserveOut: args[i][4],
      priceAverageIn: args[i][5],
      priceAverageOut: args[i][6],
      feesLP: args[i][7],
      feesPool: args[i][8],
    });
  }

  return arr;
};

export const SIDE_AMOUNT_IN = -1;
export const SIDE_AMOUNT_OUT = 1;

export const isInRange = async (result: BigNumber, compared: BigNumber, PCT: BigNumber, BASE: BigNumber) =>
  expect(result)
    .to.be.lessThanOrEqual(compared.add(compared.mul(PCT).div(BASE)))
    .to.be.greaterThanOrEqual(compared.sub(compared.mul(PCT).div(BASE)));
