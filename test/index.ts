import { ethers, waffle, network } from 'hardhat'
import chai from 'chai'
import Web3 from 'web3';

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address"

import ZcoinArtifacts from '../artifacts/contracts/Zcoin.sol/Zcoin.json'
import { Zcoin } from '../src/types/Zcoin'

import StackingArtifacts from '../artifacts/contracts/Stacking.sol/Stacking.json'
import { Stacking } from '../src/types/Stacking'

import DistributedVotingArtifacts from '../artifacts/contracts/DistributedVoting.sol/DistributedVoting.json'
import { DistributedVoting } from '../src/types/DistributedVoting'

const { deployContract } = waffle
const { expect } = chai

import { BigNumber, Contract, ContractReceipt } from "ethers";

const getSignature = function (percentage : any) {
  var jsonAbi = [{
    "inputs": [
      {
        "internalType": "uint64",
        "name": "_rewardPercentage",
        "type": "uint64"
      }
    ],
    "name": "changeRewardPercentage",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
  ];
  const iface = new ethers.utils.Interface(jsonAbi);
  return iface.encodeFunctionData('changeRewardPercentage', [percentage]);
}

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

describe('Common Test', () => {
  let zcoin: Zcoin;
  let lptoken: Zcoin;
  let stacking: Stacking;
  let distributedVoting: DistributedVoting
  let signers: SignerWithAddress[]

  let owner: SignerWithAddress;
  let acc1: SignerWithAddress;
  let acc2: SignerWithAddress;
  let acc3: SignerWithAddress;
  let chairPerson: SignerWithAddress;
  let proposalId: any;

  const options = {
    gasLimit: 5000000
  }

  beforeEach(async () => {
    signers = await ethers.getSigners();
    let network = await ethers.provider.getNetwork();

    owner = signers[0];
    acc1 = signers[1];
    acc2 = signers[2];
    acc3 = signers[3];
    chairPerson = signers[4];

    let minimumQuorum = ethers.utils.parseEther("10.0");
    let debatingPeriodDuration = 3600 * 24 * 3;

    zcoin = (await deployContract(owner, ZcoinArtifacts)) as Zcoin
    lptoken = (await deployContract(owner, ZcoinArtifacts)) as Zcoin
    stacking = (await deployContract(owner, StackingArtifacts, [zcoin.address, lptoken.address])) as Stacking
    distributedVoting = (await deployContract(owner, DistributedVotingArtifacts,
      [chairPerson.address, zcoin.address, minimumQuorum, debatingPeriodDuration])) as DistributedVoting

    await zcoin.mint(acc1.address, ethers.utils.parseEther("100.0"))
    await zcoin.mint(acc2.address, ethers.utils.parseEther("100.0"))
    await zcoin.mint(acc3.address, ethers.utils.parseEther("100.0"))

    await zcoin.connect(acc1).approve(distributedVoting.address, ethers.utils.parseEther("100.0"));
    await zcoin.connect(acc2).approve(distributedVoting.address, ethers.utils.parseEther("100.0"));
    await zcoin.connect(acc3).approve(distributedVoting.address, ethers.utils.parseEther("100.0"));

    await stacking.setOwner(distributedVoting.address);

    const receipt = await (
      await distributedVoting.connect(chairPerson)
        .addProposal(
          stacking.address, getSignature(10), "test"))
      .wait();

    proposalId = getEventData("AddProposal", distributedVoting, receipt).proposalId as BigNumber;
  })

  it('getSignature should be correct', async () => {
    expect((await distributedVoting.getSignature(0))).to.eq(getSignature(10))
  })

  it('getDescription should be correct', async () => {
    expect((await distributedVoting.getDescription(proposalId))).to.eq("test")
  })

  it('getRecipient should be correct', async () => {
    expect((await distributedVoting.getRecipient(proposalId))).to.eq(stacking.address)
  })

  it('getVotes should be correct', async () => {
    await distributedVoting.connect(acc1).deposite(ethers.utils.parseEther("3.0"));
    await distributedVoting.connect(acc2).deposite(ethers.utils.parseEther("5.0"));
    await distributedVoting.connect(acc3).deposite(ethers.utils.parseEther("9.0"));

    await distributedVoting.connect(acc1).vote(proposalId, true)
    await distributedVoting.connect(acc2).vote(proposalId, false)
    await distributedVoting.connect(acc3).vote(proposalId, true)
    
    expect((await distributedVoting.getVotes(proposalId, true))).to.eq(ethers.utils.parseEther("12.0"))
    expect((await distributedVoting.getVotes(proposalId, false))).to.eq(ethers.utils.parseEther("5.0"))
  })

  it('getVotes should be correct', async () => {
    await distributedVoting.connect(acc1).deposite(ethers.utils.parseEther("3.0"));
    await distributedVoting.connect(acc2).deposite(ethers.utils.parseEther("5.0"));
    await distributedVoting.connect(acc3).deposite(ethers.utils.parseEther("9.0"));

    await distributedVoting.connect(acc1).vote(proposalId, true)
    await distributedVoting.connect(acc2).vote(proposalId, false)
    await distributedVoting.connect(acc3).vote(proposalId, true)
    
    expect((await distributedVoting.getVotes(proposalId, true))).to.eq(ethers.utils.parseEther("12.0"))
    expect((await distributedVoting.getVotes(proposalId, false))).to.eq(ethers.utils.parseEther("5.0"))
  })

  it('token transfer should be correct', async () => {
    await distributedVoting.connect(acc1).deposite(ethers.utils.parseEther("3.0"));
    expect((await zcoin.balanceOf(acc1.address))).to.eq(ethers.utils.parseEther("97.0"))
    expect((await zcoin.balanceOf(distributedVoting.address))).to.eq(ethers.utils.parseEther("3.0"))
  })

  it('deposit with zero token should be reverted', async () => {
    await expect(distributedVoting.connect(acc1).deposite(0)).to.be.revertedWith(
            "amount must be more then 0"
          );
  })

  it('delegation with with zero deposits should be reverted', async () => {
    await expect(distributedVoting.connect(acc1).delegate(proposalId, acc2.address)).to.be.revertedWith(
            "deposite is 0"
          );
  })

  it('votingIsExist is correct', async () => {
    await expect(distributedVoting.connect(acc1).getSignature(2)).to.be.revertedWith(
            "voting is not exist"
          );
  })

  it('delegation to voted address should be reverted', async () => {
    await distributedVoting.connect(acc2).deposite(ethers.utils.parseEther("5.0"));
    await distributedVoting.connect(acc2).vote(proposalId, false)
    await distributedVoting.connect(acc1).deposite(ethers.utils.parseEther("3.0"));

    await expect(distributedVoting.connect(acc1).delegate(proposalId, acc2.address)).to.be.revertedWith(
            "already voted"
          );
  })

  it('second delegation to voted address should be reverted', async () => {
    await distributedVoting.connect(acc1).deposite(ethers.utils.parseEther("3.0"));
    await distributedVoting.connect(acc1).delegate(proposalId, acc2.address);

    await expect(distributedVoting.connect(acc1).delegate(proposalId, acc3.address)).to.be.revertedWith(
            "already delegeted"
          );
  })

  it('delegation should be correct', async () => {
    await distributedVoting.connect(acc1).deposite(ethers.utils.parseEther("3.0"));
    await distributedVoting.connect(acc1).delegate(proposalId, acc2.address);

    await distributedVoting.connect(acc3).deposite(ethers.utils.parseEther("7.0"));
    await distributedVoting.connect(acc3).delegate(proposalId, acc2.address);

    await distributedVoting.connect(acc2).deposite(ethers.utils.parseEther("5.0"));

    await distributedVoting.connect(acc2).vote(proposalId, false)
    expect((await distributedVoting.getVotes(proposalId, false))).to.eq(ethers.utils.parseEther("15.0"))
  })

  it('withdraw with zero balance should be reverted', async () => {
    expect((await zcoin.balanceOf(acc1.address))).to.eq(ethers.utils.parseEther("100.0"))
    await expect(distributedVoting.connect(acc1).withdraw()).to.be.revertedWith(
      "deposite is 0"
    );
    expect((await zcoin.balanceOf(acc1.address))).to.eq(ethers.utils.parseEther("100.0"))
  })

  it('withdraw with incomplete voting should be reverted', async () => {
    expect((await zcoin.balanceOf(acc1.address))).to.eq(ethers.utils.parseEther("100.0"))

    await distributedVoting.connect(acc1).deposite(ethers.utils.parseEther("3.0"));
    await distributedVoting.connect(acc1).vote(proposalId, false)
    
    await expect(distributedVoting.connect(acc1).withdraw()).to.be.revertedWith(
      "you are still a voter"
    );

    await network.provider.send("evm_increaseTime", [3600 * 24 * 3 + 1]) 
    await network.provider.send("evm_mine");

    await expect(distributedVoting.connect(acc1).withdraw()).to.be.revertedWith(
      "you are still a voter"
    );

    expect((await zcoin.balanceOf(acc1.address))).to.eq(ethers.utils.parseEther("97.0"))
  })

  it('withdraw should be correct', async () => {
    await distributedVoting.connect(acc1).deposite(ethers.utils.parseEther("3.0"));
    await distributedVoting.connect(acc1).vote(proposalId, false)
    
    await network.provider.send("evm_increaseTime", [3600 * 24 * 3 + 1]) 
    await network.provider.send("evm_mine");

    await distributedVoting.connect(acc1).finishProposal(proposalId);

    await distributedVoting.connect(acc1).withdraw();

    expect((await zcoin.balanceOf(acc1.address))).to.eq(ethers.utils.parseEther("100.0"))
  })

  it('addProposal should be correct', async () => {
    const receipt = await (
      await distributedVoting.connect(chairPerson)
        .addProposal(
          acc3.address, getSignature(20), "testDescription"))
      .wait();

    let proposalId2 = getEventData("AddProposal", distributedVoting, receipt).proposalId as BigNumber;
    expect(proposalId2).to.eq(1)
    expect((await distributedVoting.getSignature(proposalId2))).to.eq(getSignature(20))
    expect((await distributedVoting.getDescription(proposalId2))).to.eq("testDescription")
    expect((await distributedVoting.getRecipient(proposalId2))).to.eq(acc3.address)
  })

  it('voting with overtime should be reverted', async () => {
    await distributedVoting.connect(acc1).deposite(ethers.utils.parseEther("3.0"));
    
    await network.provider.send("evm_increaseTime", [3600 * 24 * 3 + 1]) 
    await network.provider.send("evm_mine");

    await expect(distributedVoting.connect(acc1).vote(proposalId, true)).to.be.revertedWith(
      "voting is over"
    );
  })

  it('second voting should be reverted', async () => {
    await distributedVoting.connect(acc1).deposite(ethers.utils.parseEther("3.0"));
    await distributedVoting.connect(acc1).vote(proposalId, true);

    await expect(distributedVoting.connect(acc1).vote(proposalId, false)).to.be.revertedWith(
      "already voted"
    );
  })

  it('voting with delegetion should be reverted', async () => {
    await distributedVoting.connect(acc1).deposite(ethers.utils.parseEther("3.0"));
    await distributedVoting.connect(acc1).delegate(proposalId, acc2.address);

    await expect(distributedVoting.connect(acc1).vote(proposalId, false)).to.be.revertedWith(
      "your votes are delegated"
    );
  })

  it('voting with zero balance should be reverted', async () => {
    await expect(distributedVoting.connect(acc1).vote(proposalId, false)).to.be.revertedWith(
      "voting tokens are 0"
    );
  })

  it('voting with zero balance and delegation should be correct', async () => {
    await distributedVoting.connect(acc1).deposite(ethers.utils.parseEther("3.0"));
    await distributedVoting.connect(acc1).delegate(proposalId, acc2.address);

    await distributedVoting.connect(acc2).vote(proposalId, false);

    expect((await distributedVoting.getVotes(proposalId, true))).to.eq(0)
    expect((await distributedVoting.getVotes(proposalId, false))).to.eq(ethers.utils.parseEther("3.0"))
  })

  it('withdraw with delegation should be correct', async () => {
    await distributedVoting.connect(acc1).deposite(ethers.utils.parseEther("3.0"));
    await distributedVoting.connect(acc1).delegate(proposalId, acc2.address);

    await distributedVoting.connect(acc1).withdraw();
    expect((await zcoin.balanceOf(acc1.address))).to.eq(ethers.utils.parseEther("100.0"))

    await expect(distributedVoting.connect(acc2).vote(proposalId, false)).to.be.revertedWith(
      "voting tokens are 0"
    );

    await distributedVoting.connect(acc1).deposite(ethers.utils.parseEther("4.0"));

    await distributedVoting.connect(acc2).vote(proposalId, false);

    expect((await distributedVoting.getVotes(proposalId, true))).to.eq(0)
    expect((await distributedVoting.getVotes(proposalId, false))).to.eq(ethers.utils.parseEther("4.0"))

    await network.provider.send("evm_increaseTime", [3600 * 24 * 3 + 1]) 
    await network.provider.send("evm_mine");

    await distributedVoting.connect(acc1).finishProposal(proposalId);

    expect((await zcoin.balanceOf(acc1.address))).to.eq(ethers.utils.parseEther("96.0"))
    await distributedVoting.connect(acc1).withdraw();
    expect((await zcoin.balanceOf(acc1.address))).to.eq(ethers.utils.parseEther("100.0"))
  })

  it('finishProposal should be reverted if voting in progress', async () => {
    await expect(distributedVoting.connect(acc1).finishProposal(proposalId)).to.be.revertedWith(
      "voting in progress"
    );
  })

  it('finishProposal should be reverted if voting is finished', async () => {
    await network.provider.send("evm_increaseTime", [3600 * 24 * 3 + 1]) 
    await network.provider.send("evm_mine");

    await distributedVoting.connect(acc1).finishProposal(proposalId);

    await expect(distributedVoting.connect(acc1).finishProposal(proposalId)).to.be.revertedWith(
      "voting is finished"
    );
  })

  it('finishProposal with MinimumQuorumNotReached-event should be correct', async () => {
    await distributedVoting.connect(acc1).deposite(ethers.utils.parseEther("1.0"));
    await distributedVoting.connect(acc1).vote(proposalId, true);

    await distributedVoting.connect(acc2).deposite(ethers.utils.parseEther("3.0"));
    await distributedVoting.connect(acc2).vote(proposalId, false);

    await network.provider.send("evm_increaseTime", [3600 * 24 * 3 + 1]) 
    await network.provider.send("evm_mine");
    
    expect(await stacking.getRewardPercentage()).to.eq(5);

    const receipt = await (
      await distributedVoting.connect(chairPerson)
        .finishProposal(proposalId))
      .wait();

    let eventProposalId = getEventData("MinimumQuorumNotReached", distributedVoting, receipt).proposalId as BigNumber;
    expect(eventProposalId).to.eq(proposalId)
    expect(await stacking.getRewardPercentage()).to.eq(5);
  })

  it('finishProposal with rejected proposal should be correct', async () => {
    await distributedVoting.connect(acc1).deposite(ethers.utils.parseEther("8.0"));
    await distributedVoting.connect(acc1).vote(proposalId, false);

    await distributedVoting.connect(acc2).deposite(ethers.utils.parseEther("3.0"));
    await distributedVoting.connect(acc2).vote(proposalId, true);

    await network.provider.send("evm_increaseTime", [3600 * 24 * 3 + 1]) 
    await network.provider.send("evm_mine");
    
    expect(await stacking.getRewardPercentage()).to.eq(5);

    const receipt = await (
      await distributedVoting.connect(chairPerson)
        .finishProposal(proposalId))
      .wait();

    let eventProposalId = getEventData("ProposalRejected", distributedVoting, receipt).proposalId as BigNumber;
    expect(eventProposalId).to.eq(proposalId)
    expect(await stacking.getRewardPercentage()).to.eq(5);
  })

  it('finishProposal with approved proposal should be correct', async () => {
    await distributedVoting.connect(acc1).deposite(ethers.utils.parseEther("8.0"));
    await distributedVoting.connect(acc1).vote(proposalId, true);

    await distributedVoting.connect(acc2).deposite(ethers.utils.parseEther("3.0"));
    await distributedVoting.connect(acc2).vote(proposalId, false);

    await network.provider.send("evm_increaseTime", [3600 * 24 * 3 + 1]) 
    await network.provider.send("evm_mine");
    
    expect(await stacking.getRewardPercentage()).to.eq(5);

    const receipt = await (
      await distributedVoting.connect(chairPerson)
        .finishProposal(proposalId))
      .wait();

    let eventProposalId = getEventData("CallStatus", distributedVoting, receipt).proposalId as BigNumber;
    let status = getEventData("CallStatus", distributedVoting, receipt).status as Boolean;
    expect(eventProposalId).to.eq(proposalId)
    expect(status).to.eq(true)
    expect(await stacking.getRewardPercentage()).to.eq(10);
  })

  it('only chairPerson can add a proposal', async () => {
    console.log(getSignature(20))
    await expect(distributedVoting.connect(acc1)
    .addProposal(
      stacking.address, getSignature(10), "test")).to.be.revertedWith(
      "not a chair person"
    );
  })
})
