import { ethers } from "hardhat";

async function main() {

  const Greeter = await ethers.getContractFactory("Greeter");
  const greeter = await Greeter.deploy();

  await greeter.deployed();

  console.log("Greeter", greeter.address);
  console.log(`run: npx hardhat verify --network ${process.env.HARDHAT_NETWORK} ${greeter.address} to verify.` );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
