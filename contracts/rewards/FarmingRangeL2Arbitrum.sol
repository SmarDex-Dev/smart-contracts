// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

// contracts
import "./FarmingRange.sol";

// interfaces
import "./interfaces/IFarmingRangeL2Arbitrum.sol";
import "./interfaces/IArbSys.sol";

/**
 * @title FarmingRangeArbitrum
 * @notice Farming Range allows users to stake LP Tokens to receive various rewards on Arbitrum
 * @custom:from Contract taken from the alpaca protocol, adapted to version 0.8.17 and modified with more functions
 * @custom:url https://github.com/alpaca-finance/bsc-alpaca-contract/blob/main/solidity/contracts/6.12/GrazingRange.sol
 */
contract FarmingRangeL2Arbitrum is FarmingRange, IFarmingRangeArbitrum {
    using SafeERC20 for IERC20;

    constructor(address _rewardManager) FarmingRange(_rewardManager) {}

    /// @inheritdoc FarmingRange
    function addCampaignInfo(
        IERC20 _stakingToken,
        IERC20 _rewardToken,
        uint256 _startBlock
    ) external override onlyOwner {
        require(
            _startBlock > arbitrumBlockNumber(),
            "FarmingRange::addCampaignInfo::Start block should be in the future"
        );
        campaignInfo.push(
            CampaignInfo({
                stakingToken: _stakingToken,
                rewardToken: _rewardToken,
                startBlock: _startBlock,
                lastRewardBlock: _startBlock,
                accRewardPerShare: 0,
                totalStaked: 0,
                totalRewards: 0
            })
        );
        emit AddCampaignInfo(campaignInfo.length - 1, _stakingToken, _rewardToken, _startBlock);
    }

    /// @inheritdoc FarmingRange
    function addRewardInfo(
        uint256 _campaignID,
        uint256 _endBlock,
        uint256 _rewardPerBlock
    ) public override onlyOwner nonReentrant {
        RewardInfo[] storage rewardInfo = campaignRewardInfo[_campaignID];
        CampaignInfo storage campaign = campaignInfo[_campaignID];
        require(
            rewardInfo.length < rewardInfoLimit,
            "FarmingRange::addRewardInfo::reward info length exceeds the limit"
        );
        require(
            rewardInfo.length == 0 || rewardInfo[rewardInfo.length - 1].endBlock >= arbitrumBlockNumber(),
            "FarmingRange::addRewardInfo::reward period ended"
        );
        require(
            rewardInfo.length == 0 || rewardInfo[rewardInfo.length - 1].endBlock < _endBlock,
            "FarmingRange::addRewardInfo::bad new endblock"
        );
        uint256 _startBlock = rewardInfo.length == 0 ? campaign.startBlock : rewardInfo[rewardInfo.length - 1].endBlock;
        uint256 _blockRange = _endBlock - _startBlock;
        uint256 _totalRewards = _rewardPerBlock * _blockRange;
        campaign.totalRewards = campaign.totalRewards + _totalRewards;
        rewardInfo.push(RewardInfo({ endBlock: _endBlock, rewardPerBlock: _rewardPerBlock }));
        _transferFromWithAllowance(campaign.rewardToken, _totalRewards, _campaignID);
        emit AddRewardInfo(_campaignID, rewardInfo.length - 1, _endBlock, _rewardPerBlock);
    }

    /// @inheritdoc FarmingRange
    function updateRewardInfo(
        uint256 _campaignID,
        uint256 _rewardIndex,
        uint256 _endBlock,
        uint256 _rewardPerBlock
    ) public override onlyOwner nonReentrant {
        RewardInfo[] storage rewardInfo = campaignRewardInfo[_campaignID];
        CampaignInfo storage campaign = campaignInfo[_campaignID];
        RewardInfo storage selectedRewardInfo = rewardInfo[_rewardIndex];
        uint256 _previousEndBlock = selectedRewardInfo.endBlock;
        _updateCampaign(_campaignID);
        require(_previousEndBlock >= arbitrumBlockNumber(), "FarmingRange::updateRewardInfo::reward period ended");
        if (_rewardIndex != 0) {
            require(
                rewardInfo[_rewardIndex - 1].endBlock < _endBlock,
                "FarmingRange::updateRewardInfo::bad new endblock"
            );
        }
        if (rewardInfo.length > _rewardIndex + 1) {
            require(
                _endBlock < rewardInfo[_rewardIndex + 1].endBlock,
                "FarmingRange::updateRewardInfo::reward period end is in next range"
            );
        }
        (bool _refund, uint256 _diff) = _updateRewardsDiff(
            _rewardIndex,
            _endBlock,
            _rewardPerBlock,
            rewardInfo,
            campaign,
            selectedRewardInfo
        );
        if (!_refund && _diff != 0) {
            _transferFromWithAllowance(campaign.rewardToken, _diff, _campaignID);
        }
        // If _endblock is changed, and if we have another range after the updated one,
        // we need to update rewardPerBlock to distribute on the next new range or we could run out of tokens
        if (_endBlock != _previousEndBlock && rewardInfo.length - 1 > _rewardIndex) {
            RewardInfo storage nextRewardInfo = rewardInfo[_rewardIndex + 1];
            uint256 _nextRewardInfoEndBlock = nextRewardInfo.endBlock;
            uint256 _initialBlockRange = _nextRewardInfoEndBlock - _previousEndBlock;
            uint256 _nextBlockRange = _nextRewardInfoEndBlock - _endBlock;
            uint256 _currentRewardPerBlock = nextRewardInfo.rewardPerBlock;
            uint256 _initialNextTotal = _initialBlockRange * _currentRewardPerBlock;
            _currentRewardPerBlock = (_currentRewardPerBlock * _initialBlockRange) / _nextBlockRange;
            uint256 _nextTotal = _nextBlockRange * _currentRewardPerBlock;
            nextRewardInfo.rewardPerBlock = _currentRewardPerBlock;
            if (_nextTotal < _initialNextTotal) {
                campaign.rewardToken.safeTransfer(rewardManager, _initialNextTotal - _nextTotal);
                campaign.totalRewards -= _initialNextTotal - _nextTotal;
            }
        }
        // UPDATE total
        campaign.totalRewards = _refund ? campaign.totalRewards - _diff : campaign.totalRewards + _diff;
        selectedRewardInfo.endBlock = _endBlock;
        selectedRewardInfo.rewardPerBlock = _rewardPerBlock;
        emit UpdateRewardInfo(_campaignID, _rewardIndex, _endBlock, _rewardPerBlock);
    }

    /// @inheritdoc FarmingRange
    function removeLastRewardInfo(uint256 _campaignID) external override onlyOwner {
        RewardInfo[] storage rewardInfo = campaignRewardInfo[_campaignID];
        CampaignInfo storage campaign = campaignInfo[_campaignID];
        uint256 _rewardInfoLength = rewardInfo.length;
        require(_rewardInfoLength != 0, "FarmingRange::updateCampaignsRewards::no rewardInfoLen");
        RewardInfo storage lastRewardInfo = rewardInfo[_rewardInfoLength - 1];
        uint256 _lastRewardInfoEndBlock = lastRewardInfo.endBlock;
        require(
            _lastRewardInfoEndBlock > arbitrumBlockNumber(),
            "FarmingRange::removeLastRewardInfo::reward period ended"
        );
        _updateCampaign(_campaignID);
        if (lastRewardInfo.rewardPerBlock != 0) {
            (bool _refund, uint256 _diff) = _updateRewardsDiff(
                _rewardInfoLength - 1,
                _lastRewardInfoEndBlock,
                0,
                rewardInfo,
                campaign,
                lastRewardInfo
            );
            if (_refund) {
                campaign.totalRewards = campaign.totalRewards - _diff;
            }
        }
        rewardInfo.pop();
        emit RemoveRewardInfo(_campaignID, _rewardInfoLength - 1);
    }

    /// @inheritdoc FarmingRange
    function currentEndBlock(uint256 _campaignID) external view override returns (uint256) {
        return _endBlockOf(_campaignID, arbitrumBlockNumber());
    }

    /// @inheritdoc FarmingRange
    function currentRewardPerBlock(uint256 _campaignID) external view override returns (uint256) {
        return _rewardPerBlockOf(_campaignID, arbitrumBlockNumber());
    }

    /// @inheritdoc IFarmingRangeArbitrum
    function arbitrumBlockNumber() public view returns (uint256) {
        return ARBSYS.arbBlockNumber();
    }

    /// @inheritdoc FarmingRange
    function _updateRewardsDiff(
        uint256 _rewardIndex,
        uint256 _endBlock,
        uint256 _rewardPerBlock,
        RewardInfo[] storage rewardInfo,
        CampaignInfo storage campaign,
        RewardInfo storage selectedRewardInfo
    ) internal override returns (bool refund_, uint256 diff_) {
        uint256 blockNumber = arbitrumBlockNumber();
        uint256 _previousStartBlock = _rewardIndex == 0 ? campaign.startBlock : rewardInfo[_rewardIndex - 1].endBlock;
        uint256 _newStartBlock = blockNumber > _previousStartBlock ? blockNumber : _previousStartBlock;
        uint256 _previousBlockRange = selectedRewardInfo.endBlock - _previousStartBlock;
        uint256 _newBlockRange = _endBlock - _newStartBlock;
        uint256 _selectedRewardPerBlock = selectedRewardInfo.rewardPerBlock;
        uint256 _accumulatedRewards = (_newStartBlock - _previousStartBlock) * _selectedRewardPerBlock;
        uint256 _previousTotalRewards = _selectedRewardPerBlock * _previousBlockRange;
        uint256 _totalRewards = _rewardPerBlock * _newBlockRange;
        refund_ = _previousTotalRewards > _totalRewards + _accumulatedRewards;
        diff_ = refund_
            ? _previousTotalRewards - _totalRewards - _accumulatedRewards
            : _totalRewards + _accumulatedRewards - _previousTotalRewards;
        if (refund_) {
            campaign.rewardToken.safeTransfer(rewardManager, diff_);
        }
    }

    /// @inheritdoc FarmingRange
    function _pendingReward(
        uint256 _campaignID,
        uint256 _amount,
        uint256 _rewardDebt
    ) internal view override returns (uint256) {
        CampaignInfo memory _campaign = campaignInfo[_campaignID];
        RewardInfo[] memory _rewardInfo = campaignRewardInfo[_campaignID];
        uint256 _accRewardPerShare = _campaign.accRewardPerShare;
        uint256 blockNumber = arbitrumBlockNumber();

        if (blockNumber > _campaign.lastRewardBlock && _campaign.totalStaked != 0) {
            uint256 _cursor = _campaign.lastRewardBlock;
            for (uint256 _i; _i != _rewardInfo.length; ) {
                uint256 _multiplier = getMultiplier(_cursor, blockNumber, _rewardInfo[_i].endBlock);
                if (_multiplier != 0) {
                    _cursor = _rewardInfo[_i].endBlock;
                    _accRewardPerShare =
                        _accRewardPerShare +
                        ((_multiplier * _rewardInfo[_i].rewardPerBlock * 1e20) / _campaign.totalStaked);
                }
                unchecked {
                    ++_i;
                }
            }
        }
        return ((_amount * _accRewardPerShare) / 1e20) - _rewardDebt;
    }

    /// @inheritdoc FarmingRange
    function _updateCampaign(uint256 _campaignID) internal override {
        require(campaignInfo.length > _campaignID, "FarmingRange::_updateCampaign::Campaign id not valid");
        CampaignInfo storage campaign = campaignInfo[_campaignID];
        RewardInfo[] memory _rewardInfo = campaignRewardInfo[_campaignID];
        uint256 blockNumber = arbitrumBlockNumber();

        if (blockNumber <= campaign.lastRewardBlock) {
            return;
        }
        if (campaign.totalStaked == 0) {
            uint256 _amount;
            for (uint256 _i; _i != _rewardInfo.length; ) {
                if (_rewardInfo[_i].endBlock >= campaign.lastRewardBlock) {
                    uint256 _startBlock = _i != 0 ? _rewardInfo[_i - 1].endBlock : campaign.lastRewardBlock;
                    bool _lastRewardInfo = _rewardInfo[_i].endBlock > blockNumber;
                    uint256 _blockRange = (_lastRewardInfo ? blockNumber : _rewardInfo[_i].endBlock) -
                        (_startBlock > campaign.lastRewardBlock ? _startBlock : campaign.lastRewardBlock);
                    _amount += _rewardInfo[_i].rewardPerBlock * _blockRange;
                    if (_lastRewardInfo) {
                        break;
                    }
                }
                unchecked {
                    ++_i;
                }
            }

            if (_amount != 0) {
                campaign.rewardToken.safeTransfer(rewardManager, _amount);
            }

            campaign.lastRewardBlock = blockNumber;

            return;
        }
        /// @dev for each reward info
        for (uint256 _i; _i != _rewardInfo.length; ) {
            // @dev get multiplier based on current Block and rewardInfo's end block
            // multiplier will be a range of either (current block - campaign.lastRewardBlock)
            // or (reward info's endblock - campaign.lastRewardBlock) or 0
            uint256 _multiplier = getMultiplier(campaign.lastRewardBlock, blockNumber, _rewardInfo[_i].endBlock);
            if (_multiplier != 0) {
                // @dev if currentBlock exceed end block, use end block as the last reward block
                // so that for the next iteration, previous endBlock will be used as the last reward block
                if (blockNumber > _rewardInfo[_i].endBlock) {
                    campaign.lastRewardBlock = _rewardInfo[_i].endBlock;
                } else {
                    campaign.lastRewardBlock = blockNumber;
                }
                campaign.accRewardPerShare =
                    campaign.accRewardPerShare +
                    ((_multiplier * _rewardInfo[_i].rewardPerBlock * 1e20) / campaign.totalStaked);
            }
            unchecked {
                ++_i;
            }
        }
    }
}
