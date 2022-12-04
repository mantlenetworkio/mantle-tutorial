# Bridging your Custom ERC20 token to L2 using the Standard Bridge

This is a practical guide to customising the [L2StandardERC20](https://github.com/mantlenetworkio/mantle/blob/main/packages/contracts/contracts/standards/L2StandardERC20.sol) implementation for use on the Standard Bridge infrastructure.

For an L1/L2 token pair to work on the Standard Bridge the L2 token contract must implement
[`IL2StandardERC20`](https://github.com/mantlenetworkio/mantle/blob/main/packages/contracts/contracts/standards/IL2StandardERC20.sol) interface. The standard implementation of that is available in
[`L2StandardERC20`](https://github.com/mantlenetworkio/mantle/blob/main/packages/contracts/contracts/standards/L2StandardERC20.sol) contract as part of the `@mantlenetworkio/contracts` package, see [detailed instructions](../standard-bridge-standard-token/README.md) on using that as your L2 token.

## Customizing the `L2StandardERC20` implementation

Our example here implements a custom token [`L2CustomERC20`](contracts/L2CustomERC20.sol) based on the `L2StandardERC20` but with `8` decimal points, rather than `18`.

For the purpose we import the `L2StandardERC20` from the `@mantlenetworkio/contracts` package. This standard token implementation is based on the OpenZeppelin ERC20 contract and implements the required `IL2StandardERC20` interface.

```
import { L2StandardERC20 } from "@mantlenetworkiocontracts/standards/L2StandardERC20.sol";
```

Then the only thing we need to do is call the internal `_setupDecimals(8)` method to alter the token `decimals` property from the default `18` to `8`.

## Deploying the Custom Token

Deployment script is made available under `scripts/deploy-custom-token.js` that you can use to instantiate `L2CustomERC20` either on a local dev node or other nodes that you can set on `hardhat.config.js`.

### Running the deploy test script

Run the following test

```sh
yarn hardhat test
```

At the end you should get a successful output confirming your token was created and the L2 address:

`L2 CustomERC20 deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3`

For testing your token, see [tutorial on depositing and withdrawing between L1 and L2](../cross-dom-bridge-erc20/README.md).
