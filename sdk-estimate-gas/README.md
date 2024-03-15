# Estimate the costs of a Mantle (L2) transaction


This tutorial teaches you how to use the Mantle SDK to estimate the gas costs of L2 transactions. 
It works to just multiply the gas used by the transaction by the gas price, the same way you would on L1. 
[You can read the details of the calculation here](https://github.com/mantlenetworkio/mantle).



## Prerequisites

[The node script](./gas.js) makes these assumptions:

- You have [Node.js](https://nodejs.org/en/) running on your computer, as well as [yarn](https://classic.yarnpkg.com/lang/en/).
- There is network connectivity to a provider on the Mantle Sepolia L2 network, and to the npm package registry.


## Running the script

1. Use `yarn` to download the packages you need

   ```sh
   yarn
   ```

2. Use node to run the script

   ```sh
   node gas.js
   ```

### Results

Here is an example of results from the main Mantle blockchain:


```
(base) ➜  sdk-estimate-gas git:(Main) ✗ yarn script
yarn run v1.22.19
$ node gas.js
Total estimated Gas Fee: 57485953239392456
✨  Done in 0.59s.
```

The L1 gas cost is over a thousand times the L2 gas cost.
This is typical in Optimistic transactions, because of the cost ratio between L1 gas and L2 gas.



## How does it work?
You can directly use the following JS code to estimate the total gas fees.

```js
const ethers = require("ethers")
const mantleSDK = require("@mantleio/sdk");

async function estimateGas() {
    const l2RpcProvider = new ethers.providers.JsonRpcProvider("https://rpc.sepolia.mantle.xyz")    

    try{

    const feeData = await l2RpcProvider.getFeeData();
    console.log(`maxFeePerGas: ${feeData.maxFeePerGas}`);
    console.log(`maxPriorityFeePerGas: ${feeData.maxPriorityFeePerGas}`);

    const tx = {
        from: '0xa6688d0dcad346ecc275cda98c91086fec3fe31c',
        maxFeePerGas: feeData.maxFeePerGas,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
        to: '0x96307f45900Bc6f396a512Dc89F8600D75f6f58C', 
        data: '0xde5f72fd'
    };
    
    const estimatedGas = await l2RpcProvider.estimateGas(tx);
    console.log(`Estimated gas: ${estimatedGas.toString()}`);
    console.log(`Estimated totalCost for transaction: ${estimatedGas*feeData.maxFeePerGas/1e18.toString()}`);

    } catch (error) {
        console.error('Error estimating gas:', error);
    }

}

estimateGas();
```


## Conclusion

Using the Mantle SDK you can show users how much a transaction would cost before they submit it.
This is a useful feature in decentralized apps, because it lets people decide if the transaction is worth doing or not.
