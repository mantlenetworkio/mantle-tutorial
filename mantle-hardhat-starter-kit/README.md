# Mantle Hardhat Starter Kit

This Hardhat Starter Kit is designed to help you overcome version conflicts and how to configure Mantle Network in custom chain to address contract verification issues. If you've encountered problems with verifying your smart contracts on Mantle, this kit is here to simplify the process for you.

## Installation

You have [Node.js](https://nodejs.org/en/) running on your computer, as well as [`yarn`](https://classic.yarnpkg.com/lang/en/).

1. Clone this repository and navigate to it in your terminal.

   ```sh
   git clone GitHub - mantlenetworkio/mantle-tutorial
   cd mantle-tutorial/mantle-hardhat-starter-kit
   ```

2. Install the necessary packages.

   ```sh
   yarn
   ```

3. Duplicate `.env.example` as `.env`.

   ```sh
   cp .env.example .env
   ```

4. Edit the `.env` file to set the deployment parameters:

   - `PRIVATE_KEY`: the hex private key for an account that has enough $MNT for the deployment.
   - `ETHERSCAN_API_KEY`: Etherscan API key, you may retrieve from [here](https://docs.etherscan.io/getting-started/viewing-api-usage-statistics).

## How It Works?

In this section we go over the script line by line to learn how to use this starter kit to deploy and verify contract.

### Directory Structure

```
── mantle-hardhat-starter-kit
    ├── contracts
    │   └── Greeter.sol
    ├── scripts
    │   └── deploy.ts
    └── hardhat.config.ts
```

The contracts directory is where you work on your smart contracts. For example, there's a simple `Greeter` contract provided:

```
// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

contract Greeter {
    string public greeting = "Hello World!";

    function setGreeting(string memory greeting_) public {
        greeting = greeting_;
    }
}

```

You can configure the `deploy.ts` script to suit your deployment needs, such as deploying a contract with arguments, proxy contracts, and more.

```javascript
async function main() {
  const Greeter = await ethers.getContractFactory("Greeter");
  const greeter = await Greeter.deploy();

  await greeter.deployed();

  console.log("Greeter", greeter.address);
  console.log(
    `run: npx hardhat verify --network ${process.env.HARDHAT_NETWORK} ${greeter.address} to verify.`
  );
}
```

### Deploy Smart Contract

In the `hardhat.config.ts` file, you'll find configurations for deploying to both the Mantle Mainnet and Mantle Testnet environments.

```javascript
const config: HardhatUserConfig = {
  solidity: "0.8.18",
  networks: {
    mantle: {
      url: process.env.MANTLE_MAINNET_RPC_URL,
      accounts: [process.env.PRIVATE_KEY!],
    },
    mantleTestnet: {
      url: process.env.MANTLE_TESTNET_RPC_URL,
      accounts: [process.env.PRIVATE_KEY!],
    },
  },
};
```

Once your `deploy.ts` is ready, run the following command from the `mantle-hardhat-starter-kit` root directory to deploy your smart contract to the Mantle Mainnet (or use `mantleTestnet` for Testnet):

```sh
npx hardhat --network mantle run scripts/deploy.ts
```

#### Expected Output

```
Compiled 1 Solidity file successfully
Greeter 0x8619b3cc4E7B7c5f6A3b6E981CEAd29678C6d03B
run: npx hardhat verify --network mantle 0x8619b3cc4E7B7c5f6A3b6E981CEAd29678C6d03B to verify.
```

### Verify Smart Contract

As shown in the expected output above, this starter kit provides a predefined command to verify your contracts, let's try it out:

```sh
npx hardhat verify --network mantle 0x8619b3cc4E7B7c5f6A3b6E981CEAd29678C6d03B
```

#### Expected Output

```
Successfully submitted source code for contract
contracts/Greeter.sol:Greeter at 0x8619b3cc4E7B7c5f6A3b6E981CEAd29678C6d03B
for verification on the block explorer. Waiting for verification result...
Successfully verified contract Greeter on Etherscan.
https://explorer.testnet.mantle.xyz/address/0x8619b3cc4E7B7c5f6A3b6E981CEAd29678C6d03B#code
```

## Conclusion

You should now be able to deploy and verify smart contracts on Mantle. For more guidance on configuring deploy different type of smart contracts in the `deploy.ts` file, refer to the [Hardhat Docs](https://hardhat.org/hardhat-runner/docs/getting-started#overview).
