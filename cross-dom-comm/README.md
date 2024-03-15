# Communication between contracts on L1 and L2

This tutorial teaches you how to do interlayer communication.
You will learn how to run a contract on L1 that runs another contract on L2, and also how to run a contract on L2 that calls a contract on L1.

## Seeing it in action

To show how this works we need to install [a slightly](./contracts/Greeter.sol) modified version of HardHat's `Greeter.sol`](./contracts/Greeter.sol) on both L1 and L2.

```js
console.log("Deploying L1 Greeter...");
L1Greeter = await factory__Greeter.connect(l1Wallet).deploy("L1 hello", L1CDM);
await L1Greeter.deployTransaction.wait();
console.log("L1 Greeter Contract Address: ", L1Greeter.address);

console.log("Deploying L2 Greeter...");
L2Greeter = await factory__Greeter.connect(l2Wallet).deploy("L2 hello", L2CDM);
await L1Greeter.deployTransaction.wait();
console.log("L2 Greeter Contract Address: ", L1Greeter.address);
```

### Hardhat

This is how you can see communication between domains work in hardhat.

#### Setup

This setup assumes you already have [Node.js](https://nodejs.org/en/) and [yarn](https://classic.yarnpkg.com/) installed on your system.

1. Install the necessary packages.

   ```sh
   yarn
   ```

#### L1 message to L2

1. Connect the L1 and L2

   ```js
   const l1RpcProvider = new ethers.providers.JsonRpcProvider(
     process.env.L1_RPC
   );
   const l2RpcProvider = new ethers.providers.JsonRpcProvider(
     process.env.L2_RPC
   );
   const l1Wallet = new ethers.Wallet(key, l1RpcProvider);
   const l2Wallet = new ethers.Wallet(key, l2RpcProvider);
   ```

1. Deploy the greeter on L1 and L2:

   ```js
   L1Greeter = await factory__Greeter
     .connect(l1Wallet)
     .deploy("L1 hello", L1CDM);
   await L1Greeter.deployTransaction.wait();
   console.log("L1 Greeter Contract Address: ", L1Greeter.address);

   console.log("Deploying L2 Greeter...");
   L2Greeter = await factory__Greeter
     .connect(l2Wallet)
     .deploy("L2 hello", L2CDM);
   await L1Greeter.deployTransaction.wait();
   console.log("L2 Greeter Contract Address: ", L1Greeter.address);
   ```

1. Deploy the `FromL1_ControlL2Greeter` contract.

   ```js
   console.log(
     "#################### Deploy Control Greeter ####################"
   );
   console.log("Deploying L1 ControlL2Greeter...");
   L1_ControlL2Greeter = await factory__FromL1_ControlL2Greeter
     .connect(l1Wallet)
     .deploy(L1CDM, L2Greeter.address);
   await L1_ControlL2Greeter.deployTransaction.wait();
   console.log(
     "L1_ControlL2Greeter Contract Address: ",
     L1_ControlL2Greeter.address
   );
   ```

1. Make a note of the object.

   ```js
   let L1Greeter, L2Greeter;
   let L1_ControlL2Greeter, L2_ControlL1Greeter;
   ```

1. Send msg to L2.

   ```js
   console.log("#################### Send Msg L1 To L2 ####################");
   await reportGreet();
   let start = new Date();
   let response = await L1_ControlL2Greeter.setGreeting("L1 say hi to L2");
   console.log(`Transaction hash (on L1): ${response.hash}`);
   await response.wait();
   console.log("Waiting for status to change to RELAYED");
   console.log(`Time so far ${(new Date() - start) / 1000} seconds`);
   await crossChainMessenger.waitForMessageStatus(
     response.hash,
     mantleSDK.MessageStatus.RELAYED
   );
   console.log("After");
   await reportGreet();
   ```

#### L2 message to L1

##### Send the message

1. Deploy and call the `FromL2_ControlL1Greeter` contract.

   ```js
   console.log("Deploying L2 ControlL1Greeter...");
   L2_ControlL1Greeter = await factory__FromL2_ControlL1Greeter
     .connect(l2Wallet)
     .deploy(L2CDM, L1Greeter.address);
   await L2_ControlL1Greeter.deployTransaction.wait();
   console.log(
     "L2_ControlL1Greeter Contract Address: ",
     L2_ControlL1Greeter.address
   );
   ```

1. Make a note of the object of `FromL2_ControlL1Greeter`.

   ```js
   let L2_ControlL1Greeter;
   ```

1. Send msg to L1.

   ```js
   response = await L2_ControlL1Greeter.setGreeting("L2 say hi to L1");
   console.log(`Transaction hash (on L2): ${response.hash}`);
   ```

### Receive the message

In actual scene, the transactions from L2 to L1 are not accepted immediately, because we need to wait to make sure there are no successful challenges.In a local environment you don't have to worry,because the challenge period is 0.
Once the fault challenge period is over, it is necessary to claim the transaction on L1.

1. Get the SDK (it is already in `node_modules`).

   ```js
   sdk = require("@mantlenio/sdk");
   ```

1. Configure a `CrossChainMessenger` object:

   ```js
   addr = l1Wallet.address;
   crossChainMessenger = new mantleSDK.CrossChainMessenger({
     l1ChainId: process.env.L1_CHAINID,
     l2ChainId: process.env.L2_CHAINID,
     l1SignerOrProvider: l1Wallet,
     l2SignerOrProvider: l2Wallet,
     bedrock: true,
   });
   ```

1. Check the status of the transaction.
   If it is `false`, wait a few seconds and try again.

   ```js
   hash = <<< tx.hash from L2 >>>
   (await crossChainMessenger.getMessageStatus(hash)) == sdk.MessageStatus.READY_FOR_RELAY
   ```

   `await crossChainMessenger.getMessageStatus(hash)` can return several values at this stage:

   - `sdk.MessageStatus.STATE_ROOT_NOT_PUBLISHED` (2): The state root has not been published yet.
     The challenge period only starts when the state root is published, which is means you might need to wait a few minutes.

   - `sdk.MessageStatus.IN_CHALLENGE_PERIOD` (3): Still in the challenge period, wait a few seconds.

   - `sdk.MessageStatus.READY_FOR_RELAY` (4): Ready to finalize the message.
     Go on to the next step.

1. Finalize the message.

   ```js
   tx = await crossChainMessenger.finalizeMessage(hash);
   rcpt = await tx.wait();
   ```

## How it's done (in Solidity)

We'll go over the L1 contract that controls Greeter on L2, [`FromL1_ControlL2Greeter.sol`](./contracts/FromL1_ControlL2Greeter.sol).
Except for addresses, the contract going the other direction, [`FromL2_ControlL1Greeter.sol`](./contracts/FromL2_ControlL21reeter.sol), is identical.

```solidity
//SPDX-License-Identifier: Unlicense
// This contracts runs on L1, and controls a Greeter on L2.
pragma solidity ^0.8.0;

import { ICrossDomainMessenger } from
    "mantlenio/contracts/libraries/bridge/ICrossDomainMessenger.sol";
```

This line imports the interface to send messages, [`ICrossDomainMessenger.sol`](https://github.com/mantlenio/mantle/blob/main/packages/contracts/contracts/L1/messaging/IL1CrossDomainMessenger.sol).

```solidity
contract FromL1_ControlL2Greeter {
   address public crossDomainMessengerAddr;
    address public greeterL2Addr;

    constructor(address _cdma, address _greeterL2Addr) {
        crossDomainMessengerAddr = _cdma;
        greeterL2Addr = _greeterL2Addr;
    }
```

```solidity
    function setGreeting(string calldata _greeting) public {
```

This function sets the new greeting. Note that the string is stored in `calldata`.
This saves us some gas, because when we are called from an externally owned account or a different contract there no need to copy the input string to memory.
The downside is that we cannot call `setGreeting` from within this contract, because contracts cannot modify their own calldata.

```solidity
        bytes memory message;
```

This is where we'll store the message to send to L2.

```solidity
        message = abi.encodeWithSignature("setGreeting(string)",
            _greeting);
```

Here we create the message, the calldata to be sent on L2.
The Solidity [`abi.encodeWithSignature`](https://docs.soliditylang.org/en/v0.8.12/units-and-global-variables.html?highlight=abi.encodeWithSignature#abi-encoding-and-decoding-functions) function creates this calldata.
As [specified in the ABI](https://docs.soliditylang.org/en/v0.8.12/abi-spec.html), it is four bytes of signature for the function being called followed by the parameter, in this case a string.

```solidity
        ICrossDomainMessenger(crossDomainMessengerAddr).sendMessage(
            greeterL2Addr,
            message,
            1000000   // within the free gas limit amount
        );
```

This call actually sends the message. It gets three parameters:

1. The address on L2 of the contract being contacted
1. The calldata to send that contract
1. The gas limit.
   As long as the gas limit is below the [`enqueueL2GasPrepaid`](https://etherscan.io/address/0x5E4e65926BA27467555EB562121fac00D24E9dD2#readContract) value, there is no extra cost.
   Note that this parameter is also required on messages from L2 to L1, but there it does not affect anything.

## Getting the source address

The way this works is that the cross domain messenger that calls the target contract has a method, `xDomainMessageSender()`, that returns the source address. It is used by the `getXsource` function in `Greeter`.

```solidity
  // Get the cross domain origin, if any
  function getXorig() private view returns (address) {
    address cdmAddr = address(0);
```

```solidity
    // If this isn't a cross domain message
    if (msg.sender != cdmAddr)
      return address(0);
```

If the sender isn't the cross domain messenger, then this isn't a cross domain message.
Just return zero.

```solidity
    // If it is a cross domain message, find out where it is from
    return ICrossDomainMessenger(cdmAddr).xDomainMessageSender();
  }    // getXorig()
```

If it is the cross domain messenger, call `xDomainMessageSender()` to get the original source address.

## Conclusion

You should now be able to control contracts on L2 from L1 or the other way around.
This is useful, for example, if you want to hold cheap DAO votes on L2 to manage an l1 treasury (see [rollcall](https://github.com/withtally/rollcall)) or offload a complicated calculation, which must be done in a traceable manner, to L2 where gas is cheap.
