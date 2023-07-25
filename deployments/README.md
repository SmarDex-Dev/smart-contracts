## New SmarDex contracts deployments L1 L2 - july 2023

### Requirements

caution: please remember to set startBlockStaking in 004_reward_manager
for mainnet then uncomment related throw in 001_smardex_factory.

### Setup

WETH artifacts:

- Ethereum:       "WETH9"
- Binance Chain:  "WBNB"
- Polygon:        "WMATIC"
- Arbitrum:       "aeWETH"

Network name:

- Ethereum:       "ethereum"
- Binance Chain:  "bsc"
- Polygon:        "polygon"
- Arbitrum:       "arbitrum"

1 - Follow .env.example to set your .env file

2 - In case you want to create one or all related chain pairs and addLiquidity:

a chain object must be placed in deploy/utils.ts inside chainsData variable as the template below:

```
    {
        network: "ethereum", // replace with a network name above

        // token to set:
        // TetherToken and TestToken will
        // be deployed on testnet only.
        // All others must exist on L1 and L2s.
        tokens: [{
            name: "SDEX", // any token name
            symbol: "SDEX", // usefull in case we want to deploy
            decimals: "18", // usefull in case we want to deploy
            artifact: "SmardexToken", // if SmarDexToken or a WETH otherwise empty ""
            address: "", // token address required on L1 and L2s otherwise empty ""
        },{
            name: "WETH",
            symbol: "WETH",
            decimals: "18",
            artifact: "WETH9",
            address: "",
        }],

        // pairs to deploy if not exist
        pairs: [{
            tokenA: "SDEX", // token name
            amountA: "100000000000000000000", // in wei.
            tokenB: "WETH", // token name
            amountB: "265249807852173", // in wei.
            address: "", // empty ""
        }]
    }
```

### Deployments

**ETHEREUM**

```
// deploy all contracts
yarn deploy_ethereum

// or by tags
yarn deploy --network ethereum --tags SmardexRouter,RewardManager,AutoSwapper // replace by tag name
```

tags:

* *SmardexFactory*
* *SmardexRouter*
* *SmardexToken*
* *RewardManager* => (Staking + FarmingRange)
* *AutoSwapper*
* *Pairs*

**ARBITRUM**

```
// deploy all contracts
yarn deploy_arbitrum

// or by tag
yarn deploy --network arbitrum --tags SmardexFactory // replace by tag name
```

tags:

* *SmardexFactory*
* *SmardexRouter*
* *SmardexToken*
* *RewardManagerL2Arbitrum* => (FarmingRangeL2Arbitrum)
* AutoSwapperL2
* *Pairs*

**BSC**

```
// deploy all contracts
yarn deploy_bsc

// or by tag
yarn deploy --network bsc --tags SmardexFactory // replace by tag name
```

tags:

* *SmardexFactory*
* *SmardexRouter*
* *SmardexToken*
* *RewardManagerL2* => (FarmingRange)
* *AutoSwapperL2*
* *Pairs*

**POLYGON**

```
// deploy all contracts
yarn deploy_polygon

// or by tag
yarn deploy --network polygon --tags SmardexFactory // replace by tag name
```

tags:

* *SmardexFactory*
* *SmardexRouter*
* *SmardexToken*
* *RewardManagerL2* => (FarmingRange)
* *AutoSwapperL2*
* *Pairs*
