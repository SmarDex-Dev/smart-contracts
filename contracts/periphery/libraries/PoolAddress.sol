// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity =0.8.17;

// libraries
import "./PoolHelpers.sol";

// interfaces
import "../../core/interfaces/ISmardexFactory.sol";

library PoolAddress {
    /**
     * @notice Deterministically computes the pool address given the factory and PoolKey. Also check the whitelist first.
     * @param _factory The SmarDex factory contract address
     * @param _tokenA The first token of the pool
     * @param _tokenB The second token of the pool
     * @param _whitelist storage mapping with the pair address as value
     * @return pair_ The contract address of the SmardexPair
     */
    function pairFor(
        address _factory,
        address _tokenA,
        address _tokenB,
        mapping(bytes32 => address) storage _whitelist
    ) internal view returns (address pair_) {
        // get hash, used to check the whitelist AND compute the pair address with init hash
        bytes32 _hash = getTokenHash(_factory, _tokenA, _tokenB);

        // check the whitelist (1 SLOAD)
        pair_ = _whitelist[_hash];
        if (pair_ == address(0)) {
            pair_ = address(uint160(uint256(_hash)));
        }
    }

    /**
     * @notice Deterministically computes the pool address given the factory and PoolKey
     * @param _factory The SmarDex factory contract address
     * @param _tokenA The first token of the pool
     * @param _tokenB The second token of the pool
     * @return hash_ The hash of the pair
     */
    function getTokenHash(address _factory, address _tokenA, address _tokenB) internal pure returns (bytes32 hash_) {
        (address _token0, address _token1) = PoolHelpers.sortTokens(_tokenA, _tokenB);
        hash_ = keccak256(
            abi.encodePacked(
                hex"ff",
                _factory,
                keccak256(abi.encodePacked(_token0, _token1)),
                hex"c762a0f9885cc92b9fd8eef224b75997682b634460611bc0f2138986e20b653f" // init code hash
            )
        );
    }
}
