#! /usr/local/bin/node

require('dotenv').config()
const ethers = require("ethers")

const L2StandardTokenFactoryArtifact = require(`./node_modules/@ethan-bedrock/contracts/artifacts/contracts/L2/messaging/L2StandardTokenFactory.sol/L2StandardTokenFactory.json`);
const ERC20Artifact = require('./node_modules/@openzeppelin/contracts/build/contracts/ERC20.json')

const factory__ERC20 = new ethers.ContractFactory(ERC20Artifact.abi, ERC20Artifact.bytecode)

const key = process.env.PRIV_KEY
const l1RpcProvider = new ethers.providers.JsonRpcProvider(process.env.L1_RPC)
const l2RpcProvider = new ethers.providers.JsonRpcProvider(process.env.L2_RPC)
const l1Wallet = new ethers.Wallet(key, l1RpcProvider)
const l2Wallet = new ethers.Wallet(key, l2RpcProvider)

async function main() {
  console.log("#################### Deploy L1 ERC20 ####################")
  console.log('Deploying L1 ERC20...')
  const L1_ERC20 = await factory__ERC20.connect(l1Wallet).deploy(
    'L1 ERC20 ExampleToken',
    'L1EPT',
      {
        gasLimit:3000000,
      }
  )

  await L1_ERC20.deployTransaction.wait()
  console.log("L1 ERC20 Contract ExampleToken Address: ", L1_ERC20.address)

  const L1TokenAddress = L1_ERC20.address
  const L2TokenName = "L2TOKEN"
  const L2TokenSymbol = "L2TOKEN"

  console.log("Creating instance of L2StandardERC20 on L2")

  // Instantiate the Standard token factory
  const l2StandardTokenFactory = new ethers.Contract(
    "0x4200000000000000000000000000000000000012",
    L2StandardTokenFactoryArtifact.abi,
    l2Wallet
  )

  const tx = await l2StandardTokenFactory.createStandardL2Token(
    L1TokenAddress,
    L2TokenName,
    L2TokenSymbol,
    await L1_ERC20.decimals(),
  );

  const receipt = await tx.wait();
  const args = receipt.events.find(
    ({ event }) => event === "StandardL2TokenCreated"
  ).args;

  // Get the L2 token address from the emmited event and log
  const l2TokenAddress = args._l2Token;

  // Get the number of decimals
  const erc20 = new ethers.Contract(
    l2TokenAddress,
    ERC20Artifact.abi,
    l2Wallet
  );
  const decimals = await erc20.decimals()

  // Output a usable `data.json`:
  console.log(`
{
    "name": "${L2TokenName}",
    "symbol": "${L2TokenSymbol}",
    "decimals": ${decimals},
    "tokens": {
      "L1": {
        "address": "${L1_ERC20.address}"
      },
      "L2": {
        "address": "${l2TokenAddress}"
      }
    }
}
  `)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
