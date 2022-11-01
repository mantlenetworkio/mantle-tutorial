#! /usr/local/bin/node

const ethers = require("ethers")
const mantleSDK = require("@mantlenetworkio/sdk")
require('dotenv').config()
const fs = require("fs")
const { expect } = require("chai");

// contract factory
const Greeter = JSON.parse(fs.readFileSync("./artifacts/contracts/Greeter.sol/Greeter.json"))
const FromL1_ControlL2Greeter = JSON.parse(
  fs.readFileSync("./artifacts/contracts/FromL1_ControlL2Greeter.sol/FromL1_ControlL2Greeter.json")
)
const FromL2_ControlL1Greeter = JSON.parse(
  fs.readFileSync("./artifacts/contracts/FromL2_ControlL1Greeter.sol/FromL2_ControlL1Greeter.json")
)
const factory__Greeter = new ethers.ContractFactory(Greeter.abi, Greeter.bytecode)
const factory__FromL1_ControlL2Greeter = new ethers.ContractFactory(FromL1_ControlL2Greeter.abi, FromL1_ControlL2Greeter.bytecode)
const factory__FromL2_ControlL1Greeter = new ethers.ContractFactory(FromL2_ControlL1Greeter.abi, FromL2_ControlL1Greeter.bytecode)

let L1Greeter,L2Greeter
let L1_ControlL2Greeter,L2_ControlL1Greeter

const L1CDM = process.env.L1_CDM || '0xc48078a734c2e22D43F54B47F7a8fB314Fa5A601'
const L2CDM = process.env.L2_CDM || '0x4200000000000000000000000000000000000007'
const key = process.env.PRIV_KEY || 'dbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97'
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
  console.log("#################### Deploy Greeter ####################")
  console.log('Deploying L1 Greeter...')
  L1Greeter = await factory__Greeter.connect(l1Wallet).deploy(
    'L1 hello',
    L1CDM,
  )
  await L1Greeter.deployTransaction.wait()
  console.log("L1 Greeter Contract Address: ", L1Greeter.address)
  
  console.log('Deploying L2 Greeter...')
  L2Greeter = await factory__Greeter.connect(l2Wallet).deploy(
    'L2 hello',
    L2CDM,
  )
  await L1Greeter.deployTransaction.wait()
  console.log("L2 Greeter Contract Address: ", L1Greeter.address)

  console.log("#################### Deploy Control Greeter ####################")
  console.log('Deploying L1 ControlL2Greeter...')
  L1_ControlL2Greeter = await factory__FromL1_ControlL2Greeter.connect(l1Wallet).deploy(
    L1CDM,
    L2Greeter.address,
  )
  await L1_ControlL2Greeter.deployTransaction.wait()
  console.log("L1_ControlL2Greeter Contract Address: ", L1_ControlL2Greeter.address)

  console.log('Deploying L2 ControlL1Greeter...')
  L2_ControlL1Greeter = await factory__FromL2_ControlL1Greeter.connect(l2Wallet).deploy(
    L2CDM,
    L1Greeter.address,
  )
  await L2_ControlL1Greeter.deployTransaction.wait()
  console.log("L2_ControlL1Greeter Contract Address: ", L2_ControlL1Greeter.address)
}

const reportGreet = async () => {
  const l1Greet = await L1Greeter.greet()
  const l2Greet = await L2Greeter.greet()
  console.log(`L1 greet :${l1Greet}     L2 greet :${l2Greet}`)
}

const sendMsg = async () => {
  console.log("#################### Send Msg L1 To L2 ####################")
  await reportGreet()
  let start = new Date()
  let response = await L1_ControlL2Greeter.setGreeting("L1 say hi to L2")
  console.log(`Transaction hash (on L1): ${response.hash}`)
  await response.wait()
  console.log("Waiting for status to change to RELAYED")
  console.log(`Time so far ${(new Date() - start) / 1000} seconds`)
  await crossChainMessenger.waitForMessageStatus(response.hash, mantleSDK.MessageStatus.RELAYED)
  console.log("After")
  await reportGreet()

  start = new Date()
  response = await L1_ControlL2Greeter.setGreeting("L1 say hi to L2 again")
  console.log(`Transaction hash (on L1): ${response.hash}`)
  await response.wait()
  console.log("Waiting for status to change to RELAYED")
  console.log(`Time so far ${(new Date() - start) / 1000} seconds`)
  await crossChainMessenger.waitForMessageStatus(response.hash, mantleSDK.MessageStatus.RELAYED)
  console.log("After")
  await reportGreet()
}


const main = async () => {
  await setup()
  await sendMsg()
}

main().then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })





