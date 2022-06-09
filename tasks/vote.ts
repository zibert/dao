import { task } from "hardhat/config";

import config from '../config.json'

task("vote")
    .addParam("id", "proposal Id")
    .addParam("choice", "choice")
    .setAction(async (args, hre) => {
        const distributedVoting = (await hre.ethers.getContractAt("DistributedVoting", config.distributedVotingAddress));
        await distributedVoting.vote(args.id, args.choice)
    });