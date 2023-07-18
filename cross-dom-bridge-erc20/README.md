# Bridging ERC-20 tokens with the Mantleio SDK

This tutorial teaches you how to use the Mantlenetwork SDK to transfer ERC-20 tokens between Layer 1 and Layer 2.
While you *could* use [the bridge contracts](https://github.com/mantlenetworkio/mantle/blob/main/packages/contracts/contracts/L1/messaging/L1StandardBridge.sol) directly


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
   cd mantle-tutorial/cross-dom-bridge-erc20
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

when executed locally, the output from the script should be similar to:

```sh
#################### Deploy ERC20 ####################
Deploying L1 ERC20...
L1 ERC20 Contract ExampleToken Address:  0xCA8c8688914e0F7096c920146cd0Ad85cD7Ae8b9
mint to  0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 10000000000000000000  success
allowance:  10000000000000000000
Deploying L2 ERC20...
L2 ERC20 Contract BVM_L2DepositedERC20 Address:  0x09635F643e140090A9A8Dcd712eD6285858ceBef 

#################### Deposit ERC20 ####################
Token on L1:10000000000000000000     Token on L2:0
Time so far 0.073 seconds
Deposit transaction hash (on L1): 0xe14fb963611c62f1294f97730b33c8e7b215368a2fe57256b9f2b1c9496f9225
Waiting for status to change to RELAYED
Time so far 0.308 seconds
Token on L1:9000000000000000000     Token on L2:1000000000000000000
depositERC20 took 48.527 seconds

#################### Withdraw ERC20 ####################
Token on L1:9000000000000000000     Token on L2:1000000000000000000
Transaction hash (on L2): 0x4ed3fb4c7984bdcd458a3f004e265e73d06f1a3be27959f0612d2959c38841ea
Waiting for status to change to IN_CHALLENGE_PERIOD
Time so far 4.078 seconds
In the challenge period, waiting for status READY_FOR_RELAY
Time so far 4.141 seconds
Ready for relay, finalizing message now
Time so far 4.194 seconds
Waiting for status to change to RELAYED
Time so far 5.986 seconds
Token on L1:10000000000000000000     Token on L2:0
withdrawERC20 took 6.005 seconds
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
const L1TestERC20 = JSON.parse(fs.readFileSync("L1TestERC20.json"))
const L2StandardERC20 = JSON.parse(fs.readFileSync("L2StandardERC20.json"))

const factory__L1_ERC20 = new ethers.ContractFactory(L1TestERC20.abi, L1TestERC20.bytecode)
const factory__L2_ERC20 = new ethers.ContractFactory(L2StandardERC20.abi, L2StandardERC20.bytecode)
```

The factory of the ERC-20 token on L1 and L2.

```js
// Global variable because we need them almost everywhere
let crossChainMessenger
let l1ERC20, l2ERC20
let ourAddr
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


### `reportERC20Balances`

This function reports the ERC-20 balances of the address on both layers.

```js
const reportERC20Balances = async () => {
  const l1Balance = (await l1ERC20.balanceOf(ourAddr)).toString().slice(0, -18)
  const l2Balance = (await l2ERC20.balanceOf(ourAddr)).toString().slice(0, -18)
  console.log(`Token on L1:${l1Balance}     Token on L2:${l2Balance}`)
}
```

Get the balances.

### `depositERC20`

This function shows how to deposit an ERC-20 token from L1 to L2.

```js
const oneToken = BigInt(1e18)
```

`L1EPT` tokens are divided into $10^18$ basic units, same as ETH divided into wei. 

```js
const depositERC20 = async () => {
  console.log("Deposit ERC20")
  await reportERC20Balances()
```

To show that the deposit actually happened we show before and after balances.

```js  
  const start = new Date()

  // Need the l2 address to know which bridge is responsible
  const allowanceResponse = await crossChainMessenger.approveERC20(
    l1ERC20.address, l2ERC20.address, oneToken)
```

To enable the bridge to transfer ERC-20 tokens, it needs to get an allowance first.
The reason to use the SDK here is that it looks up the bridge address for us.
While most ERC-20 tokens go through the standard bridge, a few require custom business logic that has to be written into the bridge itself.
In those cases there is a custom bridge contract that needs to get the allowance. 

```js
  await allowanceResponse.wait()
  console.log(`Allowance given by tx ${allowanceResponse.hash}`)
  console.log(`Time so far ${(new Date()-start)/1000} seconds`)
```

Wait until the allowance transaction is processed and then report the time it took and the hash.

```js
  const response = await crossChainMessenger.depositERC20(
    l1ERC20.address, l2ERC20.address, oneToken)
```

[`crossChainMessenger.depositERC20()`](https://github.com/mantlenetworkio/mantle/blob/main/packages/sdk/src/cross-chain-messenger.ts#L986) creates and sends the deposit trasaction on L1.

```js
  console.log(`Deposit transaction hash (on L1): ${response.hash}`)
  await response.wait()
```

Of course, it takes time for the transaction to actually be processed on L1.

```js
  console.log("Waiting for status to change to RELAYED")
  console.log(`Time so far ${(new Date()-start)/1000} seconds`)
  await crossChainMessenger.waitForMessageStatus(response.hash, mantleSDK.MessageStatus.RELAYED)

```

After the transaction is processed on L1 it needs to be picked up by an off-chain service and relayed to L2. 
To show that the deposit actually happened we need to wait until the message is relayed. 
The [`waitForMessageStatus`](https://github.com/mantlenetworkio/mantle/blob/4e2e3fe64fc0ba62a473235ec617b4ac2fefd89c/packages/sdk/src/cross-chain-messenger.ts#L508) function does this for us.

```js
  await reportERC20Balances()
  console.log(`depositERC20 took ${(new Date()-start)/1000} seconds\n\n`)
}     // depositERC20()
```

Once the message is relayed the balance change on L2 is practically instantaneous.
We can just report the balances and see that the L2 balance rose by 1.

### `withdrawETH`

This function shows how to withdraw ERC-20 from L2 to L1.

```js
const withdrawERC20 = async () => {
 console.log("#################### Withdraw ERC20 ####################")
  const start = new Date()
  await reportERC20Balances()

  const response = await crossChainMessenger.withdrawERC20(
    l1ERC20.address, l2ERC20.address, oneToken)
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
  await crossChainMessenger.waitForMessageStatus(response.hash,
    mantleSDK.MessageStatus.IN_CHALLENGE_PERIOD)
  console.log("In the challenge period, waiting for status READY_FOR_RELAY")
  console.log(`Time so far ${(new Date() - start) / 1000} seconds`)
  await crossChainMessenger.waitForMessageStatus(response.hash,
    mantleSDK.MessageStatus.READY_FOR_RELAY)
```

Wait until the state that includes the transaction gets past the challenge period, at which time we can finalize (also known as claim) the transaction.

```js
  console.log("Ready for relay, finalizing message now")
  console.log(`Time so far ${(new Date() - start) / 1000} seconds`)
  await crossChainMessenger.finalizeMessage(response)
  console.log("Waiting for status to change to RELAYED")
  console.log(`Time so far ${(new Date() - start) / 1000} seconds`)
  await crossChainMessenger.waitForMessageStatus(response,
    mantleSDK.MessageStatus.RELAYED)
  await reportERC20Balances()
```

Finalizing the message also takes a bit of time.

### `main`

A `main` to run the setup followed by both operations.

```js
const main = async () => {
  await setup()
  await depositERC20()
  await withdrawERC20()
}


main().then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
```

## Conclusion

You should now be able to write applications that use our SDK and bridge to transfer ERC-20 assets between layer 1 and layer 2. 
