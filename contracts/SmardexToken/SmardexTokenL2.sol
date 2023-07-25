// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.17;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title SmardexToken L2 (SDEX), ERC-20 token
 * @notice ERC20 representation of SDEX on L2s
 */
contract SmardexTokenL2 is ERC20 {
    constructor(string memory _name, string memory _symbol) ERC20(_name, _symbol) {}
}
