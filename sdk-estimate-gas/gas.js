const ethers = require("ethers")
const mantleSDK = require("@mantleio/sdk");

async function estimateGasFee() {
  const l2RpcProvider = new ethers.providers.JsonRpcProvider("https://rpc.mantle.xyz")    

  try{
    // Arbitrary tx object
    const tx = {
      to: '0x83165f86c10898dD4a7f33bDe8e5C0e4cC90E424',
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