// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity =0.8.17;

// libraries
import "../libraries/PoolAddressV1.sol";
import "../SmardexRouterV2.sol";

contract SmardexRouterTestV2 is SmardexRouterV2 {
    constructor(address _factory, address _WETH) SmardexRouterV2(_factory, _WETH) {}

    function pairFor_pure(address factory, address tokenA, address tokenB) public pure returns (address pair) {
        pair = PoolAddressV1.pairFor(factory, tokenA, tokenB);
    }

    function mint(address _pair, address _to, uint256 _amount0, uint256 _amount1, address _payer) public {
        ISmardexPair(_pair).mint(_to, _amount0, _amount1, _payer);
    }

    function swap(address _pair, address _to, bool _zeroForOne, int256 _amountSpecified, bytes calldata _path) public {
        ISmardexPair(_pair).swap(_to, _zeroForOne, _amountSpecified, _path);
    }

    function unwrapWETHTest(uint256 _amountMinimum, address _to) external {
        _unwrapWETH(_amountMinimum, _to);
    }
}
