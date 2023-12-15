// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.17;

interface IRewardManagerWithdrawable {
    /**
     * @notice used to get retrieve tokens
     * @param _token token contract address to retrieve
     * @param _amount amount of token to retrieve
     * @param _to address to send the tokens
     */
    function withdrawFunds(address _token, uint256 _amount, address _to) external;
}
