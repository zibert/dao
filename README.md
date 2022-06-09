# DistributedVoting

# Install package

npm i <br />

# Test

npx hardhat coverage<br />

# Deploy

npx hardhat run --network rinkeby scripts/deploy.ts <br />

# Verify

npx hardhat verify --network rinkeby --constructor-args arguments.js 0x921ab376fEf88AA60e43B7e5c63172dc557a8d04 <br />

https://rinkeby.etherscan.io/address/0x921ab376fEf88AA60e43B7e5c63172dc557a8d04#code <br />

# Tasks 

## addProposal example: 

npx hardhat addProposal --network rinkeby --recipient 0x731Fb7604e57Dc6f82D5fc7105195365411Ce6e4 --signature 0xe3300f4d0000000000000000000000000000000000000000000000000000000000000014 --description "changeRewardPercentage(uint64),20" <br />

## vote example: 

npx hardhat vote --network rinkeby --id 0 --choice false <br />

## deposite example: 

npx hardhat deposite --network rinkeby --amount 10.0 <br />

## withdraw example: 

npx hardhat withdraw --network rinkeby <br />

## delegate example: 

npx hardhat delegate --network rinkeby --id 0 --to 0xC413AeD1E837F528670f8bf27C4Eed9AFCDB7bB5 <br />

## finishProposal example: 

npx hardhat finishProposal --network rinkeby --id 0 <br />