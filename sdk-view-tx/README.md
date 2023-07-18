# View transactions between layers

This tutorial teaches you how to use the Mantleio SDK to view the transactions passed between L1 and L2 by an address.

## Prerequisites

[The node script](./index.js) makes these assumptions:

1. You have [Node.js](https://nodejs.org/en/) running on your computer, as well as [yarn](https://classic.yarnpkg.com/lang/en/).
1. Access to L1 and L2 providers.

## Running the script

1. Use `yarn` to download the packages the script needs.

   ```sh
   yarn
   ```

1. Use Node to run the script

   ```sh
   yarn script
   ```

### Results

Here are the expected results. 
Note that by the time you read this there might be additional transactions reported.

```
Deposits by address 0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f
tx:0x3979f14c8e890aec790fa3743c2d7ae736b48aebfc9dc990e84b77cfaf744525
        Amount: 1 L1EPT
        Relayed: true

Withdrawals by address 0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f
tx:0xe650064362f163a394d3123e20029ed1b03846a6ae62e4cc8e962482c9cd4814
        Amount: 1 L1EPT
        Relayed: false
```

## How does it work?

In this section we go over the script line by line to learn how to use the SDK to view deposits and withdrawals.

```js
#! /usr/local/bin/node

const ethers = require("ethers")
const mantleSDK = require("@mantleio/sdk")
```

```js
// Global variable because we need them almost everywhere
let crossChainMessenger

const setup = async () => {
  crossChainMessenger = new mantleSDK.CrossChainMessenger({
    l1ChainId: process.env.L1_CHAINID,
    l2ChainId: process.env.L2_CHAINID,
    l1SignerOrProvider: l1Wallet,
    l2SignerOrProvider: l2Wallet
  })
}
```

Create the `CrossChainMessenger` object that we use to view information.
Note that we do not need signers here, since we are only calling `view` functions.
However, we do need the chainId values.

```js
// Only the part of the ABI we need to get the symbol
const ERC20ABI = [
  {
    "constant": true,
    "inputs": [],
    "name": "symbol",
    "outputs": [
        {
            "name": "",
            "type": "string"
        }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  }
]

const getSymbol = async l1Addr => {
  if (l1Addr == '0x0000000000000000000000000000000000000000')
    return "ETH"
```

If `l1Addr` is all zeroes, it means the transfer was ETH.

```js
  const l1Contract = new ethers.Contract(l1Addr, ERC20ABI, crossChainMessenger.l1SignerOrProvider)
  return await l1Contract.symbol()  
```

Otherwise, ask the contract (we could have used the L1 or the L2) what is the correct symbol.

```js
const describeTx = async tx => {
  console.log(`tx:${tx.transactionHash}`)
  // Assume all tokens have decimals = 18
  console.log(`\tAmount: ${tx.amount / 1e18} ${await getSymbol(tx.l1Token)}`)
  console.log(`\tRelayed: ${await crossChainMessenger.getMessageStatus(tx.transactionHash)
    == mantleSDK.MessageStatus.RELAYED}`)
}
```

The result of `crossDomainMessenger.getMessageStatus()`is a `MessageStatus` enumerated value.
In this case we only care whether the deposit/withdrawal is still in process or if it is done.

```js
const main = async () => {    
    await setup()
    const deposits = await crossChainMessenger.getDepositsByAddress(l1Wallet.address)
```

The `crossChainMessenger.getDepositsByAddress()` function gives us all the deposits by an address.

```js
    console.log(`Deposits by address ${addr}`)
    for (var i=0; i<deposits.length; i++)
      await describeTx(deposits[i])

    const withdrawals = await crossChainMessenger.getWithdrawalsByAddress(l1Wallet.address)
```

The `crossChainMessenger.getWithdrawalsByAddress()` function gives us all the deposits by an address.

```js
    console.log(`\n\n\nWithdrawals by address ${addr}`)
    for (var i=0; i<withdrawals.length; i++)
      await describeTx(withdrawals[i])
} 

main().then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
```


## Conclusion

You should now know how to identify all the deposits and/or withdrawals done by a specific address.
There are some additional tracing functions in [`CrossChainMessenger`](https://github.com/mantlenetworkio/mantle/blob/4e2e3fe64fc0ba62a473235ec617b4ac2fefd89c/packages/sdk/src/cross-chain-messenger.ts#L58), but they are very similar in operation.
