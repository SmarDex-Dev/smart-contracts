// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity =0.8.17;

// libraries
import "@openzeppelin/contracts/utils/math/SafeCast.sol";
import "../core/libraries/TransferHelper.sol";
import "./libraries/PoolAddress.sol";
import "./libraries/Path.sol";

// interfaces
import "../core/interfaces/ISmardexFactory.sol";
import "../core/interfaces/ISmardexPair.sol";
import "./interfaces/ISmardexRouter.sol";
import "./interfaces/IWETH.sol";

/**
 * @title SmardexRouter
 * @notice Router for execution of swaps and liquidity management on SmardexPair
 */
contract SmardexRouter is ISmardexRouter {
    using Path for bytes;
    using Path for address[];
    using SafeCast for uint256;
    using SafeCast for int256;

    address public immutable factory;
    address public immutable WETH;

    mapping(bytes32 => address) whitelist;

    /// @dev Used as the placeholder value for amountInCached, because the computed amount in for an exact output swap
    /// can never actually be this value
    uint256 private constant DEFAULT_AMOUNT_IN_CACHED = type(uint256).max;

    /// @dev Transient storage variable used for returning the computed amount in for an exact output swap.
    uint256 private amountInCached = DEFAULT_AMOUNT_IN_CACHED;

    modifier ensure(uint256 deadline) {
        require(deadline >= block.timestamp, "SmarDexRouter: EXPIRED");
        _;
    }

    /**
     * @param _factory address of the factory used to get pair address
     * @param _WETH address of the WETH token
     */
    constructor(address _factory, address _WETH) {
        factory = _factory;
        WETH = _WETH;
    }

    /// @inheritdoc ISmardexRouter
    function addPairToWhitelist(address _tokenA, address _tokenB) external virtual override returns (address pair_) {
        // gas savings
        address _factory = factory;

        // calculate the pair address if created by the current factory
        bytes32 _tokenHash = PoolAddress.getTokenHash(_factory, _tokenA, _tokenB);
        // get the effective pair address
        pair_ = ISmardexFactory(_factory).getPair(_tokenA, _tokenB);
        // check that the pair exists in the factory
        require(pair_ != address(0), "SmardexRouter: PAIR_MISSING");
        // check that the pair was added to the whitelist and is not a new pair
        require(address(uint160(uint256(_tokenHash))) != pair_, "SmardexRouter: NOT_WHITELISTABLE");

        // use the pair from the factory, to ensure the same pair is used for the same tokens
        whitelist[_tokenHash] = pair_;

        emit PairWhitelisted(_tokenA, _tokenB, pair_);
    }

    receive() external payable {
        assert(msg.sender == WETH); // only accept ETH via fallback from the WETH contract
    }

    /// @inheritdoc ISmardexSwapCallback
    function smardexSwapCallback(int256 _amount0Delta, int256 _amount1Delta, bytes calldata _data) external override {
        require(_amount0Delta > 0 || _amount1Delta > 0, "SmardexRouter: Callback Invalid amount");

        SwapCallbackData memory _decodedData = abi.decode(_data, (SwapCallbackData));
        (address _tokenIn, address _tokenOut) = _decodedData.path.decodeFirstPool();

        // ensure that msg.sender is a pair
        require(
            msg.sender == PoolAddress.pairFor(factory, _tokenIn, _tokenOut, whitelist),
            "SmarDexRouter: INVALID_PAIR"
        );

        (bool _isExactInput, uint256 _amountToPay) = _amount0Delta > 0
            ? (_tokenIn < _tokenOut, uint256(_amount0Delta))
            : (_tokenOut < _tokenIn, uint256(_amount1Delta));

        if (_isExactInput) {
            _pay(_tokenIn, _decodedData.payer, msg.sender, _amountToPay);
        } else if (_decodedData.path.hasMultiplePools()) {
            _decodedData.path = _decodedData.path.skipToken();
            _swapExactOut(_amountToPay, msg.sender, _decodedData);
        } else {
            amountInCached = _amountToPay;
            _tokenIn = _tokenOut; // swap in/out because exact output swaps are reversed
            _pay(_tokenIn, _decodedData.payer, msg.sender, _amountToPay);
        }
    }

    /**
     * @notice send tokens to a user. Handle transfer/transferFrom and WETH / ETH or any ERC20 token
     * @param _token The token to pay
     * @param _payer The entity that must pay
     * @param _to The entity that will receive payment
     * @param _value The amount to pay
     *
     * @custom:from UniV3 PeripheryPayments.sol
     * @custom:url https://github.com/Uniswap/v3-periphery/blob/v1.3.0/contracts/base/PeripheryPayments.sol
     */
    function _pay(address _token, address _payer, address _to, uint256 _value) internal {
        if (_token == WETH && address(this).balance >= _value) {
            // pay with WETH
            IWETH(WETH).deposit{ value: _value }(); // wrap only what is needed to pay
            IWETH(WETH).transfer(_to, _value);
            //refund dust eth, if any ?
        } else if (_payer == address(this)) {
            // pay with tokens already in the contract (for the exact input multihop case)
            TransferHelper.safeTransfer(_token, _to, _value);
        } else {
            // pull payment
            TransferHelper.safeTransferFrom(_token, _payer, _to, _value);
        }
    }

    ///@inheritdoc ISmardexMintCallback
    function smardexMintCallback(MintCallbackData calldata _data) external override {
        // ensure that msg.sender is a pair
        require(
            msg.sender == PoolAddress.pairFor(factory, _data.token0, _data.token1, whitelist),
            "SmarDexRouter: INVALID_PAIR"
        );
        require(_data.amount0 != 0 || _data.amount1 != 0, "SmardexRouter: Callback Invalid amount");

        _pay(_data.token0, _data.payer, msg.sender, _data.amount0);
        _pay(_data.token1, _data.payer, msg.sender, _data.amount1);
    }

    /// @inheritdoc ISmardexRouter
    function addLiquidity(
        AddLiquidityParams calldata _params,
        address _to,
        uint256 _deadline
    ) external virtual override ensure(_deadline) returns (uint256 amountA_, uint256 amountB_, uint256 liquidity_) {
        address _pair;
        (amountA_, amountB_, _pair) = _addLiquidity(_params);
        bool _orderedPair = _params.tokenA < _params.tokenB;
        liquidity_ = ISmardexPair(_pair).mint(
            _to,
            _orderedPair ? amountA_ : amountB_,
            _orderedPair ? amountB_ : amountA_,
            msg.sender
        );
    }

    /// @inheritdoc ISmardexRouter
    function addLiquidityETH(
        AddLiquidityETHParams calldata _params,
        address _to,
        uint256 _deadline
    )
        external
        payable
        virtual
        override
        ensure(_deadline)
        returns (uint256 amountToken_, uint256 amountETH_, uint256 liquidity_)
    {
        AddLiquidityParams memory _p = AddLiquidityParams({
            tokenA: _params.token,
            tokenB: WETH,
            amountADesired: _params.amountTokenDesired,
            amountBDesired: msg.value,
            amountAMin: _params.amountTokenMin,
            amountBMin: _params.amountETHMin,
            fictiveReserveB: _params.fictiveReserveETH,
            fictiveReserveAMin: _params.fictiveReserveTokenMin,
            fictiveReserveAMax: _params.fictiveReserveTokenMax
        });
        address _pair;
        (amountToken_, amountETH_, _pair) = _addLiquidity(_p);

        bool _orderedPair = _params.token < WETH;
        liquidity_ = ISmardexPair(_pair).mint(
            _to,
            _orderedPair ? amountToken_ : amountETH_,
            _orderedPair ? amountETH_ : amountToken_,
            msg.sender
        );

        // refund dust eth, if any
        if (msg.value > amountETH_) {
            TransferHelper.safeTransferETH(msg.sender, msg.value - amountETH_);
        }
    }

    /// @inheritdoc ISmardexRouter
    function removeLiquidity(
        address _tokenA,
        address _tokenB,
        uint256 _liquidity,
        uint256 _amountAMin,
        uint256 _amountBMin,
        address _to,
        uint256 _deadline
    ) public virtual override ensure(_deadline) returns (uint256 amountA_, uint256 amountB_) {
        address _pair = PoolAddress.pairFor(factory, _tokenA, _tokenB, whitelist);
        ISmardexPair(_pair).transferFrom(msg.sender, _pair, _liquidity); // send liquidity to pair

        (uint256 _amount0, uint256 _amount1) = ISmardexPair(_pair).burn(_to);
        (address _token0, ) = PoolHelpers.sortTokens(_tokenA, _tokenB);
        (amountA_, amountB_) = _tokenA == _token0 ? (_amount0, _amount1) : (_amount1, _amount0);

        require(amountA_ >= _amountAMin, "SmarDexRouter: INSUFFICIENT_A_AMOUNT");
        require(amountB_ >= _amountBMin, "SmarDexRouter: INSUFFICIENT_B_AMOUNT");
    }

    /// @inheritdoc ISmardexRouter
    function removeLiquidityETH(
        address _token,
        uint256 _liquidity,
        uint256 _amountTokenMin,
        uint256 _amountETHMin,
        address _to,
        uint256 _deadline
    ) public virtual override ensure(_deadline) returns (uint256 amountToken_, uint256 amountETH_) {
        (amountToken_, amountETH_) = removeLiquidity(
            _token,
            WETH,
            _liquidity,
            _amountTokenMin,
            _amountETHMin,
            address(this),
            _deadline
        );
        TransferHelper.safeTransfer(_token, _to, amountToken_);
        IWETH(WETH).withdraw(amountETH_);
        TransferHelper.safeTransferETH(_to, amountETH_);
    }

    /// @inheritdoc ISmardexRouter
    function removeLiquidityWithPermit(
        address _tokenA,
        address _tokenB,
        uint256 _liquidity,
        uint256 _amountAMin,
        uint256 _amountBMin,
        address _to,
        uint256 _deadline,
        bool _approveMax,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    ) external virtual override returns (uint256 amountA_, uint256 amountB_) {
        address _pair = PoolAddress.pairFor(factory, _tokenA, _tokenB, whitelist);
        uint256 _value = _approveMax ? type(uint256).max : _liquidity;
        // Check and execute permit. In case of failure, we don't want to revert because it's a vector for griefing.
        // transferFrom call will revert in case allowance is not sufficient.
        try ISmardexPair(_pair).permit(msg.sender, address(this), _value, _deadline, _v, _r, _s) {} catch {}

        (amountA_, amountB_) = removeLiquidity(_tokenA, _tokenB, _liquidity, _amountAMin, _amountBMin, _to, _deadline);
    }

    /// @inheritdoc ISmardexRouter
    function removeLiquidityETHWithPermit(
        address _token,
        uint256 _liquidity,
        uint256 _amountTokenMin,
        uint256 _amountETHMin,
        address _to,
        uint256 _deadline,
        bool _approveMax,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    ) external virtual override returns (uint256 amountToken_, uint256 amountETH_) {
        address _pair = PoolAddress.pairFor(factory, _token, WETH, whitelist);
        uint256 _value = _approveMax ? type(uint256).max : _liquidity;
        // Check and execute permit. In case of failure, we don't want to revert because it's a vector for griefing.
        // transferFrom call will revert in case allowance is not sufficient.
        try ISmardexPair(_pair).permit(msg.sender, address(this), _value, _deadline, _v, _r, _s) {} catch {}
        (amountToken_, amountETH_) = removeLiquidityETH(
            _token,
            _liquidity,
            _amountTokenMin,
            _amountETHMin,
            _to,
            _deadline
        );
    }

    /// @inheritdoc ISmardexRouter
    function swapExactTokensForTokens(
        uint256 _amountIn,
        uint256 _amountOutMin,
        address[] calldata _path,
        address _to,
        uint256 _deadline
    ) public virtual override ensure(_deadline) returns (uint256 amountOut_) {
        address _payer = msg.sender; // msg.sender pays for the first hop

        bytes memory _bytesPath = _path.encodeTightlyPacked(); //could be done in the caller function
        while (true) {
            bool _hasMultiplePools = _bytesPath.hasMultiplePools();

            // the outputs of prior swaps become the inputs to subsequent ones
            _amountIn = _swapExactIn(
                _amountIn,
                // for intermediate swaps, this contract custodies
                _hasMultiplePools ? address(this) : _to,
                // only the first pool in the path is necessary
                SwapCallbackData({ path: _bytesPath.getFirstPool(), payer: _payer })
            );

            // decide whether to continue or terminate
            if (_hasMultiplePools) {
                _payer = address(this); // at this point, the caller has paid
                _bytesPath = _bytesPath.skipToken();
            } else {
                // amountOut of the final swap is the last amountIn captured in the loop
                amountOut_ = _amountIn;
                break;
            }
        }
        require(amountOut_ >= _amountOutMin, "SmarDexRouter: INSUFFICIENT_OUTPUT_AMOUNT");
    }

    /// @inheritdoc ISmardexRouter
    function swapExactTokensForTokensWithPermit(
        uint256 _amountIn,
        uint256 _amountOutMin,
        address[] calldata _path,
        address _to,
        uint256 _deadline,
        bool _approveMax,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    ) external virtual override returns (uint256 amountOut_) {
        uint256 _value = _approveMax ? type(uint256).max : _amountIn;
        // Check and execute permit. In case of failure, we don't want to revert because it's a vector for griefing.
        // transferFrom call will revert in case allowance is not sufficient.
        try IERC20Permit(_path[0]).permit(msg.sender, address(this), _value, _deadline, _v, _r, _s) {} catch {}

        return swapExactTokensForTokens(_amountIn, _amountOutMin, _path, _to, _deadline);
    }

    /// @inheritdoc ISmardexRouter
    function swapTokensForExactTokens(
        uint256 _amountOut,
        uint256 _amountInMax,
        address[] calldata _path,
        address _to,
        uint256 _deadline
    ) public virtual override ensure(_deadline) returns (uint256 amountIn_) {
        // Path needs to be reversed as to get the amountIn that we will ask from next pair hop
        bytes memory _reversedPath = _path.encodeTightlyPackedReversed();
        amountIn_ = _swapExactOut(_amountOut, _to, SwapCallbackData({ path: _reversedPath, payer: msg.sender }));
        // amount In is only the right one for one Hop, otherwise we need cached amountIn from callback
        if (_path.length > 2) amountIn_ = amountInCached;
        require(amountIn_ <= _amountInMax, "SmarDexRouter: EXCESSIVE_INPUT_AMOUNT");
        amountInCached = DEFAULT_AMOUNT_IN_CACHED;
    }

    /// @inheritdoc ISmardexRouter
    function swapTokensForExactTokensWithPermit(
        uint256 _amountOut,
        uint256 _amountInMax,
        address[] calldata _path,
        address _to,
        uint256 _deadline,
        bool _approveMax,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    ) external virtual override returns (uint256 amountIn_) {
        uint256 _value = _approveMax ? type(uint256).max : _amountInMax;
        // Check and execute permit. In case of failure, we don't want to revert because it's a vector for griefing.
        // transferFrom call will revert in case allowance is not sufficient.
        try IERC20Permit(_path[0]).permit(msg.sender, address(this), _value, _deadline, _v, _r, _s) {} catch {}

        return swapTokensForExactTokens(_amountOut, _amountInMax, _path, _to, _deadline);
    }

    /// @inheritdoc ISmardexRouter
    function swapTokensForExactETH(
        uint256 _amountOut,
        uint256 _amountInMax,
        address[] calldata _path,
        address _to,
        uint256 _deadline
    ) public virtual override ensure(_deadline) returns (uint256 amountIn_) {
        require(_path[_path.length - 1] == WETH, "SmarDexRouter: INVALID_PATH");
        amountIn_ = swapTokensForExactTokens(_amountOut, _amountInMax, _path, address(this), _deadline);
        _unwrapWETH(_amountOut, _to);
    }

    /// @inheritdoc ISmardexRouter
    function swapTokensForExactETHWithPermit(
        uint256 _amountOut,
        uint256 _amountInMax,
        address[] calldata _path,
        address _to,
        uint256 _deadline,
        bool _approveMax,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    ) external virtual override returns (uint256 amountIn_) {
        uint256 _value = _approveMax ? type(uint256).max : _amountInMax;
        // Check and execute permit. In case of failure, we don't want to revert because it's a vector for griefing.
        // transferFrom call will revert in case allowance is not sufficient.
        try IERC20Permit(_path[0]).permit(msg.sender, address(this), _value, _deadline, _v, _r, _s) {} catch {}

        return swapTokensForExactETH(_amountOut, _amountInMax, _path, _to, _deadline);
    }

    /// @inheritdoc ISmardexRouter
    function swapETHForExactTokens(
        uint256 _amountOut,
        address[] calldata _path,
        address _to,
        uint256 _deadline
    ) external payable virtual override ensure(_deadline) returns (uint256 amountIn_) {
        require(_path[0] == WETH, "SmarDexRouter: INVALID_PATH");
        amountIn_ = swapTokensForExactTokens(_amountOut, msg.value, _path, _to, _deadline);

        // Refund unused ETH
        _refundETH(msg.sender);
    }

    /// @inheritdoc ISmardexRouter
    function swapExactETHForTokens(
        uint256 _amountOutMin,
        address[] calldata _path,
        address _to,
        uint256 _deadline
    ) external payable virtual override ensure(_deadline) returns (uint256 amountOut_) {
        require(_path[0] == WETH, "SmarDexRouter: INVALID_PATH");
        amountOut_ = swapExactTokensForTokens(msg.value, _amountOutMin, _path, _to, _deadline);
    }

    /// @inheritdoc ISmardexRouter
    function swapExactTokensForETH(
        uint256 _amountIn,
        uint256 _amountOutMin,
        address[] calldata _path,
        address _to,
        uint256 _deadline
    ) public virtual override ensure(_deadline) returns (uint256 amountOut_) {
        require(_path[_path.length - 1] == WETH, "SmarDexRouter: INVALID_PATH");
        amountOut_ = swapExactTokensForTokens(_amountIn, _amountOutMin, _path, address(this), _deadline);
        _unwrapWETH(amountOut_, _to);
    }

    /// @inheritdoc ISmardexRouter
    function swapExactTokensForETHWithPermit(
        uint256 _amountIn,
        uint256 _amountOutMin,
        address[] calldata _path,
        address _to,
        uint256 _deadline,
        bool _approveMax,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    ) external virtual override returns (uint256 amountOut_) {
        uint256 _value = _approveMax ? type(uint256).max : _amountIn;
        // Check and execute permit. In case of failure, we don't want to revert because it's a vector for griefing.
        // transferFrom call will revert in case allowance is not sufficient.
        try IERC20Permit(_path[0]).permit(msg.sender, address(this), _value, _deadline, _v, _r, _s) {} catch {}

        return swapExactTokensForETH(_amountIn, _amountOutMin, _path, _to, _deadline);
    }

    /**
     * @notice internal function to unwrap WETH to ETH after swap
     * @param _amountMinimum minimum amount of WETH that the contract should have
     * @param _to address that will receive the ETH unwrapped
     *
     * @custom:from UniV3 PeripheryPayments.sol
     * @custom:url https://github.com/Uniswap/v3-periphery/blob/v1.3.0/contracts/base/PeripheryPayments.sol
     */
    function _unwrapWETH(uint256 _amountMinimum, address _to) internal {
        uint256 _balanceWETH = IERC20(WETH).balanceOf(address(this));
        require(_balanceWETH >= _amountMinimum, "Insufficient WETH");

        if (_balanceWETH != 0) {
            IWETH(WETH).withdraw(_balanceWETH);
            TransferHelper.safeTransferETH(_to, _balanceWETH);
        }
    }

    /**
     * @notice internal function to send all ETH of the contract. Do not fail if the contract does not have any ETH
     * @param _to address that will receive the ETH
     *
     * @custom:from UniV3 PeripheryPayments.sol
     * @custom:url https://github.com/Uniswap/v3-periphery/blob/v1.3.0/contracts/base/PeripheryPayments.sol
     */
    function _refundETH(address _to) private {
        if (address(this).balance != 0) {
            TransferHelper.safeTransferETH(_to, address(this).balance);
        }
    }

    /**
     * @notice internal function to swap quantity of token to receive a determined quantity
     * @param _amountOut quantity to receive
     * @param _to address that will receive the token
     * @param _data SwapCallbackData data of the swap to transmit
     * @return amountIn_ amount of token to pay
     */
    function _swapExactOut(
        uint256 _amountOut,
        address _to,
        SwapCallbackData memory _data
    ) private returns (uint256 amountIn_) {
        require(_to != address(0), "SmarDexRouter: INVALID_RECIPIENT");

        (address _tokenOut, address _tokenIn) = _data.path.decodeFirstPool();
        bool _zeroForOne = _tokenIn < _tokenOut;

        (int256 _amount0, int256 _amount1) = ISmardexPair(PoolAddress.pairFor(factory, _tokenOut, _tokenIn, whitelist))
            .swap(_to, _zeroForOne, -_amountOut.toInt256(), abi.encode(_data));

        amountIn_ = _zeroForOne ? uint256(_amount0) : uint256(_amount1);
    }

    /**
     * @notice Add liquidity to an ERC-20=ERC-20 pool. Receive liquidity token to materialize shares in the pool
     * @param _params parameters of the liquidity to add
     * @return amountA_ The amount of tokenA sent to the pool.
     * @return amountB_ The amount of tokenB sent to the pool.
     * @return pair_ The address of the pool where the liquidity was added.
     */
    function _addLiquidity(
        AddLiquidityParams memory _params
    ) internal virtual returns (uint256 amountA_, uint256 amountB_, address pair_) {
        // create the pair if it doesn't exist yet
        pair_ = ISmardexFactory(factory).getPair(_params.tokenA, _params.tokenB);
        if (pair_ == address(0)) {
            pair_ = ISmardexFactory(factory).createPair(_params.tokenA, _params.tokenB);
        }
        if (ISmardexPair(pair_).totalSupply() == 0) {
            ISmardexPair(pair_).skim(msg.sender); // in case some tokens are already on the pair
        }
        (uint256 _reserveA, uint256 _reserveB, uint256 _reserveAFic, uint256 _reserveBFic) = PoolHelpers.getAllReserves(
            factory,
            _params.tokenA,
            _params.tokenB,
            whitelist
        );
        if (_reserveA == 0 && _reserveB == 0) {
            (amountA_, amountB_) = (_params.amountADesired, _params.amountBDesired);
        } else {
            // price slippage check
            // the current price is _reserveAFic / _reserveBFic
            // the max price that the user accepts is _params.fictiveReserveAMax / _params.fictiveReserveB
            // the min price that the user accepts is _params.fictiveReserveAMin / _params.fictiveReserveB
            uint256 _product = _reserveAFic * _params.fictiveReserveB;
            require(_product <= _params.fictiveReserveAMax * _reserveBFic, "SmarDexRouter: PRICE_TOO_HIGH");
            require(_product >= _params.fictiveReserveAMin * _reserveBFic, "SmarDexRouter: PRICE_TOO_LOW");

            // real reserves slippage check
            uint256 _amountBOptimal = PoolHelpers.quote(_params.amountADesired, _reserveA, _reserveB);
            if (_amountBOptimal <= _params.amountBDesired) {
                require(_amountBOptimal >= _params.amountBMin, "SmarDexRouter: INSUFFICIENT_B_AMOUNT");
                (amountA_, amountB_) = (_params.amountADesired, _amountBOptimal);
            } else {
                uint256 _amountAOptimal = PoolHelpers.quote(_params.amountBDesired, _reserveB, _reserveA);
                assert(_amountAOptimal <= _params.amountADesired);
                require(_amountAOptimal >= _params.amountAMin, "SmarDexRouter: INSUFFICIENT_A_AMOUNT");
                (amountA_, amountB_) = (_amountAOptimal, _params.amountBDesired);
            }
        }
    }

    /**
     * @notice internal function to swap a determined quantity of token
     * @param _amountIn quantity to swap
     * @param _to address that will receive the token
     * @param _data SwapCallbackData data of the swap to transmit
     * @return amountOut_ amount of token that _to will receive
     */
    function _swapExactIn(
        uint256 _amountIn,
        address _to,
        SwapCallbackData memory _data
    ) internal returns (uint256 amountOut_) {
        // allow swapping to the router address with address 0
        if (_to == address(0)) {
            _to = address(this);
        }

        (address _tokenIn, address _tokenOut) = _data.path.decodeFirstPool();
        bool _zeroForOne = _tokenIn < _tokenOut;
        (int256 _amount0, int256 _amount1) = ISmardexPair(PoolAddress.pairFor(factory, _tokenIn, _tokenOut, whitelist))
            .swap(_to, _zeroForOne, _amountIn.toInt256(), abi.encode(_data));

        amountOut_ = (_zeroForOne ? -_amount1 : -_amount0).toUint256();
    }

    /// @inheritdoc ISmardexRouter
    function quote(
        uint256 _amountA,
        uint256 _reserveA,
        uint256 _reserveB
    ) public pure virtual override returns (uint256 amountB_) {
        return PoolHelpers.quote(_amountA, _reserveA, _reserveB);
    }

    /// @inheritdoc ISmardexRouter
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
        /// @dev The values _priceAverageIn and _priceAverageOut are not directly fetched from the pair,
        ///      and therefore, they may not necessarily be up to date with the most recent data. In
        ///      order to yield a _amountOut that represents the most current value, it is crucial that
        ///      the args _priceAverageIn and _priceAverageOut reflects the latest, updated data.
        (amountOut_, newReserveIn_, newReserveOut_, newFictiveReserveIn_, newFictiveReserveOut_) = SmardexLibrary
            .getAmountOut(_param);
    }

    /// @inheritdoc ISmardexRouter
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
        (amountIn_, newReserveIn_, newReserveOut_, newFictiveReserveIn_, newFictiveReserveOut_) = SmardexLibrary
            .getAmountIn(_param);
    }

    /// @inheritdoc ISmardexRouter
    function getAmountOutFromPair(
        uint256 _amountIn,
        address _tokenIn,
        address _tokenOut
    )
        external
        view
        returns (
            uint256 amountOut_,
            uint256 newReserveIn_,
            uint256 newReserveOut_,
            uint256 newFictiveReserveIn_,
            uint256 newFictiveReserveOut_
        )
    {
        SmardexLibrary.GetAmountParameters memory _param;
        _param.amount = _amountIn;

        ISmardexPair _pair = ISmardexPair(ISmardexFactory(factory).getPair(_tokenIn, _tokenOut));
        require(address(_pair) != address(0), "SmarDexRouter: INVALID_TOKENS");
        uint256 _priceAverageLastTimestamp;

        // fetch data
        if (_tokenIn == _pair.token0()) {
            (_param.reserveIn, _param.reserveOut) = _pair.getReserves();
            (_param.fictiveReserveIn, _param.fictiveReserveOut) = _pair.getFictiveReserves();
            (_param.priceAverageIn, _param.priceAverageOut, _priceAverageLastTimestamp) = _pair.getPriceAverage();
        } else {
            (_param.reserveOut, _param.reserveIn) = _pair.getReserves();
            (_param.fictiveReserveOut, _param.fictiveReserveIn) = _pair.getFictiveReserves();
            (_param.priceAverageOut, _param.priceAverageIn, _priceAverageLastTimestamp) = _pair.getPriceAverage();
        }

        // update price average
        (_param.priceAverageIn, _param.priceAverageOut) = _pair.getUpdatedPriceAverage(
            _param.fictiveReserveIn,
            _param.fictiveReserveOut,
            _priceAverageLastTimestamp,
            _param.priceAverageIn,
            _param.priceAverageOut,
            block.timestamp
        );

        // get pair fees
        (_param.feesLP, _param.feesPool) = _pair.getPairFees();

        (amountOut_, newReserveIn_, newReserveOut_, newFictiveReserveIn_, newFictiveReserveOut_) = SmardexLibrary
            .getAmountOut(_param);
    }

    /// @inheritdoc ISmardexRouter
    function getAmountInFromPair(
        uint256 _amountOut,
        address _tokenIn,
        address _tokenOut
    )
        external
        view
        returns (
            uint256 amountIn_,
            uint256 newReserveIn_,
            uint256 newReserveOut_,
            uint256 newFictiveReserveIn_,
            uint256 newFictiveReserveOut_
        )
    {
        SmardexLibrary.GetAmountParameters memory _param;
        _param.amount = _amountOut;

        ISmardexPair _pair = ISmardexPair(ISmardexFactory(factory).getPair(_tokenIn, _tokenOut));
        require(address(_pair) != address(0), "SmarDexRouter: INVALID_TOKENS");
        uint256 _priceAverageLastTimestamp;

        // fetch data
        if (_tokenIn == _pair.token0()) {
            (_param.reserveIn, _param.reserveOut) = _pair.getReserves();
            (_param.fictiveReserveIn, _param.fictiveReserveOut) = _pair.getFictiveReserves();
            (_param.priceAverageIn, _param.priceAverageOut, _priceAverageLastTimestamp) = _pair.getPriceAverage();
        } else {
            (_param.reserveOut, _param.reserveIn) = _pair.getReserves();
            (_param.fictiveReserveOut, _param.fictiveReserveIn) = _pair.getFictiveReserves();
            (_param.priceAverageOut, _param.priceAverageIn, _priceAverageLastTimestamp) = _pair.getPriceAverage();
        }

        // update price average
        (_param.priceAverageIn, _param.priceAverageOut) = _pair.getUpdatedPriceAverage(
            _param.fictiveReserveIn,
            _param.fictiveReserveOut,
            _priceAverageLastTimestamp,
            _param.priceAverageIn,
            _param.priceAverageOut,
            block.timestamp
        );

        // get pair fees
        (_param.feesLP, _param.feesPool) = _pair.getPairFees();

        (amountIn_, newReserveIn_, newReserveOut_, newFictiveReserveIn_, newFictiveReserveOut_) = SmardexLibrary
            .getAmountIn(_param);
    }
}
