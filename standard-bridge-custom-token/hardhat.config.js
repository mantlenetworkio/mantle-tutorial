// Plugins
require('@nomiclabs/hardhat-ethers')

module.exports = {
  networks: {
    hardhat: {
      accounts: {
        mnemonic: 'test test test test test test test test test test test junk'
      }
    }
  },
  solidity: '0.8.9',
}
