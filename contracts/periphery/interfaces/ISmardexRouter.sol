// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.17;

// interfaces
import "../../core/interfaces/ISmardexSwapCallback.sol";
import "../../core/interfaces/ISmardexMintCallback.sol";
import "../../core/libraries/SmardexLibrary.sol";

interface ISmardexRouter is ISmardexSwapCallback, ISmardexMintCallback {
    /**
     * @notice parameters used by the addLiquidity function
     * @param tokenA address of the first token in the pair
     * @param tokenB address of the second token in the pair
     * @param amountADesired The amount of tokenA to add as liquidity
     * if the B/A price is <= amountBDesired/amountADesired
     * @param amountBDesired The amount of tokenB to add as liquidity
     * if the A/B price is <= amountADesired/amountBDesired
     * @param amountAMin Bounds the extent to which the B/A price can go up before the transaction reverts.
     * Must be <= amountADesired.
     * @param amountBMin Bounds the extent to which the A/B price can go up before the transaction reverts.
     * Must be <= amountBDesired.
     * @param fictiveReserveB The fictive reserve of tokenB at time of submission
     * @param fictiveReserveAMin The minimum fictive reserve of tokenA indicating the extent to which the A/B price can
     * go down
     * @param fictiveReserveAMax The maximum fictive reserve of tokenA indicating the extent to which the A/B price can
     * go up
     */
    struct AddLiquidityParams {
        address tokenA;
        address tokenB;
        uint256 amountADesired;
        uint256 amountBDesired;
        uint256 amountAMin;
        uint256 amountBMin;
        uint128 fictiveReserveB;
        uint128 fictiveReserveAMin;
        uint128 fictiveReserveAMax;
    }

    /**
     * @notice parameters used by the addLiquidityETH function
     * @param token A pool token.
     * @param amountTokenDesired The amount of token to add as liquidity if the WETH/token price
     * is <= msg.value/amountTokenDesired (token depreciates).
     * @param amountTokenMin Bounds the extent to which the WETH/token price can go up before the transaction reverts.
     * Must be <= amountTokenDesired.
     * @param amountETHMin Bounds the extent to which the token/WETH price can go up before the transaction reverts.
     * Must be <= msg.value.
     * @param fictiveReserveETH The fictive reserve of wETH at time of submission
     * @param fictiveReserveTokenMin The minimum fictive reserve of the token indicating the extent to which the token
     * price can go up
     * @param fictiveReserveTokenMax The maximum fictive reserve of the token indicating the extent to which the token
     * price can go down
     */
    struct AddLiquidityETHParams {
        address token;
        uint256 amountTokenDesired;
        uint256 amountTokenMin;
        uint256 amountETHMin;
        uint128 fictiveReserveETH;
        uint128 fictiveReserveTokenMin;
        uint128 fictiveReserveTokenMax;
    }

    /**
     * @notice emitted when a pair is added to the whitelist
     * @param tokenA address of one of the token of the pair
     * @param tokenB address of the other token of the pair
     * @param pair whitelisted pair address
     */
    event PairWhitelisted(address tokenA, address tokenB, address pair);

    /**
     * @notice get the factory address
     * @return address of the factory
     */
    function factory() external view returns (address);

    /**
     * @notice get WETH address
     * @return address of the WETH token (Wrapped Ether)
     */
    function WETH() external view returns (address);

    /**
     * @notice Add pair to the whitelist if it's also present in the factory whitelist
     * @dev this function is callable by anyone, only the pairs also whitelisted by the factory will be accepted.
     * @param _tokenA address of the first token in the pair
     * @param _tokenB address of the second token in the pair
     * @return pair_ address of the created pair
     */
    function addPairToWhitelist(address _tokenA, address _tokenB) external returns (address pair_);

    /**
     * @notice Add liquidity to an ERC-20=ERC-20 pool. Receive liquidity token to materialize shares in the pool
     * @param _params all the parameters required to add liquidity from struct AddLiquidityParams
     * @param _to Recipient of the liquidity tokens.
     * @param _deadline Unix timestamp after which the transaction will revert.
     * @return amountA_ The amount of tokenA sent to the pool.
     * @return amountB_ The amount of tokenB sent to the pool.
     * @return liquidity_ The amount of liquidity tokens minted.
     */
    function addLiquidity(
        AddLiquidityParams calldata _params,
        address _to,
        uint256 _deadline
    ) external returns (uint256 amountA_, uint256 amountB_, uint256 liquidity_);

    /**
     * @notice Adds liquidity to an ERC-20=WETH pool with ETH. msg.value is the amount of ETH to add as liquidity.
     * if the token/WETH price is <= amountTokenDesired/msg.value (WETH depreciates).
     * @param _params all the parameters required to add liquidity from struct AddLiquidityETHParams
     * @param _to Recipient of the liquidity tokens.
     * @param _deadline Unix timestamp after which the transaction will revert.
     * @return amountToken_ The amount of token sent to the pool.
     * @return amountETH_ The amount of ETH converted to WETH and sent to the pool.
     * @return liquidity_ The amount of liquidity tokens minted.
     */
    function addLiquidityETH(
        AddLiquidityETHParams calldata _params,
        address _to,
        uint256 _deadline
    ) external payable returns (uint256 amountToken_, uint256 amountETH_, uint256 liquidity_);

    /**
     * @notice Removes liquidity from an ERC-20=ERC-20 pool.
     * @param _tokenA A pool token.
     * @param _tokenB A pool token.
     * @param _liquidity The amount of liquidity tokens to remove.
     * @param _amountAMin The minimum amount of tokenA that must be received for the transaction not to revert.
     * @param _amountBMin The minimum amount of tokenB that must be received for the transaction not to revert.
     * @param _to Recipient of the liquidity tokens.
     * @param _deadline Unix timestamp after which the transaction will revert.
     * @return amountA_ The amount of tokenA received.
     * @return amountB_ The amount of tokenB received.
     */
    function removeLiquidity(
        address _tokenA,
        address _tokenB,
        uint256 _liquidity,
        uint256 _amountAMin,
        uint256 _amountBMin,
        address _to,
        uint256 _deadline
    ) external returns (uint256 amountA_, uint256 amountB_);

    /**
     * @notice Removes liquidity from an ERC-20=WETH pool and receive ETH.
     * @param _token A pool token.
     * @param _liquidity The amount of liquidity tokens to remove.
     * @param _amountTokenMin The minimum amount of token that must be received for the transaction not to revert.
     * @param _amountETHMin The minimum amount of ETH that must be received for the transaction not to revert.
     * @param _to Recipient of the liquidity tokens.
     * @param _deadline Unix timestamp after which the transaction will revert.
     * @return amountToken_ The amount of token received.
     * @return amountETH_ The amount of ETH received.
     */
    function removeLiquidityETH(
        address _token,
        uint256 _liquidity,
        uint256 _amountTokenMin,
        uint256 _amountETHMin,
        address _to,
        uint256 _deadline
    ) external returns (uint256 amountToken_, uint256 amountETH_);

    /**
     * @notice Removes liquidity from an ERC-20=WETH pool and receive ETH.
     * @param _tokenA A pool token.
     * @param _tokenB A pool token.
     * @param _liquidity The amount of liquidity tokens to remove.
     * @param _amountAMin The minimum amount of tokenA that must be received for the transaction not to revert.
     * @param _amountBMin The minimum amount of tokenB that must be received for the transaction not to revert.
     * @param _to Recipient of the liquidity tokens.
     * @param _deadline Unix timestamp after which the transaction will revert.
     * @param _approveMax Whether or not the approval amount in the signature is for liquidity or uint(-1).
     * @param _v The v component of the permit signature.
     * @param _r The r component of the permit signature.
     * @param _s The s component of the permit signature.
     * @return amountA_ The amount of tokenA received.
     * @return amountB_ The amount of tokenB received.
     */
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
    ) external returns (uint256 amountA_, uint256 amountB_);

    /**
     * @notice Removes liquidity from an ERC-20=WETH pool and receive ETH without pre-approval
     * @param _token A pool token.
     * @param _liquidity The amount of liquidity tokens to remove.
     * @param _amountTokenMin The minimum amount of token that must be received for the transaction not to revert.
     * @param _amountETHMin The minimum amount of ETH that must be received for the transaction not to revert.
     * @param _to Recipient of the liquidity tokens.
     * @param _deadline Unix timestamp after which the transaction will revert.
     * @param _approveMax Whether or not the approval amount in the signature is for liquidity or uint(-1).
     * @param _v The v component of the permit signature.
     * @param _r The r component of the permit signature.
     * @param _s The s component of the permit signature.
     * @return amountToken_ The amount of token received.
     * @return amountETH_ The amount of ETH received.
     */
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
    ) external returns (uint256 amountToken_, uint256 amountETH_);

    /**
     * @notice Swaps an exact amount of input tokens for as many output tokens as possible, along the route determined
     * by the path. The first element of path is the input token, the last is the output token, and any intermediate
     * elements represent intermediate pairs to trade through (if, for example, a direct pair does not exist).
     * @param _amountIn The amount of input tokens to send.
     * @param _amountOutMin The minimum amount of output tokens that must be received for the transaction not to revert.
     * @param _path An array of token addresses. path.length must be >= 2. Pools for each consecutive pair of addresses
     * must exist and have liquidity.
     * @param _to Recipient of the output tokens.
     * @param _deadline Unix timestamp after which the transaction will revert.
     * @return amountOut_ The output token amount.
     */
    function swapExactTokensForTokens(
        uint256 _amountIn,
        uint256 _amountOutMin,
        address[] calldata _path,
        address _to,
        uint256 _deadline
    ) external returns (uint256 amountOut_);

    /**
     * @notice Receive an exact amount of output tokens for as few input tokens as possible, along the route determined
     * by the path. The first element of path is the input token, the last is the output token, and any intermediate
     * elements represent intermediate tokens to trade through (if, for example, a direct pair does not exist).
     * @param _amountOut The amount of output tokens to receive.
     * @param _amountInMax The maximum amount of input tokens that can be required before the transaction reverts.
     * @param _path An array of token addresses. path.length must be >= 2. Pools for each consecutive pair of addresses
     * must exist and have liquidity.
     * @param _to Recipient of the output tokens.
     * @param _deadline Unix timestamp after which the transaction will revert.
     * @return amountIn_ The input token amount.
     */
    function swapTokensForExactTokens(
        uint256 _amountOut,
        uint256 _amountInMax,
        address[] calldata _path,
        address _to,
        uint256 _deadline
    ) external returns (uint256 amountIn_);

    /**
     * @notice Swaps an exact amount of ETH for as many output tokens as possible, along the route determined by the
     * path. The first element of path must be WETH, the last is the output token, and any intermediate elements
     * represent intermediate pairs to trade through (if, for example, a direct pair does not exist).
     * @param _amountOutMin The minimum amount of output tokens that must be received for the transaction not to revert.
     * @param _path An array of token addresses. path.length must be >= 2. Pools for each consecutive pair of addresses
     * must exist and have liquidity.
     * @param _to Recipient of the output tokens.
     * @param _deadline Unix timestamp after which the transaction will revert.
     * @return amountOut_ The input token amount.
     */
    function swapExactETHForTokens(
        uint256 _amountOutMin,
        address[] calldata _path,
        address _to,
        uint256 _deadline
    ) external payable returns (uint256 amountOut_);

    /**
     * @notice Receive an exact amount of ETH for as few input tokens as possible, along the route determined by the
     * path. The first element of path is the input token, the last must be WETH, and any intermediate elements
     * represent intermediate pairs to trade through (if, for example, a direct pair does not exist).
     * @param _amountOut The amount of ETH to receive.
     * @param _amountInMax The maximum amount of input tokens that can be required before the transaction reverts.
     * @param _path An array of token addresses. path.length must be >= 2. Pools for each consecutive pair of addresses
     * must exist and have liquidity.
     * @param _to Recipient of ETH.
     * @param _deadline Unix timestamp after which the transaction will revert.
     * @return amountIn_ The input token amount.
     */
    function swapTokensForExactETH(
        uint256 _amountOut,
        uint256 _amountInMax,
        address[] calldata _path,
        address _to,
        uint256 _deadline
    ) external returns (uint256 amountIn_);

    /**
     * @notice Swaps an exact amount of tokens for as much ETH as possible, along the route determined by the path.
     * The first element of path is the input token, the last must be WETH, and any intermediate elements represent
     * intermediate pairs to trade through (if, for example, a direct pair does not exist).
     * @param _amountIn The amount of input tokens to send.
     * @param _amountOutMin The minimum amount of output tokens that must be received for the transaction not to revert.
     * @param _path An array of token addresses. path.length must be >= 2. Pools for each consecutive pair of addresses
     * must exist and have liquidity.
     * @param _to Recipient of ETH.
     * @param _deadline Unix timestamp after which the transaction will revert.
     * @return amountOut_ The input token amount.
     */
    function swapExactTokensForETH(
        uint256 _amountIn,
        uint256 _amountOutMin,
        address[] calldata _path,
        address _to,
        uint256 _deadline
    ) external returns (uint256 amountOut_);

    /**
     * @notice Receive an exact amount of tokens for as little ETH as possible, along the route determined by the path.
     * The first element of path must be WETH, the last is the output token and any intermediate elements represent
     * intermediate pairs to trade through (if, for example, a direct pair does not exist).
     * msg.value The maximum amount of ETH that can be required before the transaction reverts.
     * @param _amountOut The amount of tokens to receive.
     * @param _path An array of token addresses. path.length must be >= 2. Pools for each consecutive pair of addresses
     * must exist and have liquidity.
     * @param _to Recipient of output tokens.
     * @param _deadline Unix timestamp after which the transaction will revert.
     * @return amountIn_ The input token amount.
     */
    function swapETHForExactTokens(
        uint256 _amountOut,
        address[] calldata _path,
        address _to,
        uint256 _deadline
    ) external payable returns (uint256 amountIn_);

    /**
     * @notice Given some asset amount and reserves, returns an amount of the other asset representing equivalent value.
     */
    function quote(
        uint256 _amountA,
        uint256 _fictiveReserveA,
        uint256 _fictiveReserveB
    ) external pure returns (uint256 amountB_);

    /**
     * @notice return the amount of tokens the user would get by doing a swap
     * @param _param all the parameters required to get amount from struct GetAmountParameters
     * @return amountOut_ The amount of token the user would receive
     * @return newReserveIn_ reserves of the selling token after the swap
     * @return newReserveOut_ reserves of the buying token after the swap
     * @return newFictiveReserveIn_ fictive reserve of the selling token after the swap
     * @return newFictiveReserveOut_ fictive reserve of the buying token after the swap
     */
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
        );

    /**
     * @notice return the amount of tokens the user should spend by doing a swap
     * @param _param all the parameters required to get amount from struct GetAmountParameters
     * @return amountIn_ The amount of token the user would spend to receive _amountOut
     * @return newReserveIn_ reserves of the selling token after the swap
     * @return newReserveOut_ reserves of the buying token after the swap
     * @return newFictiveReserveIn_ fictive reserve of the selling token after the swap
     * @return newFictiveReserveOut_ fictive reserve of the buying token after the swap
     */
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
        );

    /**
     * @notice return the amount of tokens the user should spend by doing a swap by directly
     *              fetching data from the pair tokenIn/tokenOut
     * @param _amountIn quantity of token the user want to swap (to buy)
     * @param _tokenIn address of the token the user want to sell
     * @param _tokenOut address of the token the user want to buy
     * @return amountOut_ The amount of token the user would receive
     * @return newReserveIn_ reserves of the selling token after the swap
     * @return newReserveOut_ reserves of the buying token after the swap
     * @return newFictiveReserveIn_ fictive reserve of the selling token after the swap
     * @return newFictiveReserveOut_ fictive reserve of the buying token after the swap
     */
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
        );

    /**
     * @notice return the amount of tokens the user should spend by doing a swap by directly
     *              fetching data from the pair tokenIn/tokenOut
     * @param _amountOut quantity of token the user want to swap (to sell)
     * @param _tokenIn address of the token the user want to sell
     * @param _tokenOut address of the token the user want to buy
     * @return amountIn_ The amount of token the user would spend to receive _amountOut
     * @return newReserveIn_ reserves of the selling token after the swap
     * @return newReserveOut_ reserves of the buying token after the swap
     * @return newFictiveReserveIn_ fictive reserve of the selling token after the swap
     * @return newFictiveReserveOut_ fictive reserve of the buying token after the swap
     */
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
        );

    /**
     * @notice perform a swapExactTokensForTokens with a permit for the entry token
     * @param _amountIn The amount of input tokens to send.
     * @param _amountOutMin The minimum amount of output tokens that must be received for the transaction not to revert.
     * @param _path An array of token addresses. path.length must be >= 2. Pools for each consecutive pair of addresses
     * must exist and have liquidity.
     * @param _to Recipient of the output tokens.
     * @param _deadline unix timestamp after which the transaction will revert
     * @param _approveMax Whether the approval amount in the signature is for uint(-1) (true) or _amountIn (false).
     * @param _v The v component of the permit signature.
     * @param _r The r component of the permit signature.
     * @param _s The s component of the permit signature.
     * @return amountOut_ The output token amount.
     */
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
    ) external returns (uint256 amountOut_);

    /**
     * @notice Perform a swapTokensForExactTokens with a permit for the entry token
     * @param _amountOut The amount of output tokens to receive.
     * @param _amountInMax The maximum amount of input tokens that can be required before the transaction reverts.
     * @param _path An array of token addresses. path.length must be >= 2. Pools for each consecutive pair of addresses
     * must exist and have liquidity.
     * @param _to Recipient of the output tokens.
     * @param _deadline Unix timestamp after which the transaction will revert
     * @param _approveMax Whether the approval amount in the signature is for uint(-1) (true) or _amountInMax (false).
     * @param _v The v component of the permit signature.
     * @param _r The r component of the permit signature.
     * @param _s The s component of the permit signature.
     * @return amountIn_ The input token amount.
     */
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
    ) external returns (uint256 amountIn_);

    /**
     * @notice Perform a swapTokensForExactETH with a permit for the entry token
     * @param _amountOut The amount of output tokens to receive.
     * @param _amountInMax The maximum amount of input tokens that can be required before the transaction reverts.
     * @param _path An array of token addresses. path.length must be >= 2. Pools for each consecutive pair of addresses
     * must exist and have liquidity.
     * @param _to Recipient of the output tokens.
     * @param _deadline Unix timestamp after which the transaction will revert
     * @param _approveMax Whether the approval amount in the signature is for uint(-1) (true) or _amountInMax (false).
     * @param _v The v component of the permit signature.
     * @param _r The r component of the permit signature.
     * @param _s The s component of the permit signature.
     * @return amountIn_ The input token amount.
     */
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
    ) external returns (uint256 amountIn_);

    /**
     * @notice Perform a swapExactTokensForETH with a permit for the entry token
     * @param _amountIn The amount of input tokens to send.
     * @param _amountOutMin The minimum amount of output ETH that must be received for the transaction not to revert.
     * @param _path An array of token addresses. path.length must be >= 2. Pools for each consecutive pair of addresses
     * must exist and have liquidity.
     * @param _to Recipient of the output tokens.
     * @param _deadline Unix timestamp after which the transaction will revert
     * @param _approveMax Whether the approval amount in the signature is for uint(-1) (true) or _amountIn (false).
     * @param _v The v component of the permit signature.
     * @param _r The r component of the permit signature.
     * @param _s The s component of the permit signature.
     * @return amountOut_ The output token amount.
     */
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
    ) external returns (uint256 amountOut_);
}
