#! /usr/local/bin/node
require("dotenv").config();
const ethers = require("ethers");
const mantleSDK = require("@mantleio/sdk");

const key = process.env.PRIV_KEY;
const l2ETH = process.env.L2_ETH;
const l1RpcProvider = new ethers.providers.JsonRpcProvider(process.env.L1_RPC);
const l2RpcProvider = new ethers.providers.JsonRpcProvider(process.env.L2_RPC);
const l1Wallet = new ethers.Wallet(key, l1RpcProvider);
const l2Wallet = new ethers.Wallet(key, l2RpcProvider);

// Global variable because we need them almost everywhere
let crossChainMessenger;

const setup = async () => {
  addr = l1Wallet.address;
  crossChainMessenger = new mantleSDK.CrossChainMessenger({
    l1ChainId: process.env.L1_CHAINID,
    l2ChainId: process.env.L2_CHAINID,
    l1SignerOrProvider: l1Wallet,
    l2SignerOrProvider: l2Wallet,
    bedrock: true
  });
  const l1Balance = await l1Wallet.getBalance();
  const l2Balance = await l2Wallet.getBalance();
  console.log(
    l1Wallet.address,
    "#################### l1Wallet Balance: ",
    l1Balance.toString()
  );
  console.log(
    l2Wallet.address,
    "#################### l2Wallet Balance: ",
    l2Balance.toString()
  );
};

const eth = BigInt(1e16);
const doubleeth = BigInt(2 * 1e16);
const erc20ABI = [
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    type: "function",
  },
];

const reportBalances = async () => {
  const l1Balance = await crossChainMessenger.l1Signer.getBalance();
  const BVM_ETH = new ethers.Contract(l2ETH, erc20ABI, l2Wallet);
  const l2Balance = await BVM_ETH.balanceOf(
    crossChainMessenger.l2Signer.getAddress()
  );

  console.log(`On L1:${l1Balance}     On L2:${l2Balance} `);
};

const depositETH = async () => {
  console.log("Deposit ETH");
  await reportBalances();
  const start = new Date();

  const response = await crossChainMessenger.depositETH(eth);
  console.log(`Transaction hash (on L1): ${response.hash}`);
  await response.wait();
  console.log("Waiting for status to change to RELAYED");
  console.log(`Time so far ${(new Date() - start) / 1000} seconds`);
  await crossChainMessenger.waitForMessageStatus(
    response,
    mantleSDK.MessageStatus.RELAYED
  );
  await reportBalances();
  console.log(`depositETH took ${(new Date() - start) / 1000} seconds\n\n`);
};

const withdrawETH = async () => {
  console.log("Withdraw ETH");
  const start = new Date();
  await reportBalances();
  const approve = await crossChainMessenger.approveERC20(
    ethers.constants.AddressZero,
    l2ETH,
    doubleeth,
    { signer: l2Wallet, gasLimit: 300000 }
  );
  console.log(`Approve transaction hash (on L2): ${approve.hash}`);
  const response = await crossChainMessenger.withdrawERC20(
    ethers.constants.AddressZero,
    l2ETH,
    eth,
    { gasLimit: 300000 }
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
  await depositETH();
  await withdrawETH();
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
