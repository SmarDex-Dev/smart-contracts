// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.17;

import "./ISmardexFactory.sol";

/**
 * @notice the real interface of SmardexFactory, including owner's functions.
 *         Needs to be separate due to a missing IOwner interface of OpenZeppelin
 */
interface ISmardexOwnableFactory is ISmardexFactory {
    /**
     * @notice emitted each ownership transfer
     * @param previousOwner previous owner
     * @param newOwner new owner
     */
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /**
     * @dev Returns the address of the current owner.
     * @return address of the owner
     */
    function owner() external view returns (address);

    /**
     * @dev Leaves the contract without owner. It will not be possible to call
     * `onlyOwner` functions anymore. Can only be called by the current owner.
     *
     * NOTE: Renouncing ownership will leave the contract without an owner,
     * thereby removing any functionality that is only available to the owner.
     */
    function renounceOwnership() external;

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner.
     * @param _newOwner : address of the new owner
     */
    function transferOwnership(address _newOwner) external;
}
