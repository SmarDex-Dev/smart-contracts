import { formatEther, parseEther } from "ethers/lib/utils";
import { MAX_BLOCK_DIFF_SECONDS } from "../../constants";
import { expect } from "chai";
import { constants } from "ethers";

export function shouldBehaveLikeGetUpdatedPriceAverage(): void {
  const RES_FIC_IN = parseEther("999.9");
  const RES_FIC_OUT = parseEther("250.087530635722502877");
  const OLD_PRICE_AV_IN = parseEther("1000");
  const OLD_PRICE_AV_OUT = parseEther("1000");
  const TIMESTAMP_2023 = Math.floor(new Date("2023-01-01").getTime() / 1000);
  const MAX_TIME_DIFF = MAX_BLOCK_DIFF_SECONDS.toNumber();

  it("first timestamp null", async function () {
    const [priceAvIn, priceAvOut] = await this.contracts.smardexLibraryTest.getUpdatedPriceAverage(
      RES_FIC_IN,
      RES_FIC_OUT,
      0,
      OLD_PRICE_AV_IN,
      OLD_PRICE_AV_OUT,
      TIMESTAMP_2023,
    );

    expect(priceAvIn).to.be.eq(RES_FIC_IN);
    expect(priceAvOut).to.be.eq(RES_FIC_OUT);
    const [priceAvInReversed, priceAvOutReversed] = await this.contracts.smardexLibraryTest.getUpdatedPriceAverage(
      RES_FIC_IN,
      RES_FIC_OUT,
      0,
      OLD_PRICE_AV_IN,
      OLD_PRICE_AV_OUT,
      TIMESTAMP_2023,
    );
    // should be the same as timestamp is null
    expect(priceAvInReversed).to.be.eq(RES_FIC_IN);
    expect(priceAvOutReversed).to.be.eq(RES_FIC_OUT);
  });
  it("first timestamp same", async function () {
    const [priceAvIn, priceAvOut] = await this.contracts.smardexLibraryTest.getUpdatedPriceAverage(
      RES_FIC_IN,
      RES_FIC_OUT,
      TIMESTAMP_2023,
      OLD_PRICE_AV_IN,
      OLD_PRICE_AV_OUT,
      TIMESTAMP_2023,
    );

    expect(priceAvIn).to.be.eq(OLD_PRICE_AV_IN);
    expect(priceAvOut).to.be.eq(OLD_PRICE_AV_OUT);
  });
  it("first timestamp below current timestamp", async function () {
    await expect(
      this.contracts.smardexLibraryTest.getUpdatedPriceAverage(
        RES_FIC_IN,
        RES_FIC_OUT,
        TIMESTAMP_2023 + 1,
        OLD_PRICE_AV_IN,
        OLD_PRICE_AV_OUT,
        TIMESTAMP_2023,
      ),
    ).to.be.revertedWith("SmardexPair: INVALID_TIMESTAMP");
  });
  it(`timeDiff > ${MAX_BLOCK_DIFF_SECONDS}s`, async function () {
    const [priceAvIn, priceAvOut] = await this.contracts.smardexLibraryTest.getUpdatedPriceAverage(
      RES_FIC_IN,
      RES_FIC_OUT,
      TIMESTAMP_2023,
      OLD_PRICE_AV_IN,
      OLD_PRICE_AV_OUT,
      TIMESTAMP_2023 + 3000,
    );

    expect(priceAvIn).to.be.eq(RES_FIC_IN);
    expect(priceAvOut).to.be.eq(RES_FIC_OUT);
  });
  it("timeDiff = 12, Zero For One", async function () {
    const TIME_DIFF = 12;
    const [priceAvIn, priceAvOut] = await this.contracts.smardexLibraryTest.getUpdatedPriceAverage(
      RES_FIC_IN,
      RES_FIC_OUT,
      TIMESTAMP_2023,
      OLD_PRICE_AV_IN,
      OLD_PRICE_AV_OUT,
      TIMESTAMP_2023 + TIME_DIFF,
    );

    const oldPriceAv = parseFloat(formatEther(OLD_PRICE_AV_OUT)) / parseFloat(formatEther(OLD_PRICE_AV_IN));
    const newPrice = parseFloat(formatEther(RES_FIC_OUT)) / parseFloat(formatEther(RES_FIC_IN));
    const newPriceAv = (oldPriceAv * (MAX_TIME_DIFF - TIME_DIFF) + newPrice * TIME_DIFF) / MAX_TIME_DIFF;
    const newPriceAvRes = priceAvOut.mul(constants.WeiPerEther).div(priceAvIn);

    expect(newPriceAvRes).to.be.approximately(parseEther(newPriceAv.toString()), 150);
  });
  it("timeDiff = 12, One For Zero", async function () {
    const TIME_DIFF = 12;
    const [priceAvOut, priceAvIn] = await this.contracts.smardexLibraryTest.getUpdatedPriceAverage(
      RES_FIC_OUT,
      RES_FIC_IN,
      TIMESTAMP_2023,
      OLD_PRICE_AV_OUT,
      OLD_PRICE_AV_IN,
      TIMESTAMP_2023 + TIME_DIFF,
    );

    const oldPriceAv = parseFloat(formatEther(OLD_PRICE_AV_IN)) / parseFloat(formatEther(OLD_PRICE_AV_OUT));
    const newPrice = parseFloat(formatEther(RES_FIC_IN)) / parseFloat(formatEther(RES_FIC_OUT));
    const newPriceAv = (oldPriceAv * (MAX_TIME_DIFF - TIME_DIFF) + newPrice * TIME_DIFF) / MAX_TIME_DIFF;
    const newPriceAvRes = priceAvIn.mul(constants.WeiPerEther).div(priceAvOut);

    expect(newPriceAvRes).to.be.approximately(parseEther(newPriceAv.toString()), 150);
  });
  it(`timeDiff = ${MAX_BLOCK_DIFF_SECONDS.sub(24)}, Zero For One`, async function () {
    const TIME_DIFF = MAX_BLOCK_DIFF_SECONDS.sub(24).toNumber();
    const [priceAvIn, priceAvOut] = await this.contracts.smardexLibraryTest.getUpdatedPriceAverage(
      RES_FIC_IN,
      RES_FIC_OUT,
      TIMESTAMP_2023,
      OLD_PRICE_AV_IN,
      OLD_PRICE_AV_OUT,
      TIMESTAMP_2023 + TIME_DIFF,
    );

    const oldPriceAv = parseFloat(formatEther(OLD_PRICE_AV_OUT)) / parseFloat(formatEther(OLD_PRICE_AV_IN));
    const newPrice = parseFloat(formatEther(RES_FIC_OUT)) / parseFloat(formatEther(RES_FIC_IN));
    const newPriceAv = (oldPriceAv * (MAX_TIME_DIFF - TIME_DIFF) + newPrice * TIME_DIFF) / MAX_TIME_DIFF;
    const newPriceAvRes = priceAvOut.mul(constants.WeiPerEther).div(priceAvIn);

    expect(newPriceAvRes).to.be.approximately(parseEther(newPriceAv.toString()), 100);
  });
  it(`timeDiff = ${MAX_BLOCK_DIFF_SECONDS.sub(24)}, One For Zero`, async function () {
    const TIME_DIFF = MAX_BLOCK_DIFF_SECONDS.sub(24).toNumber();
    const [priceAvOut, priceAvIn] = await this.contracts.smardexLibraryTest.getUpdatedPriceAverage(
      RES_FIC_OUT,
      RES_FIC_IN,
      TIMESTAMP_2023,
      OLD_PRICE_AV_OUT,
      OLD_PRICE_AV_IN,
      TIMESTAMP_2023 + TIME_DIFF,
    );

    const oldPriceAv = parseFloat(formatEther(OLD_PRICE_AV_IN)) / parseFloat(formatEther(OLD_PRICE_AV_OUT));
    const newPrice = parseFloat(formatEther(RES_FIC_IN)) / parseFloat(formatEther(RES_FIC_OUT));
    const newPriceAv = (oldPriceAv * (MAX_TIME_DIFF - TIME_DIFF) + newPrice * TIME_DIFF) / MAX_TIME_DIFF;
    const newPriceAvRes = priceAvIn.mul(constants.WeiPerEther).div(priceAvOut);

    expect(newPriceAvRes).to.be.approximately(parseEther(newPriceAv.toString()), 1000);
  });
}
