import { BigNumber, constants } from "ethers";
import { expect } from "chai";
import { formatEther, parseEther } from "ethers/lib/utils";
import { advanceBlockTo } from "../helpers/time";

import { FarmingRange, FarmingRangeL2Arbitrum, ERC20Test, SmardexTokenTest } from "../../typechain";
import { unitFixtureFarmingRange } from "../fixtures";

export const INITIAL_BONUS_REWARD_PER_BLOCK = parseEther("100");

export interface CampaignInfo {
  startBlock: BigNumber;
  newWeight?: number;
}

export interface RewardInfo {
  endBlock: BigNumber;
  rewardPerBlock: BigNumber;
  newRewardPerBlock?: BigNumber;
  campaignId?: number;
}

export interface FarmingData {
  campaignInfoData: CampaignInfo[];
  rewardInfoData: RewardInfo[][];
}

export interface SdexByEndBlock {
  amount: BigNumber;
  endBlock: number;
}

interface NewRewardPerBlock {
  rewardPerBlock: BigNumber[];
  endBlock: BigNumber[];
}

export interface DataForTxMultiple {
  campaignId: number[];
  rewardIndex: number[][];
  endBlock: BigNumber[][];
  rewardPerBlock: BigNumber[][];
}

export interface DataForTxSingle {
  campaignId: number;
  rewardIndex: number[];
  endBlock: BigNumber[];
  rewardPerBlock: BigNumber[];
}

export async function checkTotalRewards(farming: FarmingRange) {
  //check totalReward
  const campaignInfoBeforeUpdate = await farming.campaignInfo(0);
  const rewardBefore1 = await farming.campaignRewardInfo(0, 0);
  const rewardBefore2 = await farming.campaignRewardInfo(0, 1);
  expect(campaignInfoBeforeUpdate.totalRewards).to.be.eq(
    rewardBefore1.rewardPerBlock
      .mul(rewardBefore1.endBlock.sub(campaignInfoBeforeUpdate.startBlock))
      .add(rewardBefore2.rewardPerBlock.mul(rewardBefore2.endBlock.sub(rewardBefore1.endBlock))),
  );
}

function getIndexByEndBlock(data: SdexByEndBlock[], endBlockToFind: number): number {
  return data.findIndex(x => x.endBlock === endBlockToFind);
}

export function getDataForTxMultiple(
  farmingDataBefore: FarmingData,
  farmingDataUpdated: FarmingData,
  sdexToSplit: SdexByEndBlock[],
  campaignIndex: number[],
  blockExec: number,
  currentBlock: number,
): DataForTxMultiple {
  const dataForTx: DataForTxMultiple = {
    campaignId: campaignIndex,
    rewardIndex: [],
    endBlock: [],
    rewardPerBlock: [],
  };

  for (let i = 0; i < campaignIndex.length; i++) {
    const data = getDataForTx(
      farmingDataBefore,
      farmingDataUpdated,
      sdexToSplit,
      campaignIndex[i],
      blockExec,
      currentBlock,
    );
    dataForTx.rewardIndex[i] = data.rewardIndex;
    dataForTx.endBlock[i] = data.endBlock;
    dataForTx.rewardPerBlock[i] = data.rewardPerBlock;
  }

  console.log("----update value by block end  ");
  sdexToSplit.forEach(byEndBlock => {
    let amount: BigNumber = constants.Zero;
    for (let i = 0; i < dataForTx.campaignId.length; i++) {
      const currentIndex: number = dataForTx.endBlock[i].findIndex(x => x.eq(byEndBlock.endBlock));
      if (currentIndex === -1) {
        console.log("didnt found index for " + byEndBlock.endBlock + " in campaign id " + dataForTx.campaignId[i]);
      } else {
        const blockLength =
          currentIndex === 0
            ? dataForTx.endBlock[i][currentIndex].sub(blockExec)
            : dataForTx.endBlock[i][currentIndex].sub(dataForTx.endBlock[i][currentIndex - 1]);

        amount = amount.add(blockLength.mul(dataForTx.rewardPerBlock[i][currentIndex]));
      }
    }
    console.log("end block :", byEndBlock.endBlock);
    console.log("amount :", formatEther(amount));
  });

  return dataForTx;
}

export function getDataForTx(
  farmingDataBefore: FarmingData,
  farmingDataUpdated: FarmingData,
  sdexToSplit: SdexByEndBlock[],
  campaignIndex: number,
  blockExec: number,
  currentBlock: number,
): DataForTxSingle {
  const dataForTx: DataForTxSingle = {
    campaignId: campaignIndex,
    rewardIndex: [],
    endBlock: [],
    rewardPerBlock: [],
  };
  const lowerBlockInUpdate: BigNumber = farmingDataBefore.rewardInfoData[campaignIndex]
    .map(x => x.endBlock)
    .filter(x => x.gt(blockExec))
    .reduce((x, y) => (x.lt(y) ? x : y));
  console.log("lower block :", lowerBlockInUpdate);
  let currentRewardIndex = farmingDataBefore.rewardInfoData[campaignIndex].findIndex(x =>
    x.endBlock.eq(lowerBlockInUpdate),
  );
  console.log("currentRewardIndex :", currentRewardIndex);
  console.log(farmingDataUpdated.rewardInfoData[campaignIndex][currentRewardIndex]);

  if (currentBlock < blockExec) {
    dataForTx.rewardIndex.push(currentRewardIndex);
    dataForTx.endBlock.push(BigNumber.from(blockExec));
    dataForTx.rewardPerBlock.push(farmingDataUpdated.rewardInfoData[campaignIndex][currentRewardIndex].rewardPerBlock);

    currentRewardIndex++;
  }

  for (let k = 0; k < sdexToSplit.length; k++) {
    const endBlock = BigNumber.from(sdexToSplit[k].endBlock);

    if (endBlock.gt(blockExec)) {
      const updatedRewardInfo = farmingDataUpdated.rewardInfoData[campaignIndex].find(x => x.endBlock.eq(endBlock));
      if (updatedRewardInfo === undefined) {
        throw new Error("no updatedRewardInfo for campaignId " + campaignIndex + " endBlock " + endBlock);
      }
      const newRewardPerBlock: BigNumber | undefined = updatedRewardInfo.rewardPerBlock;
      if (newRewardPerBlock === undefined) {
        console.log(updatedRewardInfo);
        throw new Error("no newRewardPerBlock for campaignId " + campaignIndex + " endBlock " + endBlock);
      }
      dataForTx.rewardIndex.push(currentRewardIndex);
      dataForTx.endBlock.push(endBlock);
      dataForTx.rewardPerBlock.push(newRewardPerBlock);

      currentRewardIndex++;
    }
  }

  return dataForTx;
}

export function updateFarmingDataWithNewRewardPerBlock(
  farmingData: FarmingData,
  sdexToSplit: SdexByEndBlock[],
  campaignIndexesToUpdate: number[],
  campaignIndexesToAdd: number[],
  blockNumberToBeExecuted: number,
  weightSum: number,
): FarmingData {
  for (let i = 0; i < campaignIndexesToUpdate.length; i++) {
    const campaignId = campaignIndexesToUpdate[i];
    const newRewardPerBlock: NewRewardPerBlock = generateNewRewardPerBlock(
      farmingData,
      sdexToSplit,
      campaignId,
      blockNumberToBeExecuted,
      weightSum,
    );

    farmingData = updateCampaignReward(
      farmingData,
      campaignId,
      newRewardPerBlock.endBlock,
      newRewardPerBlock.rewardPerBlock,
      blockNumberToBeExecuted,
    );
  }

  for (let i = 0; i < campaignIndexesToAdd.length; i++) {
    const campaignId = campaignIndexesToAdd[i];
    const newRewardPerBlock: NewRewardPerBlock = generateNewRewardPerBlock(
      farmingData,
      sdexToSplit,
      campaignId,
      blockNumberToBeExecuted,
      weightSum,
    );

    farmingData = addCampaignReward(
      farmingData,
      newRewardPerBlock.endBlock,
      newRewardPerBlock.rewardPerBlock,
      campaignId,
    );
  }
  return farmingData;
}

function generateNewRewardPerBlock(
  farmingData: FarmingData,
  sdexToSplit: SdexByEndBlock[],
  campaignId: number,
  blockNumberToBeExecuted: number,
  weightSum: number,
): NewRewardPerBlock {
  const data: NewRewardPerBlock = {
    rewardPerBlock: [],
    endBlock: [],
  };

  let newWeight: number = -1;

  if (farmingData.campaignInfoData[campaignId].newWeight !== undefined) {
    newWeight = farmingData.campaignInfoData[campaignId].newWeight!;
  } else {
    throw new Error("new weight missing for campaign id " + campaignId);
  }

  for (let k = 0; k < sdexToSplit.length; k++) {
    let nbBlocks: number;

    if (k === 0) {
      nbBlocks = sdexToSplit[0].endBlock - farmingData.campaignInfoData[campaignId].startBlock.toNumber();
    } else if (
      sdexToSplit[k].endBlock > blockNumberToBeExecuted &&
      sdexToSplit[k - 1].endBlock <= blockNumberToBeExecuted
    ) {
      nbBlocks = sdexToSplit[k].endBlock - blockNumberToBeExecuted;
    } else {
      nbBlocks = sdexToSplit[k].endBlock - sdexToSplit[k - 1].endBlock;
    }
    data.endBlock.push(BigNumber.from(sdexToSplit[k].endBlock));
    data.rewardPerBlock.push(sdexToSplit[k].amount.mul(newWeight).div(weightSum).div(nbBlocks));
  }

  return data;
}

export function sdexToRedistributeByEndBlock(
  farmingData: FarmingData,
  campaignIndexes: number[],
  endBlock: number[],
  blockNumberToExecute: number,
): SdexByEndBlock[] {
  const data: SdexByEndBlock[] = [];
  endBlock.forEach(x => {
    data.push({
      endBlock: x,
      amount: constants.Zero,
    });
  });

  for (let i = 0; i < campaignIndexes.length; i++) {
    for (let k = 0; k < farmingData.rewardInfoData[campaignIndexes[i]].length; k++) {
      if (isRewardInfoCrossing(farmingData, campaignIndexes[i], k, blockNumberToExecute)) {
        const dataIndexToUpdate = getIndexByEndBlock(
          data,
          farmingData.rewardInfoData[campaignIndexes[i]][k].endBlock.toNumber(),
        );
        data[dataIndexToUpdate].amount = data[dataIndexToUpdate].amount.add(
          farmingData.rewardInfoData[campaignIndexes[i]][k].rewardPerBlock.mul(
            farmingData.rewardInfoData[campaignIndexes[i]][k].endBlock.sub(blockNumberToExecute),
          ),
        );
      } else if (isRewardInfoAfter(farmingData, campaignIndexes[i], k, blockNumberToExecute)) {
        const dataIndexToUpdate = getIndexByEndBlock(
          data,
          farmingData.rewardInfoData[campaignIndexes[i]][k].endBlock.toNumber(),
        );
        data[dataIndexToUpdate].amount = data[dataIndexToUpdate].amount.add(
          farmingData.rewardInfoData[campaignIndexes[i]][k].rewardPerBlock.mul(
            farmingData.rewardInfoData[campaignIndexes[i]][k].endBlock.sub(
              farmingData.rewardInfoData[campaignIndexes[i]][k - 1].endBlock,
            ),
          ),
        );
      }
    }
  }

  console.log(
    "------sdex to distribute :",
    formatEther(data.map(x => x.amount).reduce((prev, next) => prev.add(next))),
  );
  data.forEach(x => {
    console.log("****");
    console.log("end block : " + x.endBlock);
    console.log("amount : " + formatEther(x.amount));
  });
  return data;
}

export async function loadFarmingData(farming: FarmingRange): Promise<FarmingData> {
  const farmingData: FarmingData = {
    campaignInfoData: [],
    rewardInfoData: [],
  };

  const campaignInfoLen = await farming.campaignInfoLen();
  for (let i = 0; i < campaignInfoLen.toNumber(); i++) {
    const rewardInfoLen = await farming.rewardInfoLen(i);
    farmingData.campaignInfoData[i] = {
      startBlock: (await farming.campaignInfo(i)).startBlock,
    };
    farmingData.rewardInfoData[i] = [];
    for (let k = 0; k < rewardInfoLen.toNumber(); k++) {
      farmingData.rewardInfoData[i][k] = await farming.campaignRewardInfo(i, k);
    }
  }

  return farmingData;
}

export function computeFarmingSdexValue(farmingData: FarmingData): BigNumber {
  let amount = BigNumber.from(0);

  for (let i = 0; i < farmingData.campaignInfoData.length; i++) {
    amount = amount.add(computeFarmingSdexValueOneCampaign(farmingData, i));
  }

  return amount;
}

export function computeFarmingSdexValueOneCampaign(farmingData: FarmingData, campaignId: number): BigNumber {
  let amount = BigNumber.from(0);

  for (let k = 0; k < farmingData.rewardInfoData[campaignId].length; k++) {
    amount = amount.add(computeFarmingSdexValueOneRewardInfo(farmingData, campaignId, k));
  }

  return amount;
}

export function computeFarmingSdexValueOneRewardInfo(
  farmingData: FarmingData,
  campaignId: number,
  rewardIndex: number,
): BigNumber {
  if (rewardIndex === 0) {
    return farmingData.rewardInfoData[campaignId][rewardIndex].rewardPerBlock.mul(
      farmingData.rewardInfoData[campaignId][rewardIndex].endBlock.sub(
        farmingData.campaignInfoData[campaignId].startBlock,
      ),
    );
  } else {
    return farmingData.rewardInfoData[campaignId][rewardIndex].rewardPerBlock.mul(
      farmingData.rewardInfoData[campaignId][rewardIndex].endBlock.sub(
        farmingData.rewardInfoData[campaignId][rewardIndex - 1].endBlock,
      ),
    );
  }
}

export function addCampaign(
  farmingData: FarmingData,
  endBlock: BigNumber[],
  rewardPerBlock: BigNumber[],
  blockNumberToBeExecuted: number,
): FarmingData {
  farmingData.campaignInfoData.push({
    startBlock: BigNumber.from(blockNumberToBeExecuted),
  });
  const newCampaignIndex = farmingData.campaignInfoData.length - 1;
  farmingData.rewardInfoData[newCampaignIndex] = [];

  farmingData = addCampaignReward(farmingData, endBlock, rewardPerBlock, newCampaignIndex);
  return farmingData;
}

function addCampaignReward(
  farmingData: FarmingData,
  endBlock: BigNumber[],
  rewardPerBlock: BigNumber[],
  campaignIndex: number,
): FarmingData {
  for (let i = 0; i < endBlock.length; i++) {
    farmingData.rewardInfoData[campaignIndex].push({
      endBlock: endBlock[i],
      rewardPerBlock: rewardPerBlock[i],
    });
  }
  return farmingData;
}

export function updateCampaignReward(
  farmingData: FarmingData,
  campaignIndex: number,
  endBlock: BigNumber[],
  rewardPerBlock: BigNumber[],
  blockNumberToBeExecuted: number,
): FarmingData {
  for (let i = 0; i < farmingData.rewardInfoData[campaignIndex].length; i++) {
    if (isRewardInfoCrossing(farmingData, campaignIndex, i, blockNumberToBeExecuted)) {
      farmingData.rewardInfoData[campaignIndex].splice(i, 0, {
        endBlock: BigNumber.from(blockNumberToBeExecuted),
        rewardPerBlock: farmingData.rewardInfoData[campaignIndex][i].rewardPerBlock,
      });
      farmingData.rewardInfoData[campaignIndex][i + 1] = {
        ...farmingData.rewardInfoData[campaignIndex][i + 1],
        rewardPerBlock: BigNumber.from(blockNumberToBeExecuted),
      };
    } else if (isRewardInfoAfter(farmingData, campaignIndex, i, blockNumberToBeExecuted)) {
      for (let k = 0; k < endBlock.length; k++) {
        if (farmingData.rewardInfoData[campaignIndex][i].endBlock.eq(endBlock[k])) {
          farmingData.rewardInfoData[campaignIndex][i] = {
            ...farmingData.rewardInfoData[campaignIndex][i],
            rewardPerBlock: rewardPerBlock[k],
          };
          break;
        }
      }
    }
  }

  return farmingData;
}

export function removeCampaign(
  farmingData: FarmingData,
  campaignToRemove: number,
  blockNumberToBeExecuted: number,
): FarmingData {
  for (let i = 0; i < farmingData.rewardInfoData[campaignToRemove].length; i++) {
    if (isRewardInfoCrossing(farmingData, campaignToRemove, i, blockNumberToBeExecuted)) {
      farmingData.rewardInfoData[campaignToRemove][i] = {
        ...farmingData.rewardInfoData[campaignToRemove][i],
        endBlock: BigNumber.from(blockNumberToBeExecuted),
      };
    } else if (isRewardInfoAfter(farmingData, campaignToRemove, i, blockNumberToBeExecuted)) {
      const qtyToRemove = farmingData.rewardInfoData[campaignToRemove].length - i;
      for (let k = 0; k < qtyToRemove; k++) {
        farmingData.rewardInfoData[campaignToRemove].pop();
      }
    }
  }
  return farmingData;
}

function isRewardInfoAfter(
  farmingData: FarmingData,
  campaignIndex: number,
  rewardInfoIndex: number,
  blockNumberToBeExecuted: number,
): boolean {
  return (
    farmingData.rewardInfoData[campaignIndex][rewardInfoIndex].endBlock.gt(blockNumberToBeExecuted) &&
    farmingData.rewardInfoData[campaignIndex][rewardInfoIndex - 1].endBlock.gte(blockNumberToBeExecuted)
  );
}

export function isRewardInfoCrossing(
  farmingData: FarmingData,
  campaignIndex: number,
  rewardInfoIndex: number,
  blockNumberToBeExecuted: number,
): boolean {
  return (
    (rewardInfoIndex === 0 &&
      farmingData.rewardInfoData[campaignIndex][rewardInfoIndex].endBlock.gt(blockNumberToBeExecuted)) ||
    (farmingData.rewardInfoData[campaignIndex][rewardInfoIndex].endBlock.gt(blockNumberToBeExecuted) &&
      farmingData.rewardInfoData[campaignIndex][rewardInfoIndex - 1].endBlock.lt(blockNumberToBeExecuted))
  );
}

export async function checkDataFarming(
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

export async function addRewardsInfos(
  nbRewardInfo: number,
  farming: FarmingRange | FarmingRangeL2Arbitrum,
  stakingToken: ERC20Test,
  rewardToken: SmardexTokenTest,
  mockedBlock: BigNumber,
): Promise<void> {
  const rewardManagerAddress: string = await farming.rewardManager();
  await rewardToken.mint(rewardManagerAddress, nbRewardInfo * 2);

  await farming.addCampaignInfo(stakingToken.address, rewardToken.address, mockedBlock.add(8));

  await farming.setRewardInfoLimit(nbRewardInfo);

  // addRewardInfoMultiple not revert
  // out of gas bellow around 470 iterations
  // It's arbitrary setup 400 as bulkAmount
  // to speedup tests
  const bulkAmount: number = 400;

  if (nbRewardInfo > bulkAmount) {
    // amount of iterations as integer
    const iterations: number = parseInt((nbRewardInfo / bulkAmount).toString());

    // possible remaining transactions
    const remainings: number = nbRewardInfo % bulkAmount;

    // bulk transactions
    for (let i = 0; i < iterations; i++) {
      await (
        await farming.addRewardInfoMultiple(
          0,
          Array(iterations)
            .fill(0)
            .map((e, j) => i * iterations + j + mockedBlock.toNumber() + 10),
          Array(iterations).fill(1),
        )
      ).wait();
    }

    // remaining transactions
    if (remainings > 0) {
      await (
        await farming.addRewardInfoMultiple(
          0,
          Array(remainings)
            .fill(0)
            .map((e, i) => iterations * bulkAmount + i + mockedBlock.toNumber() + 10),
          Array(remainings).fill(1),
        )
      ).wait();
    }
  } else {
    // direct bulk transaction
    await (
      await farming.addRewardInfoMultiple(
        0,
        Array(nbRewardInfo)
          .fill(0)
          .map((e, i) => i + mockedBlock.toNumber() + 10),
        Array(nbRewardInfo).fill(1),
      )
    ).wait();
  }

  await advanceBlockTo(mockedBlock.add(20 + nbRewardInfo).toNumber());
}

export async function addCampaignAndCreateRewards(
  farming: Awaited<ReturnType<typeof unitFixtureFarmingRange>>,
  user: string,
  admin: string,
) {
  await farming.rewardTokenAsDeployer.mint(
    admin,
    INITIAL_BONUS_REWARD_PER_BLOCK.mul(farming.mockedBlock.add(8).sub(farming.mockedBlock.add(6))),
  );

  await farming.farmingRangeAsDeployer.addCampaignInfo(
    farming.stakingToken.address,
    farming.rewardToken.address,
    farming.mockedBlock.add(6),
  );

  await farming.farmingRangeAsDeployer.addRewardInfo(0, farming.mockedBlock.add(8), INITIAL_BONUS_REWARD_PER_BLOCK);
  await farming.stakingTokenAsDeployer.mint(user, parseEther("100"));
  await farming.stakingTokenAsAlice.approve(farming.farmingRange.address, parseEther("100"));
  await farming.farmingRangeAsAlice.deposit(constants.Zero, parseEther("100"), user);
}
