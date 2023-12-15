// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.17;

// contracts
import "./RewardManagerL2.sol";

// interfaces
import "./interfaces/IRewardManagerWithdrawable.sol";

/**
 * @title RewardManagerWithdrawable
 * @notice RewardManagerWithdrawable handles the creation of the contract farming
 * The RewardManager is the owner of the funds in the FarmingRange,
 * only the RewardManager is capable of sending funds to be farmed and only the RewardManager will get
 * the funds back when updating of removing campaigns. The specificity of the withdrawable reward manager
 * is that it's used for promoted campaigns, and thus the needs to be able to withdraw funds is here.
 */
contract RewardManagerWithdrawable is RewardManagerL2, IRewardManagerWithdrawable {
    constructor(address _farming) RewardManagerL2(_farming) {}

    /// @inheritdoc IRewardManagerWithdrawable
    function withdrawFunds(address _token, uint256 _amount, address _to) external {
        require(
            msg.sender == Ownable(address(farming)).owner(),
            "RewardManager:withdrawFunds:Only the farming owner can withdraw funds"
        );

        TransferHelper.safeTransfer(_token, _to, _amount);
    }
}
