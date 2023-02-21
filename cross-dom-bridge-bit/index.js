#! /usr/local/bin/node
require('dotenv').config()
const ethers = require("ethers")
const mantleSDK = require("@mantleio/sdk")
const fs = require("fs")

const L1TestERC20 = JSON.parse(fs.readFileSync("TestERC20.json"))
const l1BitAddr = process.env.L1_BIT
const l2BitAddr = process.env.L2_BIT
const key = process.env.PRIV_KEY

const l1RpcProvider = new ethers.providers.JsonRpcProvider(process.env.L1_RPC)
const l2RpcProvider = new ethers.providers.JsonRpcProvider(process.env.L2_RPC)
const l1Wallet = new ethers.Wallet(key, l1RpcProvider)
const l2Wallet = new ethers.Wallet(key, l2RpcProvider)

// Global variable because we need them almost everywhere
let crossChainMessenger
let l1Bit, l2Bit
let ourAddr

// Only the part of the ABI we need to get the symbol

const setup = async () => {
  ourAddr = l1Wallet.address
  crossChainMessenger = new mantleSDK.CrossChainMessenger({
    l1ChainId: process.env.L1_CHAINID,
    l2ChainId: process.env.L2_CHAINID,
    l1SignerOrProvider: l1Wallet,
    l2SignerOrProvider: l2Wallet
  })
  l1Bit = new ethers.Contract(l1BitAddr, L1TestERC20.abi, l1Wallet)
  l2Bit = new ethers.Contract(l2BitAddr, L1TestERC20.abi, l2Wallet)
}

const reportBalances = async () => {
  const l1Balance = (await l1Bit.balanceOf(ourAddr)).toString().slice(0, -18)
  const l2Balance = (await l2Bit.balanceOf(ourAddr)).toString().slice(0, -18)
  console.log(`Token on L1:${l1Balance}     Token on L2:${l2Balance}`)
}

const depositToken = BigInt(1e18)
const withdrawToken = BigInt(1e17)

const depositBIT = async () => {
  console.log("#################### Deposit BIT ####################")
  await reportBalances()
  const start = new Date()

  // Need the l2 address to know which bridge is responsible
  const allowanceResponse = await crossChainMessenger.approveERC20(
    l1BitAddr, l2BitAddr, depositToken)
  await allowanceResponse.wait()
  console.log(`Time so far ${(new Date() - start) / 1000} seconds`)

  const response = await crossChainMessenger.depositERC20(
    l1BitAddr, l2BitAddr, depositToken)
  console.log(`Deposit transaction hash (on L1): ${response.hash}`)
  await response.wait()
  console.log("Waiting for status to change to RELAYED")
  console.log(`Time so far ${(new Date() - start) / 1000} seconds`)
  await crossChainMessenger.waitForMessageStatus(response.hash, mantleSDK.MessageStatus.RELAYED)

  await reportBalances()
  console.log(`depositERC20 took ${(new Date() - start) / 1000} seconds\n`)
}

const withdrawBIT = async () => {
  console.log("#################### Withdraw BIT ####################")
  const start = new Date()
  await reportBalances()

  const response = await crossChainMessenger.withdrawERC20(
    l1BitAddr, l2BitAddr, withdrawToken)
  console.log(`Transaction hash (on L2): ${response.hash}`)
  await response.wait()

  console.log("Waiting for status to change to IN_CHALLENGE_PERIOD")
  console.log(`Time so far ${(new Date() - start) / 1000} seconds`)
  await crossChainMessenger.waitForMessageStatus(response.hash,
    mantleSDK.MessageStatus.IN_CHALLENGE_PERIOD)
  console.log("In the challenge period, waiting for status READY_FOR_RELAY")
  console.log(`Time so far ${(new Date() - start) / 1000} seconds`)
  await crossChainMessenger.waitForMessageStatus(response.hash,
    mantleSDK.MessageStatus.READY_FOR_RELAY)
  console.log("Ready for relay, finalizing message now")
  console.log(`Time so far ${(new Date() - start) / 1000} seconds`)
  await crossChainMessenger.finalizeMessage(response)
  console.log("Waiting for status to change to RELAYED")
  console.log(`Time so far ${(new Date() - start) / 1000} seconds`)
  await crossChainMessenger.waitForMessageStatus(response,
    mantleSDK.MessageStatus.RELAYED)
  await reportBalances()
  console.log(`withdrawERC20 took ${(new Date() - start) / 1000} seconds\n\n\n`)
}

const main = async () => {
  await setup()
  await depositBIT()
  await withdrawBIT()
}

main().then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })





