// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.17;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

/**
 * @title Test Token
 * @notice Inherit from the ERC20Permit, allowing to sign approve off chain
 */
contract TestToken is ERC20Permit {
    uint8 private immutable _decimals;

    constructor(string memory _name, string memory _symbol, uint8 decimals_) ERC20(_name, _symbol) ERC20Permit(_name) {
        _decimals = decimals_;
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external {
        _burn(from, amount);
    }
}
