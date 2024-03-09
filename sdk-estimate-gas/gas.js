const ethers = require("ethers")
const mantleSDK = require("@mantleio/sdk");

async function estimateGas() {
    const l2RpcProvider = new ethers.providers.JsonRpcProvider("https://rpc.sepolia.mantle.xyz")    

    try{

    const tx = {
        from: '0xa6688d0dcad346ecc275cda98c91086fec3fe31c',
        to: '0xe20c2cf90f1e4aa8abe20a6562c16b3601ad29bf', 
        data: '0xde5f72fd'
    };
    
    const estimatedGas = await l2RpcProvider.estimateGas(tx);
    console.log(`Estimated gas: ${estimatedGas.toString()}`);
    const gasPrice = await l2RpcProvider.getGasPrice()
    console.log(`Gas Price: ${gasPrice.toString()}`);
    const totalCost = await mantleSDK.estimateTotalGasCost(l2RpcProvider,tx)
    console.log(`Estimated totalCost for transaction: ${totalCost/1e18.toString()}`);

    const l1cost = await mantleSDK.estimateL1GasCost(l2RpcProvider,tx)
    console.log(`Estimated L1 Rollup Fee for transaction: ${l1cost/1e18.toString()}`);
    const l2cost = await mantleSDK.estimateL2GasCost(l2RpcProvider,tx)
    console.log(`Estimated L2 Fee for transaction: ${l2cost/1e18.toString()}`);

    } catch (error) {
        console.error('Error estimating gas:', error);
    }

}

estimateGas();