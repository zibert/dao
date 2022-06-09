import { ethers } from "hardhat";
import hre from 'hardhat'

import config from '../config.json'

async function main() {
  let chairPersonAddress = (await ethers.getSigners())[0].address;
  let erc20Adress = config.zcoinEthAddress
  let minimumQuorum = hre.ethers.utils.parseEther(config.minimumQuorum)

  const DistributedVoting = await ethers.getContractFactory("DistributedVoting");
  const distributedVoting = await DistributedVoting.deploy(
    chairPersonAddress, erc20Adress, minimumQuorum, config.debatingPeriodDuration);

  await distributedVoting.deployed();

  console.log("DistributedVoting deployed to:", distributedVoting.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
