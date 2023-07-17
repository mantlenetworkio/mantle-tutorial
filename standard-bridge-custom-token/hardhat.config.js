// Plugins
require('@nomiclabs/hardhat-ethers')
// Load environment variables from .env
require('dotenv').config();

const words = process.env.MNEMONIC.match(/[a-zA-Z]+/g).length
validLength = [12, 15, 18, 24]
if (!validLength.includes(words)) {
   console.log(`The mnemonic (${process.env.MNEMONIC}) is the wrong number of words`)
   process.exit(-1)
}

module.exports = {
    networks: {
        'mantle-testnet': {
            chainId: 5001,
            url: `${process.env.MANTLE_TESTNET_RPC}`,
            accounts: { mnemonic: process.env.MNEMONIC }
        },
        'mantle-mainnet': {
            chainId: 5000,
            url: `${process.env.MANTLE_MAINNET_RPC}`,
            accounts: { mnemonic: process.env.MNEMONIC }
        }
    },
    solidity: '0.8.13',
  };