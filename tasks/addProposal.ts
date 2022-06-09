import { task } from "hardhat/config";

import { Contract, ContractReceipt } from "ethers";

import config from '../config.json'

const getEventData = (
    eventName: string,
    contract: Contract,
    txResult: ContractReceipt
  ): any => {
    if (!Array.isArray(txResult.logs)) return null;
    for (let log of txResult.logs) {
      try {
        const decoded = contract.interface.parseLog(log);
        if (decoded.name === eventName)
          return {
            ...decoded,
            ...decoded.args
          };
      } catch (error) { }
    }
    return null;
  };

task("addProposal")
    .addParam("recipient", "recipient address")
    .addParam("signature", "signature")
    .addParam("description", "description")
    .setAction(async (args, hre) => {
      const distributedVoting = (await hre.ethers.getContractAt("DistributedVoting", config.distributedVotingAddress));

      const receipt = await (
          await distributedVoting.addProposal(
              args.recipient, 
              args.signature, 
              args.description))
            .wait();
      
      let proposalId = getEventData("AddProposal", distributedVoting, receipt).proposalId;
      console.log("ProposalId: " + proposalId)
    });