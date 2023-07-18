# Estimate the costs of a Mantle (L2) transaction


This tutorial teaches you how to use the Mantle SDK to estimate the gas costs of L2 transactions. 
This calculation is complicated by the fact that the major cost is the cost of writing the transaction on L1, it doesn't work to just multiply the gas used by the transaction by the gas price, the same way you would on L1. 
[You can read the details of the calculation here](https://github.com/mantlenetworkio/mantle).



## Prerequisites

[The node script](./gas.js) makes these assumptions:

- You have [Node.js](https://nodejs.org/en/) running on your computer, as well as [yarn](https://classic.yarnpkg.com/lang/en/).
- There is network connectivity to a provider on the Optimistic Goerli L2 network, and to the npm package registry.


## Running the script

1. Use `yarn` to download the packages you need

   ```sh
   yarn
   ```

2. Use yarn to run the script

   ```sh
   yarn script
   ```

### Results

Here is an example of results from the main Mantle blockchain:


```
(base) ➜  sdk-estimate-gas git:(Main) ✗ yarn script
yarn run v1.22.19
$ node gas.js
#################### Deploy Greeter ####################
Deploying L2 Greeter...
L2 Greeter Contract Address:  0xc48078a734c2e22D43F54B47F7a8fB314Fa5A601
#################### Greeter Deployed ####################

About to get estimates
About to create the transaction
Transaction created and submitted
Transaction processed
Estimates:
   Total gas cost:                    0 wei
      L1 gas cost:                    0 wei
      L2 gas cost:                    0 wei

Real values:
   Total gas cost:                    0 wei
      L1 gas cost:                    0 wei
      L2 gas cost:                    0 wei

L1 Gas:
      Estimate:       4878
          Real:       4878
    Difference:          0

L2 Gas:
      Estimate:      35368
          Real:      35354
    Difference:        -14
✨  Done in 0.59s.
```

The L1 gas cost is over a thousand times the L2 gas cost.
This is typical in Optimistic transactions, because of the cost ratio between L1 gas and L2 gas.



## How does it work?

In this section we go over the relevant parts of the script.


### Setup


```js
#! /usr/local/bin/node

// Estimate the costs of an Optimistic (L2) transaction
require('dotenv').config()
const ethers = require("ethers")
const mantleSDK = require("@mantleio/sdk")
const fs = require("fs")
const { spawn } = require("child_process")
```

The packages needed for the script.

```js
const greeterJSON = JSON.parse(fs.readFileSync("Greeter.json")) 
```

Read the [JSON file](./Greeter.json) to know how to use the `Greeter` contract.

```js
const getGreeter = async () => {
  console.log("#################### Deploy Greeter ####################")
  console.log('Deploying L2 Greeter...')
  const L2_Greeter = await factory__L2_Greeter.connect(l2Wallet).deploy(
    'greeter init',
  )
  await L2_Greeter.deployTransaction.wait()
  console.log("L2 Greeter Contract Address: ", L2_Greeter.address)
  console.log("#################### Greeter Deployed ####################\n")

  return L2_Greeter
}
```

deploy Greeter contract at local l2，will get deployed messages:

```js
#################### Deploy Greeter ####################
Deploying L2 Greeter...
L2 Greeter Contract Address:  0xc48078a734c2e22D43F54B47F7a8fB314Fa5A601
#################### Greeter Deployed ####################
```


```js
// Utilities
const displayWei = x => x.toString().padStart(20, " ")                        
const displayGas = x => x.toString().padStart(10, " ")
```

Display a value (either wei or gas).
To properly align these values for display, we first turn [them into strings](https://www.w3schools.com/jsref/jsref_tostring_number.asp) and then [add spaces to the start](https://www.javascripttutorial.net/es-next/pad-string/) until the total value is the right length (20 or 10 characters).


### getSigner

```js
const key = process.env.PRIV_KEY
const l2RpcProvider = mantleSDK.asL2Provider(
  new ethers.providers.JsonRpcProvider(process.env.L2_RPC)
)
```

The function `mantleSDK.asL2Provider` takes a regular [Ethers.js Provider](https://docs.ethers.io/v5/api/providers/) and adds a few L2 specific functions, which are explained below.
Because it only adds functions, an `L2Provider` can be used anywhere you use an Ethers `Provider`.

```js
const l2Wallet = new ethers.Wallet(key, l2RpcProvider)
```

### getEstimates

```js
// Get estimates from the SDK
const getEstimates = async (provider, tx) => {
  return {
    totalCost: await provider.estimateTotalGasCost(tx),
```

Estimate the total cost (L1+L2) of running the transaction.

> :warning: This function calls `eth_estimateGas`, which runs the transaction in the node (without changing the blockchain state). 
> This means that the account in `l2Provider` has to have enough ETH to pay for the gas cost of the transaction.

```js
    l1Cost: await provider.estimateL1GasCost(tx),
    l2Cost: await provider.estimateL2GasCost(tx),
```

Estimate the two components of the cost: L1 and L2

```js    
    l1Gas: await provider.estimateL1Gas(tx)
  }
}    // getEstimates
```

Get the amount of gas we expect to use to store the transaction on L1


### displayResults


```js

const displayResults = (estimated, real) => {
  console.log(`Estimates:`)
  console.log(`   Total gas cost: ${displayWei(estimated.totalCost)} wei`)
  console.log(`      L1 gas cost: ${displayWei(estimated.l1Cost)} wei`)
  console.log(`      L2 gas cost: ${displayWei(estimated.l2Cost)} wei`)
```

Show the gas cost estimates.

```js
  console.log(`\nReal values:`)
  console.log(`   Total gas cost: ${displayWei(real.totalCost)} wei`)
  console.log(`      L1 gas cost: ${displayWei(real.l1Cost)} wei`)
  console.log(`      L2 gas cost: ${displayWei(real.l2Cost)} wei`)
```

show the real values.

```js
    console.log(`\nL1 Gas:`)
    console.log(`      Estimate: ${displayGas(estimated.l1Gas)}`)
    console.log(`          Real: ${displayGas(real.l1Gas)}`)  
    console.log(`    Difference: ${displayGas(real.l1Gas-estimated.l1Gas)}`)
```

Compare the L1 gas estimated with the L1 gas actually required.

```js
    console.log(`\nL2 Gas:`)
    console.log(`      Estimate: ${displayGas(estimated.l2Gas)}`)
    console.log(`          Real: ${displayGas(real.l2Gas)}`)  
    console.log(`    Difference: ${displayGas(real.l2Gas-estimated.l2Gas)}`)
```

Compare the L2 gas estimates with the L2 gas actually required.



### main

```js

const getGreeter = async () => {
  console.log("#################### Deploy Greeter ####################")
  console.log('Deploying L2 Greeter...')
  const L2_Greeter = await factory__L2_Greeter.connect(l2Wallet).deploy(
    'greeter init',
  )
  await L2_Greeter.deployTransaction.wait()
  console.log("L2 Greeter Contract Address: ", L2_Greeter.address)
  console.log("#################### Greeter Deployed ####################\n")

  return L2_Greeter
}

const main = async () => {
  const greeter = await getGreeter()

  const greeting = "Hello!"
  let real = {}
```

To create a valid estimate, we need these transaction fields:

- `data`
- `to`
- `gasPrice`
- `type`
- `nonce`
- `gasLimit`

We need the exact values, because a zero costs only 4 gas and any other byte costs 16 bytes.
For example, it is cheaper to encode `gasLimit` if it is `0x100000` rather than `0x10101`.

```js
    const fakeTxReq = await greeter.populateTransaction.setGreeting(greeting)
```

Ether's [`populateTransaction` function](https://docs.ethers.io/v5/api/contract/contract/#contract-populateTransaction) gives us three fields:

- `data`
- `from`
- `to`

```js
    const fakeTx = await signer.populateTransaction(fakeTxReq)
```

The contract cannot provide us with the `nonce`, `chainId`, `gasPrice`, or `gasLimit`.
To get those fields we use [`signer.populateTransaction`](https://docs.ethers.io/v5/api/signer/#Signer-populateTransaction).

```js
    console.log("About to get estimates")
    let estimated = await getEstimates(signer.provider, fakeTx)
```

Call `getEstimates` to get the `L2Provider` estimates.

```js
    estimated.l2Gas = await greeter.estimateGas.setGreeting(greeting)
```

There is no need for a special function to estimate the amount of L2 gas, the normal `estimateGas.<function>` can do the same job it usually does.

```js
      // If the transaction fails, error out with additional information
      let realTx, realTxResp
      const weiB4 = await signer.getBalance()
```

Get the balance prior to the transaction, so we'll be able to see how much it really costs.

```js
      try {
        console.log("About to create the transaction")
        realTx = await greeter.setGreeting(greeting)
        console.log("Transaction created, submitting it")
        realTxResp = await realTx.wait()
        console.log("Transaction processed")
```

Create the transaction and then wait for it to be processed.
This is [the standard way to submit a transaction in Ethers](https://docs.ethers.io/v5/api/contract/contract/#contract-functionsSend).

```js
      } catch (err) {        
        console.log(`Error: ${err}`)
        console.log(`Coming from address: ${await signer.getAddress()} on Optimistic ${network}`)
        console.log(`            balance: ${displayWei(await signer.getBalance())} wei`)
        process.exit(-1)
      }
```

If the transaction failed, it could be because the account lacks the ETH to pay for gas.
The error message shows that information so the user knows about it.

```js
      // If the balance hasn't been updated yet, wait 0.1 sec
      real.totalCost = 0
      let i = 0
      while (real.totalCost === 0) {
          const weiAfter = await l2Wallet.getBalance()
          real.totalCost= weiB4-weiAfter
          i+=1
          if (i > 10){
            break
          }
          await sleep(100)
      }
```

It takes a bit of time before the change in the account's balance is processed.
This loop lets us wait 10 times.

Note that this is not the only way to wait until a transaction happens.
You can also use `crossDomainMessenger.waitForMessageStatus`. 

```js
      // Get the real information (cost, etc.) from the transaction response
      real.l1Gas = realTxResp.l1GasUsed
      real.l1Cost = realTxResp.l1Fee 
```

These fields are specific to Mantle transaction responses.

```js
      real.l2Gas = realTxResp.gasUsed
```

The gas used on L2 is the gas used for processing.
[This field is standard in Ethers](https://docs.ethers.io/v5/api/providers/types/#providers-TransactionReceipt).


```js
      real.l2Cost = real.totalCost - real.l1Cost
    }  // if argv.verified
```

This is one way to get the L2 cost of the transaction.
Another would be to multiply `gasUsed` by `gasPrice`.


```js
    displayResults(estimated, real)    
}  // main


main().then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
```


## Conclusion

Using the Mantle SDK you can show users how much a transaction would cost before they submit it.
This is a useful feature in decentralized apps, because it lets people decide if the transaction is worth doing or not.
