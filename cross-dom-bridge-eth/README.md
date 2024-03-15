# Bridging ETH with the Mantle SDK

This tutorial guides you on using the Mantle SDK to transfer ETH between layer 1 and layer 2.

## Setup

1. Ensure that your computer has the following installed:

   - [`git`](https://git-scm.com/downloads)
   - [`node`](https://nodejs.org/en/)
   - [`yarn`](https://classic.yarnpkg.com/lang/en/docs/install/#mac-stable)
   - [`docker`](https://www.docker.com/products/docker-desktop/)

2. Start L1 and L2 environments. Currently, we support the local environment or the testnet environment. If you want to deploy your own L1 and L2, please follow the instructions below.

   ```sh
   git clone https://github.com/mantlenetworkio/mantle-v2.git
   cd mantle/ops
   make up
   # check status
   make ps
   ```

   **We highly recommend using the testnet environment, you can apply your own L1 RPC [here](https://www.alchemy.com/) and replace the L1 RPC URL in the `.env` file.**

3. Clone this repository and navigate to it.

   ```sh
   git clone https://github.com/mantlenetworkio/mantle-tutorial.git
   cd mantle-tutorial/cross-dom-bridge-eth
   ```

4. Install the necessary packages.
   ```sh
   yarn
   ```

## Run the Sample Code

The sample code is in `index.js`; execute it. This transaction should execute immediately after execution.

### Node Environment

If you want to test by using your own nodes, you should configure the missing or changing environment variables in file `.env.local.tmp` then use `yarn local` to execute `index.js`. If you want to have a test in our testnet network you should do the same for `.env.testnet.tmp` and then use `yarn testnet` to execute `index.js`.

```sh
yarn local
```

## How Does It Work?

```js
#! /usr/local/bin/node

const ethers = require("ethers");
const mantleSDK = require("@mantleio/sdk");
const fs = require("fs");
```

In this tutorial, we initialize the required libraries:

- `ethers`: A JavaScript library for interacting with the Ethereum blockchain. It provides an easy-to-use interface for tasks like creating wallets, sending transactions, and interacting with smart contracts.

- `mantleSDK`: The Mantleio SDK, which facilitates cross-chain transactions between Layer 1 (L1) and Layer 2 (L2) blockchains. It abstracts away complexities, making it easier to perform operations like depositing and withdrawing assets.

- `fs`: The Node.js `fs` module for file system operations. It may be used later in the code for reading or writing files, although it's not explicitly used in the provided snippet.

Next, the code defines some configuration parameters:

```js
const l1bridge = process.env.L1_BRIDGE;
const l2bridge = process.env.L2_BRIDGE;
const key = process.env.PRIV_KEY;
```

- `l1bridge` and `l2bridge`: Environment variables representing the addresses of the layer 1 (L1) and layer 2 (L2) bridges.

- `key`: The private key retrieved from the environment variables.

```js
// Global variable because we need them almost everywhere
let crossChainMessenger;
let addr; // Our address
```

- `crossChainMessenger`: A global variable initialized later in the `setup` function, representing the Mantle SDK's `CrossChainMessenger` object.

- `addr`: A variable that will store the user's address.

### `CreateWallet`

Initialize the signers of L1 and L2

```js
const l1RpcProvider = new ethers.providers.JsonRpcProvider(process.env.L1_RPC);
const l2RpcProvider = new ethers.providers.JsonRpcProvider(process.env.L2_RPC);
const l1Wallet = new ethers.Wallet(key, l1RpcProvider);
const l2Wallet = new ethers.Wallet(key, l2RpcProvider);
```

### `setup`

This function sets up the parameters we need for transfer.

```js
const setup = async () => {
  addr = l1Wallet.address
  crossChainMessenger = new mantleSDK.CrossChainMessenger({
    l1ChainId: process.env.L1_CHAINID,
    l2ChainId: process.env.L2_CHAINID,
    l1SignerOrProvider: l1Wallet,
    l2SignerOrProvider: l2Wallet,
    bedrock: true,
  })
}
......
```

- `setup` function: Initializes the user's address (`addr`) and the `CrossChainMessenger` object for interacting with Mantle's cross-chain functionalities.

### `reportBalances`

This function reports the ETH balances of the address on both layers.

```js
const reportBalances = async () => {
  const l1Balance = await crossChainMessenger.l1Signer.getBalance();
  const ETH = new ethers.Contract(l2ETH, erc20ABI, l2Wallet);
  const l2Balance = await ETH.balanceOf(
    crossChainMessenger.l2Signer.getAddress()
  );

  console.log(`On L1:${l1Balance}     On L2:${l2Balance} `);
};
```

### `depositETH`

This function shows how to deposit ETH from L1 to L2.

```js
console.log("Deposit ETH");
await reportBalances();
```

To show that the deposit actually happened we show before and after balances.

```js
const start = new Date();

const response = await crossChainMessenger.depositETH(eth);
```

`crossChainMessenger.depositETH()` creates and sends the deposit transaction on L1.

```js
console.log(`Transaction hash (on L1): ${response.hash}`);
await response.wait();
```

Of course, it takes time for the transaction to actually be processed on L1.

```js
console.log("Waiting for status to change to RELAYED");
console.log(`Time so far ${(new Date() - start) / 1000} seconds`);
await crossChainMessenger.waitForMessageStatus(
  response,
  mantleSDK.MessageStatus.RELAYED
);
```

After the transaction is processed on L1 it needs to be picked up by an off-chain service and relayed to L2.
To show that the deposit actually happened we need to wait until the message is relayed.

```js
await reportBalances();
console.log(`depositETH took ${(new Date() - start) / 1000} seconds\n\n`);
```

Once the message is relayed the balance change on L2 is practically instantaneous.
We can just report the balances and see that the L2 balance rose by 1.

### `withdrawETH`

This function shows how to withdraw ETH from L2 to L1.

```js
console.log("Withdraw ETH");
const start = new Date();
await reportBalances();
const approve = await crossChainMessenger.approveERC20(
  ethers.constants.AddressZero,
  l2ETH,
  doubleeth,
  { signer: l2Wallet, gasLimit: 300000 }
);
console.log(`Approve transaction hash (on L2): ${approve.hash}`);
const response = await crossChainMessenger.withdrawERC20(
  ethers.constants.AddressZero,
  l2ETH,
  eth,
  { gasLimit: 300000 }
);
```

For deposits it was enough to transfer 1 to show that the L2 balance increases.
However, in the case of withdrawals the withdrawing account needs to be paid for finalizing the message, which costs more than that.

```js
console.log(`Transaction hash (on L2): ${response.hash}`);
await response.wait();

console.log("Waiting for status to be READY_TO_PROVE");
```

We need to wait until the message is ready to prove.

```js
console.log(`Time so far ${(new Date() - start) / 1000} seconds`);
await crossChainMessenger.waitForMessageStatus(
  response.hash,
  mantleSDK.MessageStatus.READY_TO_PROVE
);
console.log(`Time so far ${(new Date() - start) / 1000} seconds`);
await crossChainMessenger.proveMessage(response.hash);

console.log("In the challenge period, waiting for status READY_FOR_RELAY");
console.log(`Time so far ${(new Date() - start) / 1000} seconds`);
await crossChainMessenger.waitForMessageStatus(
  response.hash,
  mantleSDK.MessageStatus.READY_FOR_RELAY
);
```

Wait until the state that includes the transaction gets past the challenge period, at which time we can finalize (also known as claim) the transaction.

```js
console.log("Ready for relay, finalizing message now");
console.log(`Time so far ${(new Date() - start) / 1000} seconds`);
await crossChainMessenger.finalizeMessage(response.hash);

console.log("Waiting for status to change to RELAYED");
console.log(`Time so far ${(new Date() - start) / 1000} seconds`);
await crossChainMessenger.waitForMessageStatus(
  response,
  mantleSDK.MessageStatus.RELAYED
);
```

Finalizing the message also takes a bit of time.

### `main`

A `main` to run the setup followed by both operations.

```js
const main = async () => {
  await setup();
  await depositETH();
  await withdrawETH();
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

## Conclusion

You should now be able to write applications using our SDK and bridge to transfer ETH between L1 and L2.
