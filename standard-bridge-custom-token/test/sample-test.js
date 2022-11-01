const { expect } = require("chai");

describe("Token", function () {
  it("Deploy Test", async function () {
    const l2CustomERC20Factory = await ethers.getContractFactory("L2CustomERC20");

    console.log('deploying L2CustomERC20 to', hre.network.name)
  
    const l1Token = "0x0000000000000000000000000000000000000000"
  
    const l2CustomERC20 = await l2CustomERC20Factory.deploy(
      '0x4200000000000000000000000000000000000010',  
      l1Token);                                     
  
    console.log("L2 CustomERC20 deployed to:", l2CustomERC20.address);
  });
});
