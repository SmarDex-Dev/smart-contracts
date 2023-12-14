// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity =0.8.17;

// libraries
import "./PoolHelpersV1.sol";

// interfaces
import "../../../../core/interfaces/ISmardexFactory.sol";

library PoolAddressV1 {
    /**
     * @notice Deterministically computes the pool address given the factory and PoolKey
     * @param _factory The SmarDex factory contract address
     * @param _tokenA The first token of the pool
     * @param _tokenB The second token of the pool
     * @return pair_ The contract address of the SmardexPair
     */
    function pairFor(address _factory, address _tokenA, address _tokenB) internal pure returns (address pair_) {
        (address token0, address token1) = PoolHelpersV1.sortTokens(_tokenA, _tokenB);
        pair_ = address(
            uint160(
                uint256(
                    keccak256(
                        abi.encodePacked(
                            hex"ff",
                            _factory,
                            keccak256(abi.encodePacked(token0, token1)),
                            hex"6d32bf72ec5cc02d3e64eaf60f63b064ca3cd98c7661d933bab660a552327576" // init code hash
                        )
                    )
                )
            )
        );
    }
}
