// SPDX-License-Identifier: MIT
pragma solidity >=0.5.16 <0.9.0;

import { L2StandardERC20 } from "@mantleio/contracts/standards/L2StandardERC20.sol";
contract L2CustomERC20 is L2StandardERC20 {
    constructor(
      address _l2Bridge,
      address _l1Token
    )
        L2StandardERC20(_l2Bridge, _l1Token, "Custom L2 Token", "L2T",18)
        {
        }
}