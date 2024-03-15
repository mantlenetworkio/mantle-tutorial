// Plugins
require('@nomiclabs/hardhat-ethers')
// Load environment variables from .env
require('dotenv').config();


module.exports = {
    networks: {
        'mantle-testnet': {
            chainId: 5003,
            url: `${process.env.L2_RPC}`,
            accounts: [process.env.PRIV_KEY]
        },
        'mantle-mainnet': {
            chainId: 5000,
            url: `${process.env.L2_RPC}`,
            accounts: [process.env.PRIV_KEY]
        }
    },
    solidity: '0.8.18',
    paths: {
      sources: "./contracts",
      tests: "./test",
      cache: "./cache",
      artifacts: "./artifacts"
    }
  };