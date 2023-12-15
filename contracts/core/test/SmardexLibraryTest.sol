// SPDX-License-Identifier: BUSL-1.1
pragma solidity =0.8.17;

// libraries
import "../libraries/SmardexLibrary.sol";

contract SmardexLibraryTest {
    function approxEq(uint256 _x, uint256 _y) external pure returns (bool) {
        return SmardexLibrary.approxEq(_x, _y);
    }

    function ratioApproxEq(uint256 _xNum, uint256 _xDen, uint256 _yNum, uint256 _yDen) external pure returns (bool) {
        return SmardexLibrary.ratioApproxEq(_xNum, _xDen, _yNum, _yDen);
    }

    function getUpdatedPriceAverage(
        uint256 _fictiveReserveIn,
        uint256 _fictiveReserveOut,
        uint256 _priceAverageLastTimestamp,
        uint256 _priceAverageIn,
        uint256 _priceAverageOut,
        uint256 _currentTimestamp
    ) external pure returns (uint256 newPriceAverageIn_, uint256 newPriceAverageOut_) {
        return
            SmardexLibrary.getUpdatedPriceAverage(
                _fictiveReserveIn,
                _fictiveReserveOut,
                _priceAverageLastTimestamp,
                _priceAverageIn,
                _priceAverageOut,
                _currentTimestamp
            );
    }

    function computeFirstTradeQtyIn(
        uint256 _amountIn,
        uint256 _fictiveReserveIn,
        uint256 _fictiveReserveOut,
        uint256 _priceAverageIn,
        uint256 _priceAverageOut,
        uint128 _feesLP,
        uint128 _feesPool
    ) external pure returns (uint256 firstAmountIn_) {
        return
            SmardexLibrary.computeFirstTradeQtyIn(
                SmardexLibrary.GetAmountParameters({
                    amount: _amountIn,
                    reserveIn: 0,
                    reserveOut: 0,
                    fictiveReserveIn: _fictiveReserveIn,
                    fictiveReserveOut: _fictiveReserveOut,
                    priceAverageIn: _priceAverageIn,
                    priceAverageOut: _priceAverageOut,
                    feesLP: _feesLP,
                    feesPool: _feesPool
                })
            );
    }

    function computeFirstTradeQtyOut(
        uint256 _amountOut,
        uint256 _fictiveReserveIn,
        uint256 _fictiveReserveOut,
        uint256 _priceAverageIn,
        uint256 _priceAverageOut,
        uint128 _feesLP,
        uint128 _feesPool
    ) external pure returns (uint256 firstAmountOut_) {
        return
            SmardexLibrary.computeFirstTradeQtyOut(
                SmardexLibrary.GetAmountParameters({
                    amount: _amountOut,
                    reserveIn: 0,
                    reserveOut: 0,
                    fictiveReserveIn: _fictiveReserveIn,
                    fictiveReserveOut: _fictiveReserveOut,
                    priceAverageIn: _priceAverageIn,
                    priceAverageOut: _priceAverageOut,
                    feesLP: _feesLP,
                    feesPool: _feesPool
                })
            );
    }

    function computeFictiveReserves(
        uint256 _reserveIn,
        uint256 _reserveOut,
        uint256 _fictiveReserveIn,
        uint256 _fictiveReserveOut
    ) external pure returns (uint256 newFictiveReserveIn_, uint256 newFictiveReserveOut_) {
        return SmardexLibrary.computeFictiveReserves(_reserveIn, _reserveOut, _fictiveReserveIn, _fictiveReserveOut);
    }

    function applyKConstRuleOut(
        uint256 _amountIn,
        uint256 _reserveIn,
        uint256 _reserveOut,
        uint256 _fictiveReserveIn,
        uint256 _fictiveReserveOut,
        uint128 _feesLP,
        uint128 _feesPool
    )
        external
        pure
        returns (
            uint256 amountOut_,
            uint256 newReserveIn_,
            uint256 newReserveOut_,
            uint256 newFictiveReserveIn_,
            uint256 newFictiveReserveOut_
        )
    {
        return
            SmardexLibrary.applyKConstRuleOut(
                SmardexLibrary.GetAmountParameters({
                    amount: _amountIn,
                    reserveIn: _reserveIn,
                    reserveOut: _reserveOut,
                    fictiveReserveIn: _fictiveReserveIn,
                    fictiveReserveOut: _fictiveReserveOut,
                    priceAverageIn: 0,
                    priceAverageOut: 0,
                    feesLP: _feesLP,
                    feesPool: _feesPool
                })
            );
    }

    function applyKConstRuleIn(
        uint256 _amountOut,
        uint256 _reserveIn,
        uint256 _reserveOut,
        uint256 _fictiveReserveIn,
        uint256 _fictiveReserveOut,
        uint128 _feesLP,
        uint128 _feesPool
    )
        external
        pure
        returns (
            uint256 amountIn_,
            uint256 newReserveIn_,
            uint256 newReserveOut_,
            uint256 newFictiveReserveIn_,
            uint256 newFictiveReserveOut_
        )
    {
        return
            SmardexLibrary.applyKConstRuleIn(
                SmardexLibrary.GetAmountParameters({
                    amount: _amountOut,
                    reserveIn: _reserveIn,
                    reserveOut: _reserveOut,
                    fictiveReserveIn: _fictiveReserveIn,
                    fictiveReserveOut: _fictiveReserveOut,
                    priceAverageIn: 0,
                    priceAverageOut: 0,
                    feesLP: _feesLP,
                    feesPool: _feesPool
                })
            );
    }

    function getAmountOut(
        SmardexLibrary.GetAmountParameters memory _param
    )
        external
        pure
        returns (
            uint256 amountOut_,
            uint256 newReserveIn_,
            uint256 newReserveOut_,
            uint256 newFictiveReserveIn_,
            uint256 newFictiveReserveOut_
        )
    {
        return SmardexLibrary.getAmountOut(_param);
    }

    function getAmountIn(
        SmardexLibrary.GetAmountParameters memory _param
    )
        external
        pure
        returns (
            uint256 amountIn_,
            uint256 newReserveIn_,
            uint256 newReserveOut_,
            uint256 newFictiveReserveIn_,
            uint256 newFictiveReserveOut_
        )
    {
        return SmardexLibrary.getAmountIn(_param);
    }
}
