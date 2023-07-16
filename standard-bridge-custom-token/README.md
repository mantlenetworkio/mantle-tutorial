# Bridging your Custom ERC20 token to Mantle Mainnet using the Standard Bridge

For an L1/L2 token pair to work on the Standard Bridge, there has to be a layer of original mint (where the minting and burning of tokens is controlled by the business logic), and a bridged layer where the Standard Bridge controls minting and burning. The most common configuration is to have L1 as the layer of original mint, and L2 as the bridged layer, this allows for ERC-20 contracts that were written with no knowledge of Mantle Mainnet to be bridged. The contract on the bridged layer has to implement either the legacy [`IL2StandardERC20`](https://github.com/mantlenetworkio/mantle-erc20-bridge/blob/main/contracts/ERC20/IL2StandardERC20.sol) interface (only if the bridged layer is L2).

For this to be done securely, the *only* entity that is allowed to mint and burn tokens on the bridged layer has to be the Standard Bridge, to ensure that the tokens on the bridged layer are backed up by real tokens on the layer of original mint. It is also necessary that the ERC-20 token contract on the layer of original mint *not* implement either of the interfaces, to make sure the bridge contracts don't get confused and think it is the bridged layer.

**Warning:** The standard bridge does *not* support certain ERC-20 configurations:

- [Fee on transfer tokens](https://github.com/d-xo/weird-erc20#fee-on-transfer)
- [Tokens that modify balances without emitting a Transfer event](https://github.com/d-xo/weird-erc20#balance-modifications-outside-of-transfers-rebasingairdrops)



For the purpose we import the `L2StandardERC20` from the `@mantleio/contracts` package. This standard token implementation is based on the OpenZeppelin ERC20 contract and implements the required `IL2StandardERC20` interface.

You can import `@mantleio/contracts` to use the Mantle contracts within your own codebase. Install via `npm` or `yarn`:

```
npm install @mantleio/contracts
```

Within your contracts:

```
import { L2StandardERC20 } from "@mantleio/contracts/contracts/standards/L2StandardERC20.sol";
```

## Deploying the custom token

1. Download the necessary packages.

   ```
   yarn
   ```

   

2. Copy `.env.example` to `.env`.

   ```
   cp .env.example .env
   ```

   

3. Edit `.env` to set the deployment parameters:

   - `MNEMONIC`, the mnemonic for an account that has enough ETH for the deployment.
   - `L1_ALCHEMY_KEY`, the key for the alchemy application for a Goerli endpoint.
   - `L2_ALCHEMY_KEY`, the key for the alchemy application for an Mantle Goerli endpoint.
   - `L1_TOKEN_ADDRESS`, the address of the L1 ERC20 which you want to bridge. The default value, [`0x1093046259F62fc6dDEa6ba31E2F03Fd840082ec`](https://goerli.etherscan.io/address/0x1093046259F62fc6dDEa6ba31E2F03Fd840082ec) is a test ERC-20 contract on Goerli that lets you call `faucet` to give yourself test tokens.

4. Open the hardhat console.

   ```
   yarn hardhat console --network mantle-network
   ```

   

5. Deploy the contract.

   ```
   l2CustomERC20Factory = await ethers.getContractFactory("L2CustomERC20")   
   l2CustomERC20 = await l2CustomERC20Factory.deploy(
      "0x4200000000000000000000000000000000000010",
      process.env.L1_TOKEN_ADDRESS)
   ```

   

## Transferring tokens

1. Get the token addresses.

   ```
   l1Addr = process.env.L1_TOKEN_ADDRESS
   l2Addr = l2CustomERC20.address
   ```

   

### Get setup for L1 (provider, wallet, tokens, etc)

1. Get the L1 wallet.

   ```
   l1Url = `https://eth-goerli.g.alchemy.com/v2/${process.env.L1_ALCHEMY_KEY}`
   l1RpcProvider = new ethers.providers.JsonRpcProvider(l1Url)
   hdNode = ethers.utils.HDNode.fromMnemonic(process.env.MNEMONIC)
   privateKey = hdNode.derivePath(ethers.utils.defaultPath).privateKey
   l1Wallet = new ethers.Wallet(privateKey, l1RpcProvider)
   ```

   

2. Get the L1 contract.

   ```javascript
   l1Factory = await ethers.getContractFactory("MantleUselessToken")
   l1Contract = new ethers.Contract(process.env.L1_TOKEN_ADDRESS, l1Factory.interface, l1Wallet)
   ```

   

3. Get tokens on L1 (and verify the balance)

   ```
   tx = await l1Contract.faucet()
   rcpt = await tx.wait()
   await l1Contract.balanceOf(l1Wallet.address)
   ```

   

### Transfer tokens

Create and use [`CrossDomainMessenger`](https://sdk.mantle.xyz/classes/CrossChainMessenger.html) (the Mantle SDK object used to bridge assets).

1. Import the Mantle SDK.

   ```
   const mantleSDK = require("@mantleio/sdk")
   ```

   

2. Create the cross domain messenger.

   ```
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

   

#### Deposit (from Goerli to Mantle Testnet, or Ethereum or Mantle Mainnet)

1. Give the L2 bridge an allowance to use the user's token. The L2 address is necessary to know which bridge is responsible and needs the allowance.

   ```
   depositTx1 = await crossChainMessenger.approveERC20(l1Contract.address, l2Addr, 1e9)
   await depositTx1.wait()
   ```

   

2. Check your balances on L1 and L2.

   ```
   await l1Contract.balanceOf(l1Wallet.address) 
   await l2CustomERC20.balanceOf(l1Wallet.address)
   ```

   

3. Do the actual deposit

   ```
   depositTx2 = await crossChainMessenger.depositERC20(l1Contract.address, l2Addr, 1e9)
   await depositTx2.wait()
   ```

   

4. Wait for the deposit to be relayed.

   ```
   await crossChainMessenger.waitForMessageStatus(depositTx2.hash, mantleSDK.MessageStatus.RELAYED)
   ```

   

5. Check your balances on L1 and L2.

   ```
   await l1Contract.balanceOf(l1Wallet.address) 
   await l2CustomERC20.balanceOf(l1Wallet.address)
   ```

   

#### Withdrawal (from Mantle Mainnet to Ethereum, or Mantle Testnet to Goerli)

1. Initiate the withdrawal on L2

   ```
   withdrawalTx1 = await crossChainMessenger.withdrawERC20(l1Contract.address, l2Addr, 1e9)
   await withdrawalTx1.wait()
   ```

   

2. Wait until the root state is published on L1, and then prove the withdrawal. This is likely to take less than 240 seconds.

   ```
   await crossChainMessenger.waitForMessageStatus(withdrawalTx1.hash, mantleSDK.MessageStatus.READY_TO_PROVE)
   withdrawalTx2 = await crossChainMessenger.proveMessage(withdrawalTx1.hash)
   await withdrawalTx2.wait()
   ```

   

3. Wait the fault challenge period (a short period on Goerli, seven days on the production network) and then finish the withdrawal.

   ```
   await crossChainMessenger.waitForMessageStatus(withdrawalTx1.hash, mantleSDK.MessageStatus.READY_FOR_RELAY)
   withdrawalTx3 = await crossChainMessenger.finalizeMessage(withdrawalTx1.hash)
   await withdrawalTx3.wait()   
   ```

   

4. Check your balances on L1 and L2. The balance on L2 should be back to zero.

   ```
   await l1Contract.balanceOf(l1Wallet.address) 
   await l2CustomERC20.balanceOf(l1Wallet.address)
   ```

 


