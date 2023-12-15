// SPDX-License-Identifier: BUSL-1.1
pragma solidity =0.8.17;

// libraries
import "@openzeppelin/contracts/utils/math/Math.sol";

// interfaces
import "../interfaces/ISmardexPair.sol";

library SmardexLibrary {
    /// @notice base of the FEES
    uint256 public constant FEES_BASE = 1_000_000;

    /// @notice max fees of feesLP and feesPool sum, 10% FEES_BASE
    uint256 public constant FEES_MAX = FEES_BASE / 10;

    /// @notice precision for approxEq, not in percent but in APPROX_PRECISION_BASE
    uint256 public constant APPROX_PRECISION = 1;

    /// @notice base of the APPROX_PRECISION
    uint256 public constant APPROX_PRECISION_BASE = 1_000_000;

    /// @notice number of seconds to reset priceAverage
    uint256 private constant MAX_BLOCK_DIFF_SECONDS = 300;

    /// @notice parameters of getAmountIn and getAmountOut
    struct GetAmountParameters {
        uint256 amount;
        uint256 reserveIn;
        uint256 reserveOut;
        uint256 fictiveReserveIn;
        uint256 fictiveReserveOut;
        uint256 priceAverageIn;
        uint256 priceAverageOut;
        uint128 feesLP;
        uint128 feesPool;
    }

    /**
     * @notice check if 2 numbers are approximately equal, using APPROX_PRECISION
     * @param _x number to compare
     * @param _y number to compare
     * @return true if numbers are approximately equal, false otherwise
     */
    function approxEq(uint256 _x, uint256 _y) internal pure returns (bool) {
        if (_x == _y) {
            return true;
        } else if (_x > _y) {
            return _x < (_y + (_y * APPROX_PRECISION) / APPROX_PRECISION_BASE);
        } else {
            return _y < (_x + (_x * APPROX_PRECISION) / APPROX_PRECISION_BASE);
        }
    }

    /**
     * @notice check if 2 ratio are approximately equal: _xNum _/ xDen ~= _yNum / _yDen
     * @param _xNum numerator of the first ratio to compare
     * @param _xDen denominator of the first ratio to compare
     * @param _yNum numerator of the second ratio to compare
     * @param _yDen denominator of the second ratio to compare
     * @return true if ratio are approximately equal, false otherwise
     */
    function ratioApproxEq(uint256 _xNum, uint256 _xDen, uint256 _yNum, uint256 _yDen) internal pure returns (bool) {
        return approxEq(_xNum * _yDen, _xDen * _yNum);
    }

    /**
     * @notice update priceAverage given old timestamp, new timestamp and prices
     * @param _fictiveReserveIn ratio component of the new price of the in-token
     * @param _fictiveReserveOut ratio component of the new price of the out-token
     * @param _priceAverageLastTimestamp timestamp of the last priceAverage update (0, if never updated)
     * @param _priceAverageIn ratio component of the last priceAverage of the in-token
     * @param _priceAverageOut ratio component of the last priceAverage of the out-token
     * @param _currentTimestamp timestamp of the priceAverage to update
     * @return newPriceAverageIn_ ratio component of the updated priceAverage of the in-token
     * @return newPriceAverageOut_ ratio component of the updated priceAverage of the out-token
     */
    function getUpdatedPriceAverage(
        uint256 _fictiveReserveIn,
        uint256 _fictiveReserveOut,
        uint256 _priceAverageLastTimestamp,
        uint256 _priceAverageIn,
        uint256 _priceAverageOut,
        uint256 _currentTimestamp
    ) internal pure returns (uint256 newPriceAverageIn_, uint256 newPriceAverageOut_) {
        require(_currentTimestamp >= _priceAverageLastTimestamp, "SmardexPair: INVALID_TIMESTAMP");

        // very first time
        if (_priceAverageLastTimestamp == 0) {
            newPriceAverageIn_ = _fictiveReserveIn;
            newPriceAverageOut_ = _fictiveReserveOut;
        }
        // another tx has been done in the same timestamp
        else if (_priceAverageLastTimestamp == _currentTimestamp) {
            newPriceAverageIn_ = _priceAverageIn;
            newPriceAverageOut_ = _priceAverageOut;
        }
        // need to compute new linear-average price
        else {
            // compute new price:
            uint256 _timeDiff = Math.min(_currentTimestamp - _priceAverageLastTimestamp, MAX_BLOCK_DIFF_SECONDS);

            newPriceAverageIn_ = _fictiveReserveIn;
            newPriceAverageOut_ =
                (((MAX_BLOCK_DIFF_SECONDS - _timeDiff) * _priceAverageOut * newPriceAverageIn_) /
                    _priceAverageIn +
                    _timeDiff *
                    _fictiveReserveOut) /
                MAX_BLOCK_DIFF_SECONDS;
        }
    }

    /**
     * @notice compute the firstTradeAmountIn so that the price reach the price Average
     * @param _param contain all params required from struct GetAmountParameters
     * @return firstAmountIn_ the first amount of in-token
     *
     * @dev if the trade is going in the direction that the price will never reach the priceAverage, or if _amountIn
     * is not big enough to reach the priceAverage or if the price is already equal to the priceAverage, then
     * firstAmountIn_ will be set to _amountIn
     */
    function computeFirstTradeQtyIn(GetAmountParameters memory _param) internal pure returns (uint256 firstAmountIn_) {
        // default value
        firstAmountIn_ = _param.amount;

        // if trade is in the good direction
        if (_param.fictiveReserveOut * _param.priceAverageIn > _param.fictiveReserveIn * _param.priceAverageOut) {
            // pre-compute all operands
            uint256 _toSub = _param.fictiveReserveIn * ((FEES_BASE * 2) - (_param.feesPool * 2) - _param.feesLP);
            uint256 _toDiv = (FEES_BASE - _param.feesPool) * 2;
            uint256 _inSqrt = (((_param.fictiveReserveIn * _param.fictiveReserveOut) * 4) / _param.priceAverageOut) *
                _param.priceAverageIn *
                ((FEES_BASE - _param.feesPool - _param.feesLP) * (FEES_BASE - _param.feesPool)) +
                ((_param.fictiveReserveIn * _param.fictiveReserveIn) * (_param.feesLP * _param.feesLP));

            // reverse sqrt check to only compute sqrt if really needed
            uint256 _inSqrtCompare = _toSub + _param.amount * _toDiv;
            if (_inSqrt < _inSqrtCompare * _inSqrtCompare) {
                firstAmountIn_ = (Math.sqrt(_inSqrt) - _toSub) / _toDiv;
            }
        }
    }

    /**
     * @notice compute the firstTradeAmountOut so that the price reach the price Average
     * @param _param contain all params required from struct GetAmountParameters
     * @return firstAmountOut_ the first amount of out-token
     *
     * @dev if the trade is going in the direction that the price will never reach the priceAverage, or if _amountOut
     * is not big enough to reach the priceAverage or if the price is already equal to the priceAverage, then
     * firstAmountOut_ will be set to _amountOut
     */
    function computeFirstTradeQtyOut(
        GetAmountParameters memory _param
    ) internal pure returns (uint256 firstAmountOut_) {
        // default value
        firstAmountOut_ = _param.amount;
        uint256 _reverseFeesTotal = FEES_BASE - _param.feesPool - _param.feesLP;
        // if trade is in the good direction
        if (_param.fictiveReserveOut * _param.priceAverageIn > _param.fictiveReserveIn * _param.priceAverageOut) {
            // pre-compute all operands
            uint256 _fictiveReserveOutPredFees = (_param.fictiveReserveIn * _param.feesLP * _param.priceAverageOut) /
                _param.priceAverageIn;
            uint256 _toAdd = ((_param.fictiveReserveOut * _reverseFeesTotal) * 2) + _fictiveReserveOutPredFees;
            uint256 _toDiv = _reverseFeesTotal * 2;

            uint256 _inSqrt = (((_param.fictiveReserveOut * _fictiveReserveOutPredFees) * 4) *
                (_reverseFeesTotal * (FEES_BASE - _param.feesPool))) /
                _param.feesLP +
                (_fictiveReserveOutPredFees * _fictiveReserveOutPredFees);

            // reverse sqrt check to only compute sqrt if really needed
            uint256 _inSqrtCompare = _toAdd - _param.amount * _toDiv;
            if (_inSqrt > _inSqrtCompare * _inSqrtCompare) {
                firstAmountOut_ = (_toAdd - Math.sqrt(_inSqrt)) / _toDiv;
            }
        }
    }

    /**
     * @notice compute fictive reserves
     * @param _reserveIn reserve of the in-token
     * @param _reserveOut reserve of the out-token
     * @param _fictiveReserveIn fictive reserve of the in-token
     * @param _fictiveReserveOut fictive reserve of the out-token
     * @return newFictiveReserveIn_ new fictive reserve of the in-token
     * @return newFictiveReserveOut_ new fictive reserve of the out-token
     */
    function computeFictiveReserves(
        uint256 _reserveIn,
        uint256 _reserveOut,
        uint256 _fictiveReserveIn,
        uint256 _fictiveReserveOut
    ) internal pure returns (uint256 newFictiveReserveIn_, uint256 newFictiveReserveOut_) {
        if (_reserveOut * _fictiveReserveIn < _reserveIn * _fictiveReserveOut) {
            uint256 _temp = (((_reserveOut * _reserveOut) / _fictiveReserveOut) * _fictiveReserveIn) / _reserveIn;
            newFictiveReserveIn_ =
                (_temp * _fictiveReserveIn) /
                _fictiveReserveOut +
                (_reserveOut * _fictiveReserveIn) /
                _fictiveReserveOut;
            newFictiveReserveOut_ = _reserveOut + _temp;
        } else {
            newFictiveReserveIn_ = (_fictiveReserveIn * _reserveOut) / _fictiveReserveOut + _reserveIn;
            newFictiveReserveOut_ = (_reserveIn * _fictiveReserveOut) / _fictiveReserveIn + _reserveOut;
        }

        // div all values by 4
        newFictiveReserveIn_ /= 4;
        newFictiveReserveOut_ /= 4;
    }

    /**
     * @notice apply k const rule using fictive reserve, when the amountIn is specified
     * @param _param contain all params required from struct GetAmountParameters
     * @return amountOut_ qty of token that leaves in the contract
     * @return newReserveIn_ new reserve of the in-token after the transaction
     * @return newReserveOut_ new reserve of the out-token after the transaction
     * @return newFictiveReserveIn_ new fictive reserve of the in-token after the transaction
     * @return newFictiveReserveOut_ new fictive reserve of the out-token after the transaction
     */
    function applyKConstRuleOut(
        GetAmountParameters memory _param
    )
        internal
        pure
        returns (
            uint256 amountOut_,
            uint256 newReserveIn_,
            uint256 newReserveOut_,
            uint256 newFictiveReserveIn_,
            uint256 newFictiveReserveOut_
        )
    {
        // k const rule
        uint256 _amountInWithFee = _param.amount * (FEES_BASE - _param.feesLP - _param.feesPool);
        uint256 _numerator = _amountInWithFee * _param.fictiveReserveOut;
        uint256 _denominator = _param.fictiveReserveIn * FEES_BASE + _amountInWithFee;
        amountOut_ = _numerator / _denominator;

        // update new reserves and add lp-fees to pools
        uint256 _amountInWithFeeLp = (_amountInWithFee + (_param.amount * _param.feesLP)) / FEES_BASE;
        newReserveIn_ = _param.reserveIn + _amountInWithFeeLp;
        newFictiveReserveIn_ = _param.fictiveReserveIn + _amountInWithFeeLp;
        newReserveOut_ = _param.reserveOut - amountOut_;
        newFictiveReserveOut_ = _param.fictiveReserveOut - amountOut_;
    }

    /**
     * @notice apply k const rule using fictive reserve, when the amountOut is specified
     * @param _param contain all params required from struct GetAmountParameters
     * @return amountIn_ qty of token that arrives in the contract
     * @return newReserveIn_ new reserve of the in-token after the transaction
     * @return newReserveOut_ new reserve of the out-token after the transaction
     * @return newFictiveReserveIn_ new fictive reserve of the in-token after the transaction
     * @return newFictiveReserveOut_ new fictive reserve of the out-token after the transaction
     */
    function applyKConstRuleIn(
        GetAmountParameters memory _param
    )
        internal
        pure
        returns (
            uint256 amountIn_,
            uint256 newReserveIn_,
            uint256 newReserveOut_,
            uint256 newFictiveReserveIn_,
            uint256 newFictiveReserveOut_
        )
    {
        // k const rule
        uint256 _numerator = _param.fictiveReserveIn * _param.amount * FEES_BASE;
        uint256 _denominator = (_param.fictiveReserveOut - _param.amount) *
            (FEES_BASE - _param.feesPool - _param.feesLP);
        amountIn_ = _numerator / _denominator + 1;

        // update new reserves
        uint256 _amountInWithFeeLp = (amountIn_ * (FEES_BASE - _param.feesPool)) / FEES_BASE;
        newReserveIn_ = _param.reserveIn + _amountInWithFeeLp;
        newFictiveReserveIn_ = _param.fictiveReserveIn + _amountInWithFeeLp;
        newReserveOut_ = _param.reserveOut - _param.amount;
        newFictiveReserveOut_ = _param.fictiveReserveOut - _param.amount;
    }

    /**
     * @notice return the amount of tokens the user would get by doing a swap
     * @param _param contain all params required from struct GetAmountParameters
     * @return amountOut_ The amount of token the user would receive
     * @return newReserveIn_ reserves of the selling token after the swap
     * @return newReserveOut_ reserves of the buying token after the swap
     * @return newFictiveReserveIn_ fictive reserve of the selling token after the swap
     * @return newFictiveReserveOut_ fictive reserve of the buying token after the swap
     */
    function getAmountOut(
        GetAmountParameters memory _param
    )
        internal
        pure
        returns (
            uint256 amountOut_,
            uint256 newReserveIn_,
            uint256 newReserveOut_,
            uint256 newFictiveReserveIn_,
            uint256 newFictiveReserveOut_
        )
    {
        require(_param.amount != 0, "SmarDexLibrary: INSUFFICIENT_INPUT_AMOUNT");
        require(
            _param.reserveIn != 0 &&
                _param.reserveOut != 0 &&
                _param.fictiveReserveIn != 0 &&
                _param.fictiveReserveOut != 0,
            "SmarDexLibrary: INSUFFICIENT_LIQUIDITY"
        );

        uint256 _amountInWithFees = (_param.amount * (FEES_BASE - _param.feesPool - _param.feesLP)) / FEES_BASE;
        uint256 _firstAmountIn = computeFirstTradeQtyIn(
            SmardexLibrary.GetAmountParameters({
                amount: _amountInWithFees,
                reserveIn: _param.reserveIn,
                reserveOut: _param.reserveOut,
                fictiveReserveIn: _param.fictiveReserveIn,
                fictiveReserveOut: _param.fictiveReserveOut,
                priceAverageIn: _param.priceAverageIn,
                priceAverageOut: _param.priceAverageOut,
                feesLP: _param.feesLP,
                feesPool: _param.feesPool
            })
        );

        // if there is 2 trade: 1st trade mustn't re-compute fictive reserves, 2nd should
        if (
            _firstAmountIn == _amountInWithFees &&
            ratioApproxEq(
                _param.fictiveReserveIn,
                _param.fictiveReserveOut,
                _param.priceAverageIn,
                _param.priceAverageOut
            )
        ) {
            (_param.fictiveReserveIn, _param.fictiveReserveOut) = computeFictiveReserves(
                _param.reserveIn,
                _param.reserveOut,
                _param.fictiveReserveIn,
                _param.fictiveReserveOut
            );
        }

        // avoid stack too deep
        {
            uint256 _firstAmountInNoFees = (_firstAmountIn * FEES_BASE) / (FEES_BASE - _param.feesPool - _param.feesLP);
            (
                amountOut_,
                newReserveIn_,
                newReserveOut_,
                newFictiveReserveIn_,
                newFictiveReserveOut_
            ) = applyKConstRuleOut(
                SmardexLibrary.GetAmountParameters({
                    amount: _firstAmountInNoFees,
                    reserveIn: _param.reserveIn,
                    reserveOut: _param.reserveOut,
                    fictiveReserveIn: _param.fictiveReserveIn,
                    fictiveReserveOut: _param.fictiveReserveOut,
                    priceAverageIn: _param.priceAverageIn,
                    priceAverageOut: _param.priceAverageOut,
                    feesLP: _param.feesLP,
                    feesPool: _param.feesPool
                })
            );

            // update amountIn in case there is a second trade
            _param.amount -= _firstAmountInNoFees;
        }

        // if we need a second trade
        if (_firstAmountIn < _amountInWithFees) {
            // in the second trade ALWAYS recompute fictive reserves
            (newFictiveReserveIn_, newFictiveReserveOut_) = computeFictiveReserves(
                newReserveIn_,
                newReserveOut_,
                newFictiveReserveIn_,
                newFictiveReserveOut_
            );

            uint256 _secondAmountOutNoFees;
            (
                _secondAmountOutNoFees,
                newReserveIn_,
                newReserveOut_,
                newFictiveReserveIn_,
                newFictiveReserveOut_
            ) = applyKConstRuleOut(
                SmardexLibrary.GetAmountParameters({
                    amount: _param.amount,
                    reserveIn: newReserveIn_,
                    reserveOut: newReserveOut_,
                    fictiveReserveIn: newFictiveReserveIn_,
                    fictiveReserveOut: newFictiveReserveOut_,
                    priceAverageIn: _param.priceAverageIn,
                    priceAverageOut: _param.priceAverageOut,
                    feesLP: _param.feesLP,
                    feesPool: _param.feesPool
                })
            );
            amountOut_ += _secondAmountOutNoFees;
        }
    }

    /**
     * @notice return the amount of tokens the user should spend by doing a swap
     * @param _param contain all params required from struct GetAmountParameters
     * @return amountIn_ The amount of token the user would spend to receive _amountOut
     * @return newReserveIn_ reserves of the selling token after the swap
     * @return newReserveOut_ reserves of the buying token after the swap
     * @return newFictiveReserveIn_ fictive reserve of the selling token after the swap
     * @return newFictiveReserveOut_ fictive reserve of the buying token after the swap
     */
    function getAmountIn(
        GetAmountParameters memory _param
    )
        internal
        pure
        returns (
            uint256 amountIn_,
            uint256 newReserveIn_,
            uint256 newReserveOut_,
            uint256 newFictiveReserveIn_,
            uint256 newFictiveReserveOut_
        )
    {
        require(_param.amount != 0, "SmarDexLibrary: INSUFFICIENT_OUTPUT_AMOUNT");
        require(
            _param.amount < _param.fictiveReserveOut &&
                _param.reserveIn != 0 &&
                _param.reserveOut != 0 &&
                _param.fictiveReserveIn != 0 &&
                _param.fictiveReserveOut != 0,
            "SmarDexLibrary: INSUFFICIENT_LIQUIDITY"
        );

        uint256 _firstAmountOut = computeFirstTradeQtyOut(_param);

        // if there is 2 trade: 1st trade mustn't re-compute fictive reserves, 2nd should
        if (
            _firstAmountOut == _param.amount &&
            ratioApproxEq(
                _param.fictiveReserveIn,
                _param.fictiveReserveOut,
                _param.priceAverageIn,
                _param.priceAverageOut
            )
        ) {
            (_param.fictiveReserveIn, _param.fictiveReserveOut) = computeFictiveReserves(
                _param.reserveIn,
                _param.reserveOut,
                _param.fictiveReserveIn,
                _param.fictiveReserveOut
            );
        }

        (amountIn_, newReserveIn_, newReserveOut_, newFictiveReserveIn_, newFictiveReserveOut_) = applyKConstRuleIn(
            SmardexLibrary.GetAmountParameters({
                amount: _firstAmountOut,
                reserveIn: _param.reserveIn,
                reserveOut: _param.reserveOut,
                fictiveReserveIn: _param.fictiveReserveIn,
                fictiveReserveOut: _param.fictiveReserveOut,
                priceAverageIn: _param.priceAverageIn,
                priceAverageOut: _param.priceAverageOut,
                feesLP: _param.feesLP,
                feesPool: _param.feesPool
            })
        );

        // if we need a second trade
        if (_firstAmountOut < _param.amount) {
            // in the second trade ALWAYS recompute fictive reserves
            (newFictiveReserveIn_, newFictiveReserveOut_) = computeFictiveReserves(
                newReserveIn_,
                newReserveOut_,
                newFictiveReserveIn_,
                newFictiveReserveOut_
            );

            uint256 _secondAmountIn;
            (
                _secondAmountIn,
                newReserveIn_,
                newReserveOut_,
                newFictiveReserveIn_,
                newFictiveReserveOut_
            ) = applyKConstRuleIn(
                SmardexLibrary.GetAmountParameters({
                    amount: _param.amount - _firstAmountOut,
                    reserveIn: newReserveIn_,
                    reserveOut: newReserveOut_,
                    fictiveReserveIn: newFictiveReserveIn_,
                    fictiveReserveOut: newFictiveReserveOut_,
                    priceAverageIn: _param.priceAverageIn,
                    priceAverageOut: _param.priceAverageOut,
                    feesLP: _param.feesLP,
                    feesPool: _param.feesPool
                })
            );
            amountIn_ += _secondAmountIn;
        }
    }
}
