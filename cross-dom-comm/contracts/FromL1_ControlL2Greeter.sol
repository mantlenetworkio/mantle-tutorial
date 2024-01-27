//SPDX-License-Identifier: Unlicense
// This contracts runs on L1, and controls a Greeter on L2.
// The addresses are specific to Optimistic Goerli.
pragma solidity ^0.8.0;

contract FromL1_ControlL2Greeter {
    address public crossDomainMessengerAddr;
    address public greeterL2Addr;

    constructor(address _cdma, address _greeterL2Addr) {
        crossDomainMessengerAddr = _cdma;
        greeterL2Addr = _greeterL2Addr;
    }

    function setGreeting(string calldata _greeting) public {
        bytes memory message;

        message = abi.encodeWithSignature("setGreeting(string)", _greeting);

        IMessageSender(crossDomainMessengerAddr).sendMessage(
            0,
            greeterL2Addr,
            message,
            1000000
        );
    }
}
interface IMessageSender {
    function sendMessage(
        uint256 _mntAmount,
        address _target,
        bytes calldata _message,
        uint32 _minGasLimit
    ) external payable;
}