#! /usr/local/bin/node
require("dotenv").config();
const ethers = require("ethers");
const mantleSDK = require("@mantleio/sdk");
const fs = require("fs");

const L1TestERC20 = JSON.parse(fs.readFileSync("TestERC20.json"));
const l1MntAddr = process.env.L1_MNT;
const l2MntAddr = process.env.L2_MNT;
const key = process.env.PRIV_KEY;

const l1RpcProvider = new ethers.providers.JsonRpcProvider(process.env.L1_RPC);
const l2RpcProvider = new ethers.providers.JsonRpcProvider(process.env.L2_RPC);
const l1Wallet = new ethers.Wallet(key, l1RpcProvider);
const l2Wallet = new ethers.Wallet(key, l2RpcProvider);

// Global variable because we need them almost everywhere
let crossChainMessenger;
let l1Mnt, l2Mnt;
let ourAddr;

// Only the part of the ABI we need to get the symbol

const setup = async () => {
  ourAddr = l1Wallet.address;
  crossChainMessenger = new mantleSDK.CrossChainMessenger({
    l1ChainId: process.env.L1_CHAINID,
    l2ChainId: process.env.L2_CHAINID,
    l1SignerOrProvider: l1Wallet,
    l2SignerOrProvider: l2Wallet,
    bedrock: true,
  });
  l1Mnt = new ethers.Contract(l1MntAddr, L1TestERC20.abi, l1Wallet);
};

const reportBalances = async () => {
  const l1Balance = (await l1Mnt.balanceOf(ourAddr)).toString().slice(0, -18);
  const l2Balance = (await crossChainMessenger.l2Signer.getBalance())
    .toString()
    .slice(0, -18);
  console.log(`Token on L1:${l1Balance}     Token on L2:${l2Balance}`);
};

const depositToken = BigInt(1e18);
const withdrawToken = BigInt(1e17);

const depositMNT = async () => {
  console.log("#################### Deposit MNT ####################");
  await reportBalances();
  const start = new Date();

  console.log(`Time so far ${(new Date() - start) / 1000} seconds`);

  // Need the l2 address to know which bridge is responsible
  const allowanceResponse = await crossChainMessenger.approveERC20(
    l1MntAddr,
    l2MntAddr,
    depositToken
  );
  await allowanceResponse.wait();
  console.log(`Time so far ${(new Date() - start) / 1000} seconds`);

  const response = await crossChainMessenger.depositMNT(depositToken);
  console.log(`Deposit transaction hash (on L1): ${response.hash}`);
  await response.wait();
  console.log("Waiting for status to change to RELAYED");
  console.log(`Time so far ${(new Date() - start) / 1000} seconds`);
  await crossChainMessenger.waitForMessageStatus(
    response.hash,
    mantleSDK.MessageStatus.RELAYED
  );

  await reportBalances();
  console.log(`depositERC20 took ${(new Date() - start) / 1000} seconds\n`);
};

const withdrawMNT = async () => {
  console.log("#################### Withdraw MNT ####################");
  const start = new Date();
  await reportBalances();

  const response = await crossChainMessenger.withdrawMNT(withdrawToken);
  console.log(`Transaction hash (on L2): ${response.hash}`);
  await response.wait();

  console.log("Waiting for status to be READY_TO_PROVE");
  console.log(`Time so far ${(new Date() - start) / 1000} seconds`);
  await crossChainMessenger.waitForMessageStatus(
    response.hash,
    mantleSDK.MessageStatus.READY_TO_PROVE
  );
  console.log(`Time so far ${(new Date() - start) / 1000} seconds`);
  await crossChainMessenger.proveMessage(response.hash);

  console.log("Waiting for status to change to IN_CHALLENGE_PERIOD");
  console.log(`Time so far ${(new Date() - start) / 1000} seconds`);
  await crossChainMessenger.waitForMessageStatus(
    response.hash,
    mantleSDK.MessageStatus.IN_CHALLENGE_PERIOD
  );

  console.log("In the challenge period, waiting for status READY_FOR_RELAY");
  console.log(`Time so far ${(new Date() - start) / 1000} seconds`);
  await crossChainMessenger.waitForMessageStatus(
    response.hash,
    mantleSDK.MessageStatus.READY_FOR_RELAY
  );
  console.log("Ready for relay, finalizing message now");
  console.log(`Time so far ${(new Date() - start) / 1000} seconds`);
  await crossChainMessenger.finalizeMessage(response.hash);

  console.log("Waiting for status to change to RELAYED");
  console.log(`Time so far ${(new Date() - start) / 1000} seconds`);
  await crossChainMessenger.waitForMessageStatus(
    response,
    mantleSDK.MessageStatus.RELAYED
  );
};

const main = async () => {
  console.log("#################### Setup ####################");
  console.log(`Our PRIV_KEY: ${process.env.PRIV_KEY}`);
  await setup();
  await depositMNT();
  await withdrawMNT();
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
