// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.17;

// contracts
import "./FarmingRangeL2Arbitrum.sol";

// libraries
import "../core/libraries/TransferHelper.sol";

// interfaces
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IRewardManagerL2.sol";

/**
 * @title RewardManagerL2Arbitrum
 * @notice RewardManagerL2Arbitrum handles the creation of the contract farming
 * The RewardManager is the owner of the funds in the FarmingRangeArbitrum,
 * only the RewardManager is capable of sending funds to be farmed and only the RewardManager will get
 * the funds back when updating of removing campaigns.
 * Use only for Arbitrum chain
 */
contract RewardManagerL2Arbitrum is IRewardManagerL2 {
    bytes4 private constant TRANSFER_OWNERSHIP_SELECTOR = bytes4(keccak256(bytes("transferOwnership(address)")));

    IFarmingRange public immutable farming;

    /**
     * @param _farmingOwner address who will own the farming
     */
    constructor(address _farmingOwner) {
        farming = new FarmingRangeL2Arbitrum(address(this));

        address(farming).call(abi.encodeWithSelector(TRANSFER_OWNERSHIP_SELECTOR, _farmingOwner));
    }

    /// @inheritdoc IRewardManagerL2
    function resetAllowance(uint256 _campaignId) external {
        require(_campaignId < farming.campaignInfoLen(), "RewardManager:campaignId:wrong campaign ID");

        (, IERC20 _rewardToken, , , , , ) = farming.campaignInfo(_campaignId);

        // In case of tokens like USDT, an approval must be set to zero before setting it to another value.
        // Unlike most tokens, USDT does not ignore a non-zero current allowance value, leading to a possible
        // transaction failure when you are trying to change the allowance.
        if (_rewardToken.allowance(address(this), address(farming)) != 0) {
            TransferHelper.safeApprove(address(_rewardToken), address(farming), 0);
        }

        // After ensuring that the allowance is zero (or it was zero to begin with), we then set the allowance to max.
        TransferHelper.safeApprove(address(_rewardToken), address(farming), type(uint256).max);
    }
}
