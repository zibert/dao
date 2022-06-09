import { task } from "hardhat/config";

import config from '../config.json'

task("deposite")
    .addParam("amount", "amount of tokens")
    .setAction(async (args, hre) => {
        const distributedVoting = (await hre.ethers.getContractAt("DistributedVoting", config.distributedVotingAddress));
        await distributedVoting.deposite(hre.ethers.utils.parseEther(args.amount))
    });