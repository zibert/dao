import { task } from "hardhat/config";

import config from '../config.json'

task("finishProposal")
    .addParam("id", "proposal Id")
    .setAction(async (args, hre) => {
        const distributedVoting = (await hre.ethers.getContractAt("DistributedVoting", config.distributedVotingAddress));
        await distributedVoting.finishProposal(args.id)
    });