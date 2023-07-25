// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

interface IFarmingRangeArbitrum {
    /**
     * @notice return arbitrum L2 block.number
     */
    function arbitrumBlockNumber() external returns (uint256);
}
