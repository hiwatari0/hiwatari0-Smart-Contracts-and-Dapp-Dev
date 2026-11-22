// Contract configuration for the Voting DApp.
// After every (re)deployment, paste the new address below.

window.CONTRACT_CONFIG = {
    // Voting.sol deployed from Remix on the local Hardhat node
    address: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",

    // Hardhat local network
    chainId: 31337,
    networkName: "Hardhat Local",

    // Human-readable ABI (matches contracts/Voting.sol).
    // Candidate IDs start at 0.
    abi: [
        "function vote(uint256 candidateId)",
        "function getCandidate(uint256 candidateId) view returns (uint256 id, string name, uint256 voteCount)",
        "function getCandidateCount() view returns (uint256)",
        "function hasVoted(address voter) view returns (bool)",
        "event VoteCast(address indexed voter, uint256 indexed candidateId)"
    ]
};