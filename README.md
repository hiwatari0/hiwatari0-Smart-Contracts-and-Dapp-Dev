# Blockchain Technology Lab: Smart Contracts and DApp Development

**Name: Lavika Rawat**

Individual lab assignment covering Ethereum accounts, Solidity smart contracts, and a decentralized voting DApp built with HTML, CSS, JavaScript and ethers.js.

## Repository structure

```
contracts/      SimpleStorage.sol, Voting.sol
frontend/       index.html, css/style.css, js/contract.js, js/app.js
screenshots/    Evidence for each part (part1 ... part6)
README.md       This file
```

## Network and deployment

- Network: Hardhat local development node
- RPC URL: `http://127.0.0.1:8545`
- Chain ID: `31337`
- Tools: Remix IDE, MetaMask, Hardhat node (`npx hardhat node`)
- SimpleStorage contract address: `<paste address>`
- Voting contract address: `<paste address>`

### Deployment procedure

1. Start the local node: `npx hardhat node` (keep the terminal open).
2. In MetaMask, add the network above and import one of the funded Hardhat test accounts.
3. Open Remix, compile `contracts/Voting.sol` (Solidity 0.8.20 or newer).
4. In Deploy and Run, choose environment "Browser Extension" (MetaMask) and deploy.
5. Copy the deployed address into `frontend/js/contract.js`.

## Running the DApp

```
cd frontend
npx serve .
```

Open the printed `localhost` URL in a browser with MetaMask installed, connect the wallet (approve the switch to Hardhat Local if asked), then vote.

## Features

- Wallet connection and detection of the expected network (with a network switch request)
- Candidates and vote counts read directly from the smart contract
- Voting through MetaMask with transaction status, hash and gas used
- One vote per address enforced by the contract (`mapping(address => bool)`)
- Handling of rejected transactions, failed transactions, missing MetaMask and wrong network

## Notes

- The Hardhat node resets when it is restarted. Deploy the contract again and update the address in `contract.js`.
- No private keys, recovery phrases or credentials are stored in this repository.