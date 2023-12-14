// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.17;

// interfaces
import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "../../core/interfaces/ISmardexFactory.sol";
import "../../core/interfaces/ISmardexSwapCallback.sol";
import "../../core/interfaces/ISmardexPair.sol";

interface IAutoSwapper is ISmardexSwapCallback {
    /**
     * @notice swap parameters used by function _swapAndSend
     * @param zeroForOne true if we swap the token0 with token1, false otherwise
     * @param balanceIn balance of in-token to be swapped
     * @param pair pair address
     * @param fictiveReserve0 fictive reserve of token0 of the pair
     * @param fictiveReserve1 fictive reserve of token1 of the pair
     * @param oldPriceAv0 priceAverage of token0 of the pair before the swap
     * @param oldPriceAv1 priceAverage of token1 of the pair before the swap
     * @param oldPriceAvTimestamp priceAverageLastTimestamp of the pair before the swap
     * @param newPriceAvIn priceAverage of token0 of the pair after the swap
     * @param newPriceAvOut priceAverage of token1 of the pair after the swap
     */
    struct SwapCallParams {
        bool zeroForOne;
        uint256 balanceIn;
        ISmardexPair pair;
        uint256 fictiveReserve0;
        uint256 fictiveReserve1;
        uint256 oldPriceAv0;
        uint256 oldPriceAv1;
        uint256 oldPriceAvTimestamp;
        uint256 newPriceAvIn;
        uint256 newPriceAvOut;
    }

    /**
     * @notice emitted every time the AutoSwapper swaps and stacks SDEXs
     * @param _token0 the first swapped token
     * @param _amount0 the amount of token0 swapped
     * @param _token1 the second swapped token
     * @param _amount1 the amount of token1 swapped
     * @param _stakedAmount the staked amount
     */
    event workExecuted(IERC20 _token0, uint256 _amount0, IERC20 _token1, uint256 _amount1, uint256 _stakedAmount);

    /**
     * @notice public function for executing swaps on tokens and burn, will be called from a
     * Smardex Pair on mint and burn, and can be forced call by anyone
     * @param _token0 token to be converted to sdex
     * @param _token1 token to be converted to sdex
     */
    function executeWork(IERC20 _token0, IERC20 _token1) external;

    /**
     * @notice onlyOwner function to swap token in SDEX and send it to the staking address (or burn on L2)
     * @param _amountToSwap amount of tokens from _path[0] to be converted into SDEX
     * @param _amountOutMin The minimum SDEX amount required to prevent the transaction from reverting
     * @param _path An array of token addresses. path.length must be >= 2. Pools for each consecutive pair of addresses
     * must exist and have liquidity. Last token must be SDEX
     * @param _deadline Unix timestamp after which the transaction will revert
     */
    function swapTokenWithPath(
        uint256 _amountToSwap,
        uint256 _amountOutMin,
        address[] calldata _path,
        uint256 _deadline
    ) external;

    /**
     * @notice transfer SDEX from here to address dead
     * @return _amount the transferred SDEX amount
     */
    function transferTokens() external returns (uint256 _amount);

    /**
     * @notice return the factory address
     * @return factory address
     */
    function factory() external view returns (ISmardexFactory);

    /**
     * @notice return the smardexToken address
     * @return smardexToken address
     */
    function smardexToken() external view returns (IERC20);
}
