# Bridging ETH with the Mantleio SDK

This tutorial teaches you how to use the Mantleio SDK to transfer ETH between Layer 1 and Layer 2.

## Setup

1. Ensure your computer has:
   - [`git`](https://git-scm.com/downloads)
   - [`node`](https://nodejs.org/en/)
   - [`yarn`](https://classic.yarnpkg.com/lang/en/docs/install/#mac-stable)
   - [`docker`](https://www.docker.com/products/docker-desktop/)

1. Start local L1 and L2.
    ```sh
    git clone https://github.com/mantlenetworkio/mantle.git
    cd mantle/ops
    make up
    # check status
    make ps
   ```
   
1. Clone this repository and enter it.

   ```sh
   git clone https://github.com/mantlenetworkio/mantle-tutorial.git
   cd mantle-tutorial/cross-dom-bridge-eth
   ```

1. Install the necessary packages.

   ```sh
   yarn
   ```

## Run the sample code

The sample code is in `index.js`, execute it.
This transaction should execute immediately after execution.

### local
If you want have test with `index.js`, you should configure the missing or changing environment variables in file `.env.local.tmp` and change the file name `.env.local.tmp` to `.env.local` then use `yarn local` to execute `index.js`. If you want have a test in our testnet network you should do the same for `.env.testnet.tmp` and then use `yarn testnet` to execute `index.js`.
```sh
  yarn local
```

### Expected output

When running on L1, the output from the script should be similar to:

```sh
Deposit ETH
On L1:4842581276699403084203     On L2:4999499968500000000000 
Transaction hash (on L1): 0x1252ceeb2143975c00143d392495caf8d160a6005a79a348d02de00d068e2f7c
Waiting for status to change to RELAYED
Time so far 0.237 seconds
On L1:4842571065383903084203     On L2:4999509968500000000000 
depositETH took 40.436 seconds

Withdraw ETH
On L1:4842571065383903084203     On L2:4999509968500000000000 
Transaction hash (on L2): 0x7856ed898c90c3908550fbfbdb830012eeb48b7bb65f6e9939f8a10c138b0fb0
Waiting for status to change to IN_CHALLENGE_PERIOD
Time so far 4.08 seconds
In the challenge period, waiting for status READY_FOR_RELAY
Time so far 4.164 seconds
Ready for relay, finalizing message now
Time so far 4.225 seconds
Waiting for status to change to RELAYED
Time so far 6.043 seconds
On L1:4842580346724903084203     On L2:4999499968500000000000 
withdrawETH took 6.065 seconds
```

## How does it work?


```js
#! /usr/local/bin/node

const ethers = require("ethers")
const mantleSDK = require("@mantleio/sdk")
const fs = require("fs")

```

The libraries we need: [`ethers`](https://docs.ethers.io/v5/), [`dotenv`](https://www.npmjs.com/package/dotenv) and the Mantleio SDK itself.

```js
const l1bridge = process.env.L1_BRIDGE
const l2bridge = process.env.L2_BRIDGE
const key = process.env.PRIV_KEY
```

Local default configuration

```js
// Global variable because we need them almost everywhere
let crossChainMessenger
let addr    // Our address
```

The configuration parameters required for transfers.

### `CreateWallet`

Initialize the signers of L1 and L2

```js
const l1RpcProvider = new ethers.providers.JsonRpcProvider(process.env.L1_RPC)
const l2RpcProvider = new ethers.providers.JsonRpcProvider(process.env.L2_RPC)
const l1Wallet = new ethers.Wallet(key, l1RpcProvider)
const l2Wallet = new ethers.Wallet(key, l2RpcProvider)
```

### `setup`

This function sets up the parameters we need for transfers then deploy ERC20 on L1 and L2.

```js
const setup = async() => {
  ourAddr = l1Wallet.address
  crossChainMessenger = new mantleSDK.CrossChainMessenger({
    l1ChainId: process.env.L1_CHAINID,
    l2ChainId: process.env.L2_CHAINID,
    l1SignerOrProvider: l1Wallet,
    l2SignerOrProvider: l2Wallet
  })
......
```
Create the CrossChainMessenger object that we use to transfer assets.

### `reportBalances`

This function reports the ETH balances of the address on both layers.

```js
const reportBalances = async () => {
  const l1Balance = (await crossChainMessenger.l1Signer.getBalance()).toString().slice(0, -18)
  const ETH = new ethers.Contract(l2ETH, erc20ABI, l2Wallet)
  const l2Balance = (await ETH.balanceOf(crossChainMessenger.l2Signer.getAddress())).toString().slice(0, -18)

  console.log(`On L1:${l1Balance}     On L2:${l2Balance} `)
}
```

### `depositETH`

This function shows how to deposit ETH from L1 to L2.

```js
const depositETH = async () => {

  console.log("Deposit ETH")
  await reportBalances()
```

To show that the deposit actually happened we show before and after balances.

```js  
  const start = new Date()

  const response = await crossChainMessenger.depositETH(eth)
```

`crossChainMessenger.depositETH()` creates and sends the deposit trasaction on L1.

```js
  console.log(`Transaction hash (on L1): ${response.hash}`)
  await response.wait()
```

Of course, it takes time for the transaction to actually be processed on L1.

```js
  console.log("Waiting for status to change to RELAYED")
  console.log(`Time so far ${(new Date()-start)/1000} seconds`)
  await crossChainMessenger.waitForMessageStatus(response, mantleSDK.MessageStatus.RELAYED)
```

After the transaction is processed on L1 it needs to be picked up by an off-chain service and relayed to L2. 
To show that the deposit actually happened we need to wait until the message is relayed. 

```js
  await reportBalances()    
  console.log(`depositETH took ${(new Date()-start)/1000} seconds\n\n`)
}
```

Once the message is relayed the balance change on L2 is practically instantaneous.
We can just report the balances and see that the L2 balance rose by 1.

### `withdrawETH`

This function shows how to withdraw ETH from L2 to L1.

```js
const withdrawETH = async () => { 
  
  console.log("Withdraw ETH")
  const start = new Date()  
  await reportBalances()

  const response = await crossChainMessenger.withdrawERC20(ethers.constants.AddressZero, l2ETH, eth)
```

For deposits it was enough to transfer 1 to show that the L2 balance increases.
However, in the case of withdrawals the withdrawing account needs to be pay for finalizing the message, which costs more than that.

```js
  console.log(`Transaction hash (on L2): ${response.hash}`)
  await response.wait()

  console.log("Waiting for status to change to IN_CHALLENGE_PERIOD")
```

There are two wait periods for a withdrawal:

1. Until the status root is written to L1. 
1. The challenge period.

```js
  console.log("Waiting for status to change to IN_CHALLENGE_PERIOD")
  console.log(`Time so far ${(new Date() - start) / 1000} seconds`)
  await crossChainMessenger.waitForMessageStatus(response.hash, mantleSDK.MessageStatus.IN_CHALLENGE_PERIOD)
  console.log("In the challenge period, waiting for status READY_FOR_RELAY")
  console.log(`Time so far ${(new Date() - start) / 1000} seconds`)
  await crossChainMessenger.waitForMessageStatus(response.hash, mantleSDK.MessageStatus.READY_FOR_RELAY)
```

Wait until the state that includes the transaction gets past the challenge period, at which time we can finalize (also known as claim) the transaction.

```js
  console.log("Ready for relay, finalizing message now")
  console.log(`Time so far ${(new Date() - start) / 1000} seconds`)
  await crossChainMessenger.finalizeMessage(response)
  console.log("Waiting for status to change to RELAYED")
  console.log(`Time so far ${(new Date() - start) / 1000} seconds`)
  await crossChainMessenger.waitForMessageStatus(response, mantleSDK.MessageStatus.RELAYED)
```

Finalizing the message also takes a bit of time.


### `main`

A `main` to run the setup followed by both operations.

```js
const main = async () => {    
    await setup()
    await depositETH()
    await withdrawETH() 
}

main().then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
```

## Conclusion

You should now be able to write applications that use our SDK and bridge to transfer ETH between layer 1 and layer 2. 