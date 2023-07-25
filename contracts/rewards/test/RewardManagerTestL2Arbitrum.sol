// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.17;

import "../RewardManagerL2Arbitrum.sol";

contract RewardManagerTestL2Arbitrum is RewardManagerL2Arbitrum {
    constructor(address _farmingOwner) RewardManagerL2Arbitrum(_farmingOwner) {}

    function setAllowance(address _token, uint256 _amount) external {
        TransferHelper.safeApprove(_token, address(farming), _amount);
    }
}
