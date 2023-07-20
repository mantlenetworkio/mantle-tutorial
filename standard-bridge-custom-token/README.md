# Bridging your Custom ERC20 token to Mantle Mainnet using the Standard Bridge

For an L1/L2 token pair to work on the Standard Bridge, there has to be a layer of original mint (where the minting and burning of tokens is controlled by the business logic), and a bridged layer where the Standard Bridge controls minting and burning. The most common configuration is to have L1 as the layer of original mint, and L2 as the bridged layer, this allows for ERC-20 contracts that were written with no knowledge of Mantle Mainnet to be bridged. The contract on the bridged layer has to implement either the legacy [`IL2StandardERC20`](https://github.com/mantlenetworkio/mantle-erc20-bridge/blob/main/contracts/ERC20/IL2StandardERC20.sol) interface (only if the bridged layer is L2).

For this to be done securely, the *only* entity that is allowed to mint and burn tokens on the bridged layer has to be the Standard Bridge, to ensure that the tokens on the bridged layer are backed up by real tokens on the layer of original mint. It is also necessary that the ERC-20 token contract on the layer of original mint *not* implement either of the interfaces, to make sure the bridge contracts don't get confused and think it is the bridged layer.

**Warning:** The standard bridge does *not* support certain ERC-20 configurations:

- [Fee on transfer tokens](https://github.com/d-xo/weird-erc20#fee-on-transfer)
- [Tokens that modify balances without emitting a Transfer event](https://github.com/d-xo/weird-erc20#balance-modifications-outside-of-transfers-rebasingairdrops)



For the purpose we import the `L2StandardERC20` from the `@mantleio/contracts` package. This standard token implementation is based on the OpenZeppelin ERC20 contract and implements the required `IL2StandardERC20` interface.

You can import `@mantleio/contracts` to use the Mantle contracts within your own codebase. Install via `npm` or `yarn`:

```sh
npm install @mantleio/contracts
```

Within your contracts:

```javascript
import { L2StandardERC20 } from "@mantleio/contracts/standards/L2StandardERC20.sol";
```

## Deploying the custom token

1. Download the necessary packages.

   ```sh
   yarn
   ```

   

2. Copy `.env.example` to `.env`.

   ```sh
   cp .env.example .env
   ```

   

3. Edit `.env` to set the deployment parameters:

   - `PRIVATE_KEY`, the hex private key for an account that has enough ETH for the deployment.
   - `L1_RPC`, Ethereum endpoint RPC URL.
   - `L2_RPC`, Mantle endpoint RPC URL.
   - `L1_BRIDGE`, L1 standard bridge contract address.
   - `L2_BRIDGE`, L2 standard bridge contract address.
   - `L1_TOKEN_ADDRESS`, the address of the L1 ERC20 which you want to bridge. The default value, [`0xeE7Bf96bFd25931976F45a16C4483d336169Bc0F`](https://goerli.etherscan.io/address/0xee7bf96bfd25931976f45a16c4483d336169bc0f) is a test ERC-20 contract on Goerli that lets you call `faucet` to give yourself test tokens.

4. Open the hardhat console.

   ```sh
   yarn hardhat console --network mantle-network
   ```

   

5. Deploy the contract.

   ```javascript
   l2CustomERC20Factory = await ethers.getContractFactory("L2CustomERC20")   
   l2CustomERC20 = await l2CustomERC20Factory.deploy(
      "0x4200000000000000000000000000000000000010",
      process.env.L1_TOKEN_ADDRESS)
   ```

   

## Transferring tokens

1. Get the token addresses.

   ```javascript
   l1Addr = process.env.L1_TOKEN_ADDRESS
   l2Addr = l2CustomERC20.address
   ```

   

### Get setup for L1 (provider, wallet, tokens, etc)

1. Get the L1 wallet.

   ```javascript
   l1RpcProvider = new ethers.providers.JsonRpcProvider(process.env.L1_RPC)
   const privateKey = process.env.PRIVATE_KEY
   l1Wallet = new ethers.Wallet(privateKey, l1RpcProvider)
   ```

   

2. Get the L1 contract.

   ```javascript
   l1Factory = await ethers.getContractFactory("MantleUselessToken")
   l1Contract = new ethers.Contract(process.env.L1_TOKEN_ADDRESS, l1Factory.interface, l1Wallet)
   ```

   

3. Get tokens on L1 (and verify the balance)

   ```javascript
   tx = await l1Contract.faucet()
   rcpt = await tx.wait()
   await l1Contract.balanceOf(l1Wallet.address)
   ```

   

### Transfer tokens

Create and use [`CrossDomainMessenger`](https://sdk.mantle.xyz/classes/CrossChainMessenger.html) (the Mantle SDK object used to bridge assets).

1. Import the Mantle SDK.

   ```javascript
   const mantleSDK = require("@mantleio/sdk")
   ```

   

2. Create the cross domain messenger.

   ```javascript
   l1ChainId = (await l1RpcProvider.getNetwork()).chainId
   l2ChainId = (await ethers.provider.getNetwork()).chainId
   l2Wallet = await ethers.provider.getSigner()
   crossChainMessenger = new mantleSDK.CrossChainMessenger({
      l1ChainId: l1ChainId,
      l2ChainId: l2ChainId,
      l1SignerOrProvider: l1Wallet,
      l2SignerOrProvider: l2Wallet,
   })
   ```

   

#### Deposit (from Goerli to Mantle Testnet, or Ethereum to Mantle Mainnet)

1. Give the L2 bridge an allowance to use the user's token. The L2 address is necessary to know which bridge is responsible and needs the allowance.

   ```javascript
   depositTx1 = await crossChainMessenger.approveERC20(l1Contract.address, l2Addr, 1e9)
   await depositTx1.wait()
   ```

   

2. Check your balances on L1 and L2.

   ```javascript
   await l1Contract.balanceOf(l1Wallet.address) 
   await l2CustomERC20.balanceOf(l1Wallet.address)
   ```

   

3. Do the actual deposit

   ```javascript
   depositTx2 = await crossChainMessenger.depositERC20(l1Contract.address, l2Addr, 1e9)
   await depositTx2.wait()
   ```

   

4. Wait for the deposit to be relayed.

   ```javascript
   await crossChainMessenger.waitForMessageStatus(depositTx2.hash, mantleSDK.MessageStatus.RELAYED)
   ```

   

5. Check your balances on L1 and L2.

   ```javascript
   await l1Contract.balanceOf(l1Wallet.address) 
   await l2CustomERC20.balanceOf(l1Wallet.address)
   ```

   

#### Withdrawal (from Mantle Mainnet to Ethereum, or Mantle Testnet to Goerli)

1. Initiate the withdrawal on L2

   ```javascript
   withdrawalTx1 = await crossChainMessenger.withdrawERC20(l1Contract.address, l2Addr, 1e9)
   await withdrawalTx1.wait()
   ```

   

2. Wait until the root state is published on L1, and then prove the withdrawal. This is likely to take within 30 minutes.

   ```javascript
   await crossChainMessenger.waitForMessageStatus(withdrawalTx1.hash, mantleSDK.MessageStatus.READY_TO_PROVE)
   withdrawalTx2 = await crossChainMessenger.proveMessage(withdrawalTx1.hash)
   await withdrawalTx2.wait()
   ```

   



3. Wait the fraud challenge period (a short period on Goerli, currently 7 days(but may be adjusted in the future which can be checked [here](https://etherscan.io/address/0x89E9D387555AF0cDE22cb98833Bae40d640AD7fa#readContract#F1)) on the production network) and then finish the withdrawal.

   ```javascript
   await crossChainMessenger.waitForMessageStatus(withdrawalTx1.hash, mantleSDK.MessageStatus.READY_FOR_RELAY)
   withdrawalTx3 = await crossChainMessenger.finalizeMessage(withdrawalTx1.hash)
   await withdrawalTx3.wait()   
   ```

   

4. Check your balances on L1 and L2. The balance on L2 should be back to zero.

   ```javascript
   await l1Contract.balanceOf(l1Wallet.address) 
   await l2CustomERC20.balanceOf(l1Wallet.address)
   ```

 


