#! /usr/local/bin/node

const ethers = require("ethers")
const mantleSDK = require("@mantlenetworkio/sdk")
require('dotenv').config()

const key = process.env.PRIV_KEY || 'dbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97'
const l2ETH = process.env.L2ETH || '0xdEAddEaDdeadDEadDEADDEAddEADDEAddead1111'
const l1RpcProvider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:9545')
const l2RpcProvider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545')
const l1Wallet = new ethers.Wallet(key, l1RpcProvider)
const l2Wallet = new ethers.Wallet(key, l2RpcProvider)

// Global variable because we need them almost everywhere
let crossChainMessenger

const setup = async () => {
  addr = l1Wallet.address
  crossChainMessenger = new mantleSDK.CrossChainMessenger({
    l1ChainId: 31337,
    l2ChainId: 17,
    l1SignerOrProvider: l1Wallet,
    l2SignerOrProvider: l2Wallet
  })
}

const eth = BigInt(1e18)

const erc20ABI = [
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    type: "function",
  },
]

const reportBalances = async () => {
  const l1Balance = (await crossChainMessenger.l1Signer.getBalance()).toString().slice(0, -18)
  const ETH = new ethers.Contract(l2ETH, erc20ABI, l2Wallet)
  const l2Balance = (await ETH.balanceOf(crossChainMessenger.l2Signer.getAddress())).toString().slice(0, -18)

  console.log(`On L1:${l1Balance}     On L2:${l2Balance} `)
}

const depositETH = async () => {
  console.log("Deposit ETH")
  await reportBalances()
  const start = new Date()

  const response = await crossChainMessenger.depositETH(eth)
  console.log(`Transaction hash (on L1): ${response.hash}`)
  await response.wait()
  console.log("Waiting for status to change to RELAYED")
  console.log(`Time so far ${(new Date() - start) / 1000} seconds`)
  await crossChainMessenger.waitForMessageStatus(response, mantleSDK.MessageStatus.RELAYED)
  await reportBalances()
  console.log(`depositETH took ${(new Date() - start) / 1000} seconds\n\n`)
}

const withdrawETH = async () => {
  console.log("Withdraw ETH")
  const start = new Date()
  await reportBalances()

  const response = await crossChainMessenger.withdrawERC20(ethers.constants.AddressZero, l2ETH, eth)
  console.log(`Transaction hash (on L2): ${response.hash}`)
  await response.wait()

  console.log("Waiting for status to change to IN_CHALLENGE_PERIOD")
  console.log(`Time so far ${(new Date() - start) / 1000} seconds`)
  await crossChainMessenger.waitForMessageStatus(response.hash, mantleSDK.MessageStatus.IN_CHALLENGE_PERIOD)
  console.log("In the challenge period, waiting for status READY_FOR_RELAY")
  console.log(`Time so far ${(new Date() - start) / 1000} seconds`)
  await crossChainMessenger.waitForMessageStatus(response.hash, mantleSDK.MessageStatus.READY_FOR_RELAY)
  console.log("Ready for relay, finalizing message now")
  console.log(`Time so far ${(new Date() - start) / 1000} seconds`)
  await crossChainMessenger.finalizeMessage(response)
  console.log("Waiting for status to change to RELAYED")
  console.log(`Time so far ${(new Date() - start) / 1000} seconds`)
  await crossChainMessenger.waitForMessageStatus(response, mantleSDK.MessageStatus.RELAYED)
  await reportBalances()
  console.log(`withdrawETH took ${(new Date() - start) / 1000} seconds\n\n\n`)
}

const main = async () => {
  await setup()
  await depositETH()
  await withdrawETH()
}

main().then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })





