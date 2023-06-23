import { baseContext } from "./contexts";
import { unitTestSmardexFactory } from "./SmardexFactory/SmardexFactory";
import { unitTestsSmardexPair } from "./SmardexPair/SmardexPair";
import { unitTestsSmardexRouter } from "./SmardexRouter/SmardexRouter";
import { unitTestsSmardexERC20 } from "./SmardexERC20/SmardexERC20";
import { unitTestsFarmingRange } from "./FarmingRange/FarmingRange";
import { unitTestsStaking } from "./Staking/Staking";
import { unitTestsAutoSwapper } from "./AutoSwapper/AutoSwapper";
import { unitTestsRewardManager } from "./RewardManager/RewardManager";
import { unitTestsSmardexLibrary } from "./SmardexLibrary/SmardexLibrary";

baseContext("Unit Tests", function () {
  unitTestsSmardexERC20();
  unitTestSmardexFactory();
  unitTestsSmardexPair();
  unitTestsSmardexRouter();
  unitTestsFarmingRange();
  unitTestsAutoSwapper();
  unitTestsRewardManager();
  unitTestsStaking();
  unitTestsSmardexLibrary();
});
