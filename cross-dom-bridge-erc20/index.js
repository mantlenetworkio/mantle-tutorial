#! /usr/local/bin/node

require("dotenv").config();
const ethers = require("ethers");
const mantleSDK = require("@mantleio/sdk");
const fs = require("fs");

const L1TestERC20 = JSON.parse(fs.readFileSync("L1TestERC20.json"));
const L2StandardERC20 = JSON.parse(fs.readFileSync("L2StandardERC20.json"));

const factory__L1_ERC20 = new ethers.ContractFactory(
  L1TestERC20.abi,
  L1TestERC20.bytecode
);
const factory__L2_ERC20 = new ethers.ContractFactory(
  L2StandardERC20.abi,
  L2StandardERC20.bytecode
);

const l1bridge = process.env.L1_BRIDGE;
const l2bridge = process.env.L2_BRIDGE;
const key = process.env.PRIV_KEY;

const l1RpcProvider = new ethers.providers.JsonRpcProvider(process.env.L1_RPC);
const l2RpcProvider = new ethers.providers.JsonRpcProvider(process.env.L2_RPC);
const l1Wallet = new ethers.Wallet(key, l1RpcProvider);
const l2Wallet = new ethers.Wallet(key, l2RpcProvider);

// Global variable because we need them almost everywhere
let crossChainMessenger;
let l1ERC20, l2ERC20;
let ourAddr;

const setup = async () => {
  ourAddr = l1Wallet.address;
  crossChainMessenger = new mantleSDK.CrossChainMessenger({
    l1ChainId: process.env.L1_CHAINID,
    l2ChainId: process.env.L2_CHAINID,
    l1SignerOrProvider: l1Wallet,
    l2SignerOrProvider: l2Wallet,
    bedrock: true,
  });
  console.log("#################### Deploy ERC20 ####################");
  console.log("Deploying L1 ERC20...");
  const L1_ERC20 = await factory__L1_ERC20
    .connect(l1Wallet)
    .deploy("L1 TEST TOKEN", "LTT");
  await L1_ERC20.deployTransaction.wait();
  console.log("L1 ERC20 Contract ExampleToken Address: ", L1_ERC20.address);

  let amount = ethers.utils.parseEther("10");
  await L1_ERC20.connect(l1Wallet).mint(amount);
  balance = (
    await L1_ERC20.connect(l1Wallet).balanceOf(l1Wallet.address)
  ).toString();
  console.log("mint to ", l1Wallet.address, balance, " success");

  await L1_ERC20.connect(l1Wallet).approve(l1bridge, amount);
  let allowance = await L1_ERC20.connect(l1Wallet).allowance(
    l1Wallet.address,
    l1bridge
  );
  console.log("allowance: ", allowance.toString());

  console.log("Deploying L2 ERC20...");
  const L2_ERC20 = await factory__L2_ERC20
    .connect(l2Wallet)
    .deploy(L1_ERC20.address);
  await L2_ERC20.deployTransaction.wait();
  console.log(
    "L2 ERC20 Contract BVM_L2DepositedERC20 Address: ",
    L2_ERC20.address,
    "\n"
  );

  l1ERC20 = L1_ERC20;
  l2ERC20 = L2_ERC20;
};

const reportERC20Balances = async () => {
  const l1Balance = await l1ERC20.balanceOf(ourAddr);
  const l2Balance = await l2ERC20.balanceOf(ourAddr);
  console.log(`Token on L1:${l1Balance}     Token on L2:${l2Balance}`);
};

const oneToken = BigInt(1e18);

const depositERC20 = async () => {
  console.log("#################### Deposit ERC20 ####################");
  await reportERC20Balances();
  const start = new Date();

  // Need the l2 address to know which bridge is responsible
  const allowanceResponse = await crossChainMessenger.approveERC20(
    l1ERC20.address,
    l2ERC20.address,
    oneToken
  );
  await allowanceResponse.wait();
  console.log(`Allowance given by tx ${allowanceResponse.hash}`);
  console.log(`Time so far ${(new Date() - start) / 1000} seconds`);

  const response = await crossChainMessenger.depositERC20(
    l1ERC20.address,
    l2ERC20.address,
    oneToken
  );
  console.log(`Deposit transaction hash (on L1): ${response.hash}`);
  await response.wait();
  console.log("Waiting for status to change to RELAYED");
  console.log(`Time so far ${(new Date() - start) / 1000} seconds`);
  await crossChainMessenger.waitForMessageStatus(
    response.hash,
    mantleSDK.MessageStatus.RELAYED
  );

  await reportERC20Balances();
  console.log(`depositERC20 took ${(new Date() - start) / 1000} seconds\n`);
};

const withdrawERC20 = async () => {
  console.log("#################### Withdraw ERC20 ####################");
  const start = new Date();
  await reportERC20Balances();

  const response = await crossChainMessenger.withdrawERC20(
    l1ERC20.address,
    l2ERC20.address,
    oneToken
  );
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
  await setup();
  await depositERC20();
  await withdrawERC20();
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
