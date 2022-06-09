import { task } from "hardhat/config";

import config from '../config.json'

task("delegate")
    .addParam("id", "proposal Id")
    .addParam("to", "to address")
    .setAction(async (args, hre) => {
        const distributedVoting = (await hre.ethers.getContractAt("DistributedVoting", config.distributedVotingAddress));
        await distributedVoting.delegate(args.id, args.to)
});