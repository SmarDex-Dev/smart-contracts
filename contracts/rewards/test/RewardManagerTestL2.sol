// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.17;

import "../RewardManagerL2.sol";

contract RewardManagerTestL2 is RewardManagerL2 {
    constructor(address _farmingOwner) RewardManagerL2(_farmingOwner) {}

    function setAllowance(address _token, uint256 _amount) external {
        TransferHelper.safeApprove(_token, address(farming), _amount);
    }
}
