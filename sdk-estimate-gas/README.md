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

async function estimateGasFee() {
  const l2RpcProvider = new ethers.providers.JsonRpcProvider("https://rpc.mantle.xyz")    

  try{
    // Arbitrary tx object
    const tx = {
      to: '0x0000000000000000000000000000000000000000',
      value: ethers.utils.parseEther("0.1"), // Returns value in wei
    };

    // By calling the BVM_GasPriceOracle contract method l1basefee()
    const gasPrice = await mantleSDK.getL1GasPrice(l2RpcProvider);
    const decimals = await mantleSDK.decimals(l2RpcProvider);
    const scalar = await mantleSDK.scalar(l2RpcProvider);
    const gasUsed = await mantleSDK.overhead(l2RpcProvider);

    // L1RollupFee
    const l1RollupFee = gasPrice.mul(gasUsed).mul(scalar).div(10**decimals)
    
    // L2TxnFee
    const l2Gas = await l2RpcProvider.estimateGas(tx)
    const l2GasPrice = await l2RpcProvider.getGasPrice()
    const l2TxnFee = l2GasPrice.mul(l2Gas);
    
    // Total estimated Gas Fee
    const totalEstimatedGasFee = l1RollupFee.add(l2TxnFee);
    console.log(`Total estimated Gas Fee: ${totalEstimatedGasFee.toString()}`);
  } catch (error) {
    console.error('Error estimating gas:', error);
  }
}

estimateGasFee();
```


## Conclusion

Using the Mantle SDK you can show users how much a transaction would cost before they submit it.
This is a useful feature in decentralized apps, because it lets people decide if the transaction is worth doing or not.
