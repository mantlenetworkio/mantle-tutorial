//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

// For cross domain messages' origin
import {ICrossDomainMessenger} from "@mantleio/contracts/libraries/bridge/ICrossDomainMessenger.sol";

contract Greeter {
    string greeting;
    address public cdmAddr;

    event SetGreeting(
        address sender, // msg.sender
        address origin, // tx.origin
        address xorigin
    );

    constructor(string memory _greeting, address _cdmAddr) {
        greeting = _greeting;
        cdmAddr = _cdmAddr;
    }

    function greet() public view returns (string memory) {
        return greeting;
    }

    function setGreeting(string memory _greeting) public {
        greeting = _greeting;
        emit SetGreeting(msg.sender, tx.origin, getXorig());
    }

    // Get the cross domain origin
    function getXorig() private view returns (address) {
        // If this isn't a cross domain message
        if (msg.sender != cdmAddr) return address(0);

        // If it is a cross domain message, find out where it is from
        return ICrossDomainMessenger(cdmAddr).xDomainMessageSender();
    }
}
