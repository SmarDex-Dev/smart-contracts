// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

contract ArbSysCoreTest {
    /**
     * @notice Get Arbitrum block number (distinct from L1 block number; Arbitrum genesis block has block number 0)
     * @return block number as int
     */
    function arbBlockNumber() external view returns (uint256) {
        return block.number;
    }
}
