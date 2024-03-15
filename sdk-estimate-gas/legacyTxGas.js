const ethers = require("ethers")
const mantleSDK = require("@mantleio/sdk");

async function estimateGas() {
    const l2RpcProvider = new ethers.providers.JsonRpcProvider("https://rpc.sepolia.mantle.xyz")    

    try{

    const gasPrice = await l2RpcProvider.getGasPrice()
    console.log(`Gas Price: ${gasPrice.toString()}`);

    const tx = {
        from: '0xa6688d0dcad346ecc275cda98c91086fec3fe31c',
        gasPrice: gasPrice,
        to: '0x96307f45900Bc6f396a512Dc89F8600D75f6f58C', 
        data: '0xde5f72fd'
    };
    
    const estimatedGas = await l2RpcProvider.estimateGas(tx);
    console.log(`Estimated gas: ${estimatedGas.toString()}`);
    console.log(`Estimated totalCost for legacy transaction: ${estimatedGas*gasPrice/1e18.toString()}`);

    } catch (error) {
        console.error('Error estimating gas:', error);
    }

}

estimateGas();