// Plugins
require('@nomiclabs/hardhat-ethers')
// Load environment variables from .env
require('dotenv').config();


module.exports = {
    networks: {
        'mantle-testnet': {
            chainId: 5001,
            url: `${process.env.MANTLE_TESTNET_RPC}`,
            accounts: [process.env.PRIVATE_KEY]
        },
        'mantle-mainnet': {
            chainId: 5000,
            url: `${process.env.MANTLE_MAINNET_RPC}`,
            accounts: [process.env.PRIVATE_KEY]
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