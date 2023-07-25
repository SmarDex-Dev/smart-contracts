// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity =0.8.17;

// contracts
import "./SmardexPair.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// interfaces
import "./interfaces/ISmardexFactory.sol";

/**
 * @title SmardexFactory
 * @notice facilitates creation of SmardexPair to swap tokens.
 */
contract SmardexFactory is Ownable, ISmardexFactory {
    address public feeTo;
    uint128 internal feesLP = 700; // MIN 1
    uint128 internal feesPool = 300;

    mapping(address => mapping(address => address)) public getPair;
    address[] public allPairs;

    ///@inheritdoc ISmardexFactory
    function allPairsLength() external view returns (uint256) {
        return allPairs.length;
    }

    ///@inheritdoc ISmardexFactory
    function getDefaultFees() external view returns (uint128 feesLP_, uint128 feesPool_) {
        feesLP_ = feesLP;
        feesPool_ = feesPool;
    }

    ///@inheritdoc ISmardexFactory
    function createPair(address _tokenA, address _tokenB) external returns (address pair_) {
        require(_tokenA != _tokenB, "SmarDex: IDENTICAL_ADDRESSES");
        (address _token0, address _token1) = _tokenA < _tokenB ? (_tokenA, _tokenB) : (_tokenB, _tokenA);
        require(_token0 != address(0), "SmarDex: ZERO_ADDRESS");
        require(getPair[_token0][_token1] == address(0), "SmarDex: PAIR_EXISTS"); // single check is sufficient
        bytes32 _salt = keccak256(abi.encodePacked(_token0, _token1));
        SmardexPair _pair = new SmardexPair{ salt: _salt }();
        _pair.initialize(_token0, _token1, feesLP, feesPool);
        pair_ = address(_pair);
        getPair[_token0][_token1] = pair_;
        getPair[_token1][_token0] = pair_; // populate mapping in the reverse direction
        allPairs.push(pair_);

        emit PairCreated(_token0, _token1, pair_, allPairs.length);
    }

    ///@inheritdoc ISmardexFactory
    function setFeeTo(address _feeTo) external onlyOwner {
        address _previousFeeTo = feeTo;
        feeTo = _feeTo;

        emit FeeToUpdated(_previousFeeTo, _feeTo);
    }

    ///@inheritdoc ISmardexFactory
    function setFees(uint128 _feesLP, uint128 _feesPool) external onlyOwner {
        require(_feesLP != 0, "SmarDex: ZERO_FEES_LP");
        require(_feesLP + _feesPool <= SmardexLibrary.FEES_MAX, "SmarDex: FEES_MAX");
        feesLP = _feesLP;
        feesPool = _feesPool;

        emit FeesChanged(_feesLP, _feesPool);
    }
}
