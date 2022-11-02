#! /usr/local/bin/node

const ethers = require("ethers")
const mantleSDK = require("@mantlenetworkio/sdk")

// Global variable because we need them almost everywhere
let crossChainMessenger

const key = process.env.PRIV_KEY || 'dbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97'
const l1RpcProvider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:9545')
const l2RpcProvider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545')
const l1Wallet = new ethers.Wallet(key, l1RpcProvider)
const l2Wallet = new ethers.Wallet(key, l2RpcProvider)

const setup = async () => {
  crossChainMessenger = new mantleSDK.CrossChainMessenger({
    l1ChainId: 31337,
    l2ChainId: 17,
    l1SignerOrProvider: l1Wallet,
    l2SignerOrProvider: l2Wallet
  })
}

// Only the part of the ABI we need to get the symbol
const ERC20ABI = [
  {
    "constant": true,
    "inputs": [],
    "name": "symbol",
    "outputs": [
      {
        "name": "",
        "type": "string"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  }
]

const getSymbol = async l1Addr => {
  if (l1Addr == '0x0000000000000000000000000000000000000000')
    return "ETH"
  const l1Contract = new ethers.Contract(l1Addr, ERC20ABI, crossChainMessenger.l1SignerOrProvider)
  return await l1Contract.symbol()
}

// Describe a cross domain transaction, either deposit or withdrawal
const describeTx = async tx => {
  console.log(`tx:${tx.transactionHash}`)
  // Assume all tokens have decimals = 18
  console.log(`\tAmount: ${tx.amount / 1e18} ${await getSymbol(tx.l1Token)}`)
  console.log(`\tRelayed: ${await crossChainMessenger.getMessageStatus(tx.transactionHash)
    == mantleSDK.MessageStatus.RELAYED}`)
}

const main = async () => {
  await setup()

  // The address we trace
  const deposits = await crossChainMessenger.getDepositsByAddress(l1Wallet.address)
  console.log(`Deposits by address ${l1Wallet.address}`)
  for (var i = 0; i < deposits.length; i++)
    await describeTx(deposits[i]
    )

  const withdrawals = await crossChainMessenger.getWithdrawalsByAddress(l1Wallet.address)
  console.log(`\n\n\nWithdrawals by address ${l1Wallet.address}`)
  for (var i = 0; i < withdrawals.length; i++)
    await describeTx(withdrawals[i]
    )
}

main().then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })