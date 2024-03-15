//SPDX-License-Identifier: Unlicense
// This contracts runs on L2, and controls a Greeter on L1.
// The greeter address is specific to Goerli.
pragma solidity ^0.8.0;

contract FromL2_ControlL1Greeter {
    address public crossDomainMessengerAddr;
    address public greeterL1Addr;

    constructor(address _cdma, address _greeterL1Addr) {
        crossDomainMessengerAddr = _cdma;
        greeterL1Addr = _greeterL1Addr;
    }

    function setGreeting(string calldata _greeting) public {
        bytes memory message;

        message = abi.encodeWithSignature("setGreeting(string)", _greeting);

        IMessageSender(crossDomainMessengerAddr).sendMessage(
            0,
            greeterL1Addr,
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
