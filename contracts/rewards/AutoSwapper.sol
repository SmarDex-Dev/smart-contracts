// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.17;

// libraries
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeCast.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../core/libraries/SmardexLibrary.sol";
import "../periphery/libraries/Path.sol";

// interfaces
import "../periphery/interfaces/ISmardexRouter.sol";
import "../core/interfaces/ISmardexPair.sol";
import "./interfaces/IAutoSwapper.sol";

/**
 * @title AutoSwapper
 * @notice AutoSwapper makes it automatic and/or public to get fees from Smardex and convert it to tokens for staking
 */
contract AutoSwapper is IAutoSwapper, Ownable {
    using SafeERC20 for IERC20;
    using SafeCast for uint256;
    using SafeCast for int256;
    using Path for bytes;
    using Path for address[];

    bytes4 private constant SWAP_SELECTOR = bytes4(keccak256(bytes("swap(address,bool,int256,bytes)")));
    uint256 private constant AUTOSWAP_SLIPPAGE = 2; // 2%
    uint256 private constant AUTOSWAP_SLIPPAGE_BASE = 100;

    ISmardexFactory public immutable factory;
    address public immutable stakingAddress;
    IERC20 public immutable smardexToken;

    ISmardexPair private constant DEFAULT_CACHED_PAIR = ISmardexPair(address(0));
    ISmardexPair private cachedPair = DEFAULT_CACHED_PAIR;

    ISmardexRouter public immutable router;

    constructor(ISmardexFactory _factory, IERC20 _smardexToken, address _stakingAddress, ISmardexRouter _router) {
        require(address(_factory) != address(0), "AutoSwapper: INVALID_FACTORY_ADDRESS");
        require(address(_smardexToken) != address(0), "AutoSwapper: INVALID_SDEX_ADDRESS");
        require(_stakingAddress != address(0), "AutoSwapper: INVALID_STAKING_ADDRESS");

        factory = _factory;
        smardexToken = _smardexToken;
        stakingAddress = _stakingAddress;
        router = _router;
    }

    /// @inheritdoc IAutoSwapper
    function executeWork(IERC20 _token0, IERC20 _token1) external {
        uint256 _amount0 = _swapAndSend(_token0);
        uint256 _amount1 = _swapAndSend(_token1);
        uint256 _transferredAmount = transferTokens();

        emit workExecuted(_token0, _amount0, _token1, _amount1, _transferredAmount);
    }

    /// @inheritdoc IAutoSwapper
    function swapTokenWithPath(
        uint256 _amountToSwap,
        uint256 _amountOutMin,
        address[] calldata _path,
        uint256 _deadline
    ) external onlyOwner {
        require(_path.length > 1, "AutoSwapper: INVALID_PATH");
        require(_path[_path.length - 1] == address(smardexToken), "AutoSwapper: INVALID_LAST_TOKEN");
        IERC20 _token = IERC20(_path[0]);

        uint256 _balance = _token.balanceOf(address(this));
        require(_amountToSwap <= _balance, "AutoSwapper: INVALID_AMOUNT");

        uint256 _amountIn;
        if (_amountToSwap != 0) _amountIn = _amountToSwap;
        else _amountIn = _balance;
        _token.safeApprove(address(router), _amountIn);

        router.swapExactTokensForTokens(_amountIn, _amountOutMin, _path, stakingAddress, _deadline);
    }

    /// @inheritdoc IAutoSwapper
    function transferTokens() public returns (uint256 _amount) {
        _amount = smardexToken.balanceOf(address(this));
        if (_amount != 0) {
            smardexToken.safeTransfer(stakingAddress, _amount);
        }
    }

    /**
     * @notice private function to swap token in SDEX and send it to the staking address
     * @param _token address of the token to swap into sdex
     * @return amount of input tokens swapped
     */
    function _swapAndSend(IERC20 _token) private returns (uint256) {
        if (_token == smardexToken) {
            return 0;
        }
        SwapCallParams memory _params = SwapCallParams({
            zeroForOne: _token < smardexToken,
            balanceIn: _token.balanceOf(address(this)),
            pair: ISmardexPair(factory.getPair(address(_token), address(smardexToken))),
            fictiveReserve0: 0,
            fictiveReserve1: 0,
            oldPriceAv0: 0,
            oldPriceAv1: 0,
            oldPriceAvTimestamp: 0,
            newPriceAvIn: 0,
            newPriceAvOut: 0
        });

        // basic check on input data
        if (_params.balanceIn == 0 || address(_params.pair) == address(0)) {
            return 0;
        }

        // get reserves and pricesAv
        (_params.fictiveReserve0, _params.fictiveReserve1) = _params.pair.getFictiveReserves();
        (_params.oldPriceAv0, _params.oldPriceAv1, _params.oldPriceAvTimestamp) = _params.pair.getPriceAverage();

        if (_params.oldPriceAv0 == 0 || _params.oldPriceAv1 == 0) {
            (_params.oldPriceAv0, _params.oldPriceAv1) = (_params.fictiveReserve0, _params.fictiveReserve1);
        }

        if (_params.zeroForOne) {
            (_params.newPriceAvIn, _params.newPriceAvOut) = SmardexLibrary.getUpdatedPriceAverage(
                _params.fictiveReserve0,
                _params.fictiveReserve1,
                _params.oldPriceAvTimestamp,
                _params.oldPriceAv0,
                _params.oldPriceAv1,
                block.timestamp
            );
        } else {
            (_params.newPriceAvIn, _params.newPriceAvOut) = SmardexLibrary.getUpdatedPriceAverage(
                _params.fictiveReserve1,
                _params.fictiveReserve0,
                _params.oldPriceAvTimestamp,
                _params.oldPriceAv1,
                _params.oldPriceAv0,
                block.timestamp
            );
        }

        // we allow for 2% slippage from previous swaps in block
        uint256 _amountOutWithSlippage = (_params.balanceIn *
            _params.newPriceAvOut *
            (AUTOSWAP_SLIPPAGE_BASE - AUTOSWAP_SLIPPAGE)) / (_params.newPriceAvIn * AUTOSWAP_SLIPPAGE_BASE);
        require(_amountOutWithSlippage != 0, "AutoSwapper: slippage calculation failed");

        cachedPair = _params.pair;

        // we dont check for success as we dont want to revert the whole tx if the swap fails
        (bool success, ) = address(_params.pair).call(
            abi.encodeWithSelector(
                SWAP_SELECTOR,
                stakingAddress,
                _token < smardexToken,
                _params.balanceIn.toInt256(),
                abi.encode(
                    SwapCallbackData({ path: abi.encodePacked(_token, smardexToken), payer: address(this) }),
                    _amountOutWithSlippage
                )
            )
        );

        cachedPair = DEFAULT_CACHED_PAIR;

        return success ? _params.balanceIn : 0;
    }

    /// @inheritdoc ISmardexSwapCallback
    function smardexSwapCallback(int256 _amount0Delta, int256 _amount1Delta, bytes calldata _dataFromPair) external {
        require(_amount0Delta > 0 || _amount1Delta > 0, "SmardexRouter: Callback Invalid amount");
        (SwapCallbackData memory _data, uint256 _amountOutWithSlippage) = abi.decode(
            _dataFromPair,
            (SwapCallbackData, uint256)
        );
        (address _tokenIn, ) = _data.path.decodeFirstPool();
        require(msg.sender == address(cachedPair), "SmarDexRouter: INVALID_PAIR"); // ensure that msg.sender is a pair
        // ensure that the trade gives at least the minimum amount of output token (negative delta)
        require(
            (_amount0Delta < 0 ? uint256(-_amount0Delta) : (-_amount1Delta).toUint256()) >= _amountOutWithSlippage,
            "SmardexAutoSwapper: Invalid price"
        );
        // send positive delta to pair
        IERC20(_tokenIn).safeTransfer(
            msg.sender,
            _amount0Delta > 0 ? uint256(_amount0Delta) : _amount1Delta.toUint256()
        );
    }
}
