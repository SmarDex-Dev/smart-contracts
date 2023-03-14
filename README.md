# SmarDex Contracts

[![Tests](https://github.com/SmarDex-Dev/smart-contracts/actions/workflows/ci.yml/badge.svg)](https://github.com/SmarDex-Dev/smart-contracts/actions/workflows/ci.yml)

## Description

Uniswap-like dex protocol that allow a better incentivization for liquidity providers.
This repo includes an SDEX pool (rewards comes from the dex) and farming capabilities (rewards requires external income source).

## Website

https://smardex.io

## Documentation

See the link to the technical paper or visit the Smardex Developer docs

- https://www.academia.edu/98332701/The_SMARDEX_Protocol_A_Novel_Solution_to_Impermanent_Loss_in_Decentralized_Finance
- https://docs.smardex.io

## Getting Started

### Installation

Install dependencies:

`yarn install`

### Compile

`yarn compile`

To rebuild typechain specifically:

`yarn typechain`

### Run tests

`yarn test`

### Deploy

#### Testnet (mumbai)

`yarn deploy_testnet`

#### Hardhat (test deploy script)

`yarn deploy`

### Prettier

Run linter (required before each commit):

`yarn prettier`

Check code is properly linted:

`yarn prettier:check`

### Slither

For quick and automatic syntaxic analysis, you can use Slither tool :
Slither is a Solidity static analysis framework. It runs a suite of vulnerability detectors, prints visual information about contract details. [...] Slither enables developers to find vulnerabilities, enhance their code comprehension, and quickly prototype custom analyses.

#### Install

See for options :
https://github.com/crytic/slither#how-to-install

#### Run

At project level (where package.json is):

```sh
slither . --json slither_output.json
#slither is called system wide, but an absolute or relative binary call can also be used
```

Better run with yarn to avoid errors & with config to choose printers_to_run :
`yarn slither`

## Contributors

Implemented by [Stéphane Ballmer](https://github.com/sballmer), [Paul-Alexandre Tessier](https://github.com/Paulalex85) and [Côme Pecorari](https://github.com/cpecorari)

## Licensing

The primary license for Smardex is the Business Source License 1.1 (BUSL-1.1), see [LICENSE](LICENSE). However, smart-contract files imported from other projects do respect their original license (GPL-3, GPL-2, MIT, ...)

- All files under `periphery` are GPL-2
- All files under `core` except `core/libraries/SmardexLibrary.sol` are GPL-2
- `contracts/rewards/FarmingRange.sol` is licensed under MIT, fork from Alpaca Finance
