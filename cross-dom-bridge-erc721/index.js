#! /usr/local/bin/node

require("dotenv").config();
const ethers = require("ethers");
const mantleSDK = require("@mantleio/sdk"); // todo: need replace it with mantleSDK
const fs = require("fs");

const L1TestERC721 = JSON.parse(fs.readFileSync("L1TestERC721.json"));
const L2TestERC721 = JSON.parse(fs.readFileSync("L2TestERC721.json"));
const L2ERC721Factory = JSON.parse(
  fs.readFileSync("OptimismMintableERC721.json")
);

const timeout = (ms) =>
  new Promise((res) => {
    setTimeout(res, ms);
  });


const factory__L1_ERC721 = new ethers.ContractFactory(
  L1TestERC721.abi,
  L1TestERC721.bytecode
);

const key = process.env.PRIV_KEY;

const l1RpcProvider = new ethers.providers.JsonRpcProvider(process.env.L1_RPC);
const l2RpcProvider = new ethers.providers.JsonRpcProvider(process.env.L2_RPC);
const L2_OPTIMISM_MINT_FACTORY_ADDRESS = process.env.L2_OPTIMISM_MINT_FACTORY;
const l1Wallet = new ethers.Wallet(key, l1RpcProvider);
const l2Wallet = new ethers.Wallet(key, l2RpcProvider);

// Global variable because we need them almost everywhere
let crossChainMessenger;
let l1ERC721, l2ERC721;
let tokenId;
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
  console.log("#################### Deploy ERC721 ####################");
  console.log("Deploying L1 ERC721...");
  const tokenName = "TEST NFT FOR SDK0";
  const tokenSymbol = "TESTNFT0";
  const L1_ERC721 = await factory__L1_ERC721
    .connect(l1Wallet)
    .deploy(tokenName, tokenSymbol);
  await L1_ERC721.deployTransaction.wait();
  console.log("L1 ERC721 Contract ExampleToken Address: ", L1_ERC721.address);
  const awardTx = await L1_ERC721.connect(l1Wallet).awardItem(l1Wallet.address, '');
  tokenId = (await awardTx.wait()).events[0].args[2].toNumber();
  console.log("award NFT", l1Wallet.address, tokenId, " success");

  console.log("Deploying L2 ERC721...");
  const OptimismMintableERC721Factory = new ethers.Contract(
    L2_OPTIMISM_MINT_FACTORY_ADDRESS,
    L2ERC721Factory.abi,
    l2RpcProvider
  );

  const tx = await OptimismMintableERC721Factory.connect(
    l2Wallet
  ).createOptimismMintableERC721(L1_ERC721.address, tokenName, tokenSymbol,{
    maxFeePerGas: ethers.utils.parseUnits('0.02', 'gwei'),
    maxPriorityFeePerGas: ethers.utils.parseUnits('0', 'gwei')
  }); 
  await tx.wait();
  console.log("depoly l2 erc721 tx hash", tx.hash);
  const receipt = await l2RpcProvider.getTransactionReceipt(tx.hash);
  if (!receipt) {
    console.log("Transaction not found or not confirmed yet");
    return;
  }
  const iface = new ethers.utils.Interface(L2ERC721Factory.abi);
  const log = receipt.logs.find(
    (log) =>
      log.address.toLowerCase() ===
      L2_OPTIMISM_MINT_FACTORY_ADDRESS.toLowerCase()
  );
  if (!log) {
    console.log("Could not find the event log for the new contract creation");
    return;
  }

  const parsedLog = iface.parseLog(log);
  console.log("New ERC721 contract address:", parsedLog.args[0]);
  const L2_ERC721 = new ethers.Contract(
    parsedLog.args[0],
    L2TestERC721.abi,
    l2RpcProvider
  );
  l1ERC721 = L1_ERC721;
  l2ERC721 = L2_ERC721;
};

const reportERC721Balances = async () => {
  const l1Balance = await l1ERC721.balanceOf(ourAddr);
  const l2Balance = await l2ERC721.balanceOf(ourAddr);
  console.log(`Token on L1:${l1Balance}    Token on L2:${l2Balance}`);
};

const depositERC721 = async () => {
  console.log("#################### Deposit ERC721 ####################");
  await reportERC721Balances();
  const start = new Date();

  const isApproved = await crossChainMessenger.approval(
    l1ERC721.address,
    l2ERC721.address
  );
  if (!isApproved) {
    const approveTx = await crossChainMessenger.approveERC721(
      l1ERC721.address,
      l2ERC721.address
    );
    await approveTx.wait();
    console.log(`approval given by tx ${approveTx.hash}`);
    console.log(`Time so far ${(new Date() - start) / 1000} seconds`);
  }
  const response = await crossChainMessenger.depositERC721(
    l1ERC721.address,
    l2ERC721.address,
    tokenId,
    {
      overrides: {
        gasLimit: 400000,
      },
    }
  );
  console.log(`Deposit transaction hash (on L1): ${response.hash}`);
  await response.wait();
  console.log("Waiting for status to change to RELAYED");
  console.log(`Time so far ${(new Date() - start) / 1000} seconds`);
  process.env.L2_CHAINID === 5000 ? await crossChainMessenger.waitForMessageStatus(
    response.hash,
    mantleSDK.MessageStatus.RELAYED
  ) : await timeout(120000);// for mantle sepolia, public rpc doesn't support unlimited check block, so we need to wait for 2 min

  await reportERC721Balances();
  console.log(`depositERC721 took ${(new Date() - start) / 1000} seconds\n`);
};

const withdrawERC721 = async () => {
  console.log("#################### Withdraw ERC721 ####################");
  const start = new Date();
  await reportERC721Balances();

  const response = await crossChainMessenger.withdrawERC721(
    l1ERC721.address,
    l2ERC721.address,
    tokenId
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
  await crossChainMessenger.finalizeMessage(response.hash,{
    overrides: {
      gasLimit: 4700000,
    },
  });
  console.log(`Time so far ${(new Date() - start) / 1000} seconds`);
};

const main = async () => {
  await setup();
  await depositERC721();
  await withdrawERC721();
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
