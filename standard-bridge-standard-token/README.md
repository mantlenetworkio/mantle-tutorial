# Bridging your Standard ERC20 token to L2 using the Standard Bridge

This is a practical guide to getting your ERC20 token deployed on L2 and bridging it using the
[Standard Bridge implementation](https://github.com/mantlenetworkio/mantle/blob/main/packages/contracts/contracts/L2/messaging/L2StandardBridge.sol).

For an L1/L2 token pair to work on the Standard Bridge the L2 token contract has to implement
[`IL2StandardERC20`](https://github.com/mantlenetworkio/mantle/blob/main/packages/contracts/contracts/standards/IL2StandardERC20.sol). 


## Deploying a standard token

If there is no need for custom logic on Mantle, it's easiest to use the standard token, available as the
[`L2StandardERC20`](https://github.com/mantlenetworkio/mantle/blob/main/packages/contracts/contracts/standards/L2StandardERC20.sol) contract as part of the `@mantleio/contracts` package. 

### Configuration

1. Install the necessary packages.

   ```sh
   yarn
   ```
### Running the deploy script

1. Run the script:

   ```sh
   yarn local
   ```

The script uses our token factory contract `OVM_L2StandardTokenFactory` available as a predeploy at `0x4200000000000000000000000000000000000012` to deploy a standard token on L2. 

## Deploying a Custom Token

When the `L2StandardERC20` implementation does not satisfy your requirements, we can consider allowing a custom implementation. 
See this [tutorial on getting a custom token implemented and deployed](../standard-bridge-custom-token/README.md)

## Testing 

For testing your token, see [tutorial on depositing and withdrawing between L1 and L2](../cross-dom-bridge-erc20/README.md).

