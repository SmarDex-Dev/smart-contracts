// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.17;

import "../RewardManager.sol";

contract RewardManagerTest is RewardManager {
    constructor(
        address _farmingOwner,
        IERC20 _smardexToken,
        uint256 _startFarmingCampaign
    ) RewardManager(_farmingOwner, _smardexToken, _startFarmingCampaign) {}

    function setAllowance(address _token, uint256 _amount) external {
        TransferHelper.safeApprove(_token, address(farming), _amount);
    }
}
