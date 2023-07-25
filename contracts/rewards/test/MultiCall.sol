// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

contract MultiCall {
    function multiCall(address _target, bytes[] calldata _data) external returns (bytes[] memory) {
        uint256 _dataLength = _data.length;
        bytes[] memory _results = new bytes[](_dataLength);

        for (uint _i; _i < _dataLength; ) {
            (bool _success, bytes memory _result) = _target.call(_data[_i]);
            require(_success, string(_result));
            _results[_i] = _result;

            unchecked {
                ++_i;
            }
        }

        return _results;
    }
}
