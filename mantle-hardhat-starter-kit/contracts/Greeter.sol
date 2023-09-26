// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

contract Greeter {
    string public greeting = "Hello World!";

    function setGreeting(string memory greeting_) public {
        greeting = greeting_;
    }
}
