# Bridging ERC-721 tokens with the Mantle SDK

This tutorial teaches you how to use the Mantlenetwork SDK to transfer ERC-721 token between Layer 1 and Layer 2.
While you _could_ use [the bridge contracts](https://github.com/mantlenetworkio/mantle-v2/blob/5f86db304a9dff61510297223fa27317130d3c5d/packages/contracts-bedrock/contracts/L1/L1ERC721Bridge.sol#L4) directly

## Setup

1. Ensure your computer has:

   - [`git`](https://git-scm.com/downloads)
   - [`node`](https://nodejs.org/en/)
   - [`yarn`](https://classic.yarnpkg.com/lang/en/docs/install/#mac-stable)
   - [`docker`](https://www.docker.com/products/docker-desktop/)

2. Start L1 and L2. Currently, we support the local environment or the testnet environment. If you want to deploy your own L1 and L2, please follow the instructions below.

   ```sh
   git clone https://github.com/mantlenetworkio/mantle-v2.git
   cd mantle/ops
   make up
   # check status
   make ps
   ```

   **We highly recommend using the testnet environment, you can apply your own L1 RPC [here](https://www.alchemy.com/) and replace the L1 RPC URL in the `.env` file.**

3. Clone this repository and enter it.

   ```sh
   git clone https://github.com/mantlenetworkio/mantle-tutorial.git
   cd mantle-tutorial/cross-dom-bridge-erc721
   ```

4. Install the necessary packages.

   ```sh
   yarn
   ```

## Run the sample code

The sample code is in `index.js`, execute it.
This transaction should execute immediately after execution.

### Node Environment

If you want to test by using your own nodes, you should configure the missing or changing environment variables in file `.env.local.tmp` then use `yarn local` to execute `index.js`. If you want to have a test in our testnet network you should do the same for `.env.testnet.tmp` and then use `yarn testnet` to execute `index.js`.

```sh
  yarn testnet
```

## How does it work?

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
const key = process.env.PRIV_KEY;
```

- `key`: The private key retrieved from the environment variables.

```js
const L1TestERC721 = JSON.parse(fs.readFileSync("L1TestERC721.json"));
const L2TestERC721 = JSON.parse(fs.readFileSync("L2TestERC721.json"));
const L2ERC721Factory = JSON.parse(
  fs.readFileSync("OptimismMintableERC721.json")
);


const factory__L1_ERC721 = new ethers.ContractFactory(
  L1TestERC721.abi,
  L1TestERC721.bytecode
);

```

The factory of the ERC-721 token on L1.

```js
// Global variable because we need them almost everywhere
let crossChainMessenger;
let l1ERC721, l2ERC721;
let tokenId;
let ourAddr;
```

The configuration parameters required for transfers.

### `CreateWallet`

Initialize the signers of L1 and L2

```js
const l1RpcProvider = new ethers.providers.JsonRpcProvider(process.env.L1_RPC);
const l2RpcProvider = new ethers.providers.JsonRpcProvider(process.env.L2_RPC);
const l1Wallet = new ethers.Wallet(key, l1RpcProvider);
const l2Wallet = new ethers.Wallet(key, l2RpcProvider);
```

### `setup`

This function sets up the parameters we need for transfers and then deploys ERC20 on L1 and L2.

```js
ourAddr = l1Wallet.address;
crossChainMessenger = new mantleSDK.CrossChainMessenger({
  l1ChainId: process.env.L1_CHAINID,
  l2ChainId: process.env.L2_CHAINID,
  l1SignerOrProvider: l1Wallet,
  l2SignerOrProvider: l2Wallet,
  bedrock: true,
});
```

Create the CrossChainMessenger object that we use to transfer assets.

```js
console.log("#################### Deploy ERC721 ####################");
console.log("Deploying L1 ERC721...");
const tokenName = "TEST NFT FOR SDK0";
const tokenSymbol = "TESTNFT0";
const L1_ERC721 = await factory__L1_ERC721
  .connect(l1Wallet)
  .deploy(tokenName, tokenSymbol);
await L1_ERC721.deployTransaction.wait();
console.log("L1 ERC721 Contract ExampleToken Address: ", L1_ERC721.address);
```

Deploy the ERC-721 token on L1.

```js
const awardTx = await L1_ERC721.connect(l1Wallet).awardItem(l1Wallet.address, '');
tokenId = (await awardTx.wait()).events[0].args[2].toNumber();
console.log("award NFT", l1Wallet.address, tokenId, " success");
```

award the ERC-721 token on L1.


```js
console.log("Deploying L2 ERC721...");
const OptimismMintableERC721Factory = new ethers.Contract(
  L2_OPTIMISM_MINT_FACTORY_ADDRESS,
  L2ERC721Factory.abi,
  l2RpcProvider
);

const tx = await OptimismMintableERC721Factory.connect(
  l2Wallet
).createOptimismMintableERC721(L1_ERC721.address, tokenName, tokenSymbol);
await tx.wait();
console.log("depoly l2 erc721 tx hash", tx.hash);
const receipt = await l2RpcProvider.getTransactionReceipt(tx.hash);
if (!receipt) {
  console.log("Transaction not found or not confirmed yet");
  return;
}
const iface = new ethers.utils.Interface(L2ERC721Factory.abi);
const log = receipt.logs.find(
  (log) =>
    log.address.toLowerCase() ===
    L2_OPTIMISM_MINT_FACTORY_ADDRESS.toLowerCase()
);
if (!log) {
  console.log("Could not find the event log for the new contract creation");
  return;
}

const parsedLog = iface.parseLog(log);
console.log("New ERC721 contract address:", parsedLog.args[0]);
const L2_ERC721 = new ethers.Contract(
  parsedLog.args[0],
  L2TestERC721.abi,
  l2RpcProvider
);
l1ERC721 = L1_ERC721;
l2ERC721 = L2_ERC721;
```

Deploy the ERC-721 token on L2.

### `reportERC721Balances`

This function reports the ERC-20 balances of the address on both layers.

```js
const reportERC721Balances = async () => {
  const l1Balance = await l1ERC721.balanceOf(ourAddr);
  const l2Balance = await l2ERC721.balanceOf(ourAddr);
  console.log(`Token on L1:${l1Balance}    Token on L2:${l2Balance}`);
};
```

### `depositERC721`

This function shows how to deposit an ERC-721 token from L1 to L2.

```js
console.log("#################### Deposit ERC721 ####################");
await reportERC721Balances();
```

To show that the deposit actually happened we show before and after balances.

```js
const start = new Date();

// Need the l2 address to know which bridge is responsible
const start = new Date();

const isApproved = await crossChainMessenger.approval(
  l1ERC721.address,
  l2ERC721.address
);
if (!isApproved) {
  const approveTx = await crossChainMessenger.approveERC721(
    l1ERC721.address,
    l2ERC721.address
  );
  await approveTx.wait();
  console.log(`approval given by tx ${approveTx.hash}`);
  console.log(`Time so far ${(new Date() - start) / 1000} seconds`);
}
```

To enable the bridge to transfer ERC-721 tokens, it needs to get an allowance first.
The reason to use the SDK here is that it looks up the bridge address for us.
While most ERC-721 tokens go through the standard bridge, a few require custom business logic that has to be written into the bridge itself.
In those cases, there is a custom bridge contract that needs to get the allowance.


```js
const response = await crossChainMessenger.depositERC721(
  l1ERC721.address,
  l2ERC721.address,
  tokenId,
  {
    overrides: {
      gasLimit: 400000,
    },
  }
);
```

[`crossChainMessenger.depositERC721()`](https://github.com/mantlenetworkio/mantle/blob/main/packages/sdk/src/cross-chain-messenger.ts#L986) creates and sends the deposit transaction on L1.

```js
console.log(`Deposit transaction hash (on L1): ${response.hash}`);
await response.wait();
```

Of course, it takes time for the transaction to actually be processed on L1.

```js
console.log("Waiting for status to change to RELAYED");
console.log(`Time so far ${(new Date() - start) / 1000} seconds`);
await crossChainMessenger.waitForMessageStatus(
  response.hash,
  mantleSDK.MessageStatus.RELAYED
);
```

After the transaction is processed on L1 it needs to be picked up by an off-chain service and relayed to L2.
To show that the deposit actually happened we need to wait until the message is relayed.
The [`waitForMessageStatus`](https://github.com/mantlenetworkio/mantle/blob/4e2e3fe64fc0ba62a473235ec617b4ac2fefd89c/packages/sdk/src/cross-chain-messenger.ts#L508) function does this for us.

```js
  await reportERC721Balances()
  console.log(`depositERC721 took ${(new Date() - start) / 1000} seconds\n`);
  // depositERC721()
```

Once the message is relayed the balance change on L2 is practically instantaneous.
We can just report the balances and see that the L2 balance rose by 1.

### `withdrawERC721`

This function shows how to withdraw ERC-20 from L2 to L1.

```js
console.log("#################### Withdraw ERC721 ####################");
const start = new Date();
await reportERC721Balances();

const response = await crossChainMessenger.withdrawERC721(
  l1ERC721.address,
  l2ERC721.address,
  tokenId
);
console.log(`Transaction hash (on L2): ${response.hash}`);
await response.wait();
```

[`crossChainMessenger.withdrawERC721()`](https://github.com/mantlenetworkio/mantle/blob/main/packages/sdk/src/cross-chain-messenger.ts#L1015) creates and sends the withdraw transaction on L2.

```js
console.log("Waiting for status to be READY_TO_PROVE");
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
await crossChainMessenger.finalizeMessage(response.hash,{
    overrides: {
      gasLimit: 470000,
    },
  });

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
  await depositERC721();
  await withdrawERC721();
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

## Conclusion

You should now be able to write applications that use our SDK and bridge to transfer ERC-721 assets between layer 1 and layer 2.
