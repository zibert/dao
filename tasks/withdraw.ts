import { task } from "hardhat/config";

import config from '../config.json'

task("withdraw")
    .setAction(async (args, hre) => {
        const distributedVoting = (await hre.ethers.getContractAt("DistributedVoting", config.distributedVotingAddress));
        await distributedVoting.withdraw()
    });