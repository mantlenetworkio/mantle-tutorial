#! /usr/local/bin/node

// Estimate the costs of an Optimistic (L2) transaction
const ethers = require("ethers")
const mantleSDK = require("@mantlenetworkio/sdk")
const fs = require("fs")
const { spawn } = require("child_process")
require('dotenv').config()

const key = process.env.PRIV_KEY || 'dbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97'
const l2RpcProvider = mantleSDK.asL2Provider(
  new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545')
)
const l2Wallet = new ethers.Wallet(key, l2RpcProvider)

const L2_GreeterJSON = JSON.parse(fs.readFileSync("Greeter.json"))
const factory__L2_Greeter = new ethers.ContractFactory(L2_GreeterJSON.abi, L2_GreeterJSON.bytecode)

const getGreeter = async () => {
  console.log("#################### Deploy Greeter ####################")
  console.log('Deploying L2 Greeter...')
  const L2_Greeter = await factory__L2_Greeter.connect(l2Wallet).deploy(
    'greeter init',
  )
  await L2_Greeter.deployTransaction.wait()
  console.log("L2 Greeter Contract Address: ", L2_Greeter.address)
  console.log("#################### Greeter Deployed ####################\n")

  return L2_Greeter
}

// Utilities
const displayWei = x => x.toString().padStart(20, " ")
const displayGas = x => x.toString().padStart(10, " ")
const sleep = ms => new Promise(resp => setTimeout(resp, ms));

// Get estimates from the SDK
const getEstimates = async (provider, tx) => {
  return {
    totalCost: await provider.estimateTotalGasCost(tx),
    l1Cost: await provider.estimateL1GasCost(tx),
    l2Cost: await provider.estimateL2GasCost(tx),
    l1Gas: await provider.estimateL1Gas(tx)
  }
}

const displayResults = (estimated, real) => {
  console.log(`Estimates:`)
  console.log(`   Total gas cost: ${displayWei(estimated.totalCost)} wei`)
  console.log(`      L1 gas cost: ${displayWei(estimated.l1Cost)} wei`)
  console.log(`      L2 gas cost: ${displayWei(estimated.l2Cost)} wei`)

  console.log(`\nReal values:`)
  console.log(`   Total gas cost: ${displayWei(real.totalCost)} wei`)
  console.log(`      L1 gas cost: ${displayWei(real.l1Cost)} wei`)
  console.log(`      L2 gas cost: ${displayWei(real.l2Cost)} wei`)

  console.log(`\nL1 Gas:`)
  console.log(`         Estimate: ${displayGas(estimated.l1Gas)}`)
  console.log(`             Real: ${displayGas(real.l1Gas)}`)
  console.log(`       Difference: ${displayGas(real.l1Gas - estimated.l1Gas)}`)

  console.log(`\nL2 Gas:`)
  console.log(`          Estimate: ${displayGas(estimated.l2Gas)}`)
  console.log(`              Real: ${displayGas(real.l2Gas)}`)
  console.log(`        Difference: ${displayGas(real.l2Gas - estimated.l2Gas)}`)
}

const main = async () => {
  const greeter = await getGreeter()

  const greeting = "Hello!"
  let real = {}

  const fakeTxReq = await greeter.populateTransaction.setGreeting(greeting)
  const fakeTx = await l2Wallet.populateTransaction(fakeTxReq)
  console.log("About to get estimates")
  let estimated = await getEstimates(l2Wallet.provider, fakeTx)
  estimated.l2Gas = await greeter.estimateGas.setGreeting(greeting)

  let realTx, realTxResp
  const weiB4 = await l2Wallet.getBalance()

  // If the transaction fails, error out with additional information
  try {
    console.log("About to create the transaction")
    realTx = await greeter.setGreeting(greeting)
    realTx.gasPrice = realTx.maxFeePerGas;
    console.log("Transaction created and submitted")
    realTxResp = await realTx.wait()
    console.log("Transaction processed")
  } catch (err) {
    console.log(`Error: ${err}`)
    console.log(`Coming from address: ${await l2Wallet.getAddress()} on Optimistic ${network}`)
    console.log(`            balance: ${displayWei(await l2Wallet.getBalance())} wei`)
    process.exit(-1)
  }

  // If the balance hasn't been updated yet, wait 0.1 sec
  real.totalCost = 0
  let i = 0
  while (real.totalCost === 0) {
      const weiAfter = await l2Wallet.getBalance()
      real.totalCost= weiB4-weiAfter
      i+=1
      if (i > 10){
        break
      }
      await sleep(100)
  }

  // Get the real information (cost, etc.) from the transaction response
  real.l1Gas = realTxResp.l1GasUsed
  real.l2Gas = realTxResp.gasUsed
  real.l1Cost = realTxResp.l1Fee
  real.l2Cost = real.totalCost - real.l1Cost

  displayResults(estimated, real)
}


main().then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
