// Voting DApp: wallet connection, reading contract state, casting votes.
// Uses ethers.js v6. Config (address, chainId, ABI) lives in contract.js.

const CONFIG = window.CONTRACT_CONFIG;
const RPC_URL = CONFIG.rpcUrl || "http://127.0.0.1:8545";

let provider = null;
let signer = null;
let contract = null;
let account = null;
let hasVoted = false;

const $ = (id) => document.getElementById(id);

// ---------- small UI helpers ----------

function shortAddress(address) {
    return address.slice(0, 6) + "..." + address.slice(-4);
}

function setBadge(text, ok) {
    const badge = $("networkBadge");
    badge.textContent = text;
    badge.classList.toggle("ok", ok);
    badge.classList.toggle("bad", !ok);
}

// type: "pending" | "success" | "error"
function setStatus(title, message, type = "pending") {
    $("txPanel").classList.remove("hidden");
    $("txPanel").dataset.type = type;
    $("txTitle").textContent = title;
    $("txMessage").textContent = message;
}

function friendlyError(error) {
    if (error.code === "ACTION_REJECTED" || error.code === 4001) {
        return "You rejected the request in MetaMask. Nothing was sent.";
    }
    return error.reason || error.shortMessage || error.message || "Unknown error";
}

// ---------- network check and switch ----------

async function checkNetwork() {
    const network = await provider.getNetwork();
    const correct = Number(network.chainId) === CONFIG.chainId;

    setBadge(
        correct
            ? CONFIG.networkName + " (" + network.chainId + ")"
            : "Wrong network (" + network.chainId + ")",
        correct
    );
    $("networkName").textContent = correct
        ? CONFIG.networkName + " (Chain ID " + network.chainId + ")"
        : "Wrong network (Chain ID " + network.chainId + ")";

    return correct;
}

// Ask MetaMask to switch this site to the expected chain.
// If the chain is unknown to MetaMask (error 4902), add it first.
async function switchToExpectedChain() {
    const chainIdHex = "0x" + CONFIG.chainId.toString(16);

    try {
        await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: chainIdHex }]
        });
        return true;
    } catch (error) {
        if (error.code === 4902) {
            try {
                await window.ethereum.request({
                    method: "wallet_addEthereumChain",
                    params: [{
                        chainId: chainIdHex,
                        chainName: CONFIG.networkName,
                        rpcUrls: [RPC_URL],
                        nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }
                    }]
                });
                return true;
            } catch (addError) {
                console.error(addError);
                return false;
            }
        }
        console.error(error);
        return false;
    }
}

// ---------- wallet connection ----------

// userInitiated = true when the person clicked "Connect MetaMask".
async function connectWallet(userInitiated = true) {
    if (!window.ethereum) {
        setStatus(
            "MetaMask not found",
            "Install the MetaMask extension in this browser and reload the page.",
            "error"
        );
        return;
    }

    try {
        provider = new ethers.BrowserProvider(window.ethereum);
        await provider.send("eth_requestAccounts", []);

        signer = await provider.getSigner();
        account = await signer.getAddress();

        $("account").textContent = account;
        $("connectBtn").textContent = shortAddress(account);

        if (!(await checkNetwork())) {
            if (userInitiated) {
                setStatus(
                    "Wrong network",
                    "Approve the network switch to " + CONFIG.networkName +
                    " (Chain ID " + CONFIG.chainId + ") in MetaMask.",
                    "pending"
                );

                const switched = await switchToExpectedChain();

                if (!switched) {
                    setStatus(
                        "Wrong network",
                        "Switch MetaMask to " + CONFIG.networkName +
                        " (Chain ID " + CONFIG.chainId + ") and reload this page.",
                        "error"
                    );
                }
                // On success MetaMask fires chainChanged; the page reloads
                // and reconnects automatically.
            } else {
                setStatus(
                    "Wrong network",
                    "Click Connect MetaMask to switch to " + CONFIG.networkName + ".",
                    "error"
                );
            }
            return;
        }

        // Make sure a contract really exists at the configured address.
        const code = await provider.getCode(CONFIG.address);
        if (code === "0x") {
            setStatus(
                "Contract not found",
                "No contract at " + CONFIG.address + ". If you restarted the Hardhat node, " +
                "deploy Voting.sol again and update the address in contract.js.",
                "error"
            );
            return;
        }

        contract = new ethers.Contract(CONFIG.address, CONFIG.abi, signer);

        // Event listener: refresh whenever a VoteCast event is emitted.
        contract.on("VoteCast", () => loadData());

        await loadData();
        setStatus("Connected", "Wallet connected. Candidate data is loaded from the contract.", "success");

    } catch (error) {
        console.error(error);
        setStatus("Could not connect", friendlyError(error), "error");
    }
}

// Reconnect silently on page load if the site is already permitted.
async function autoConnect() {
    if (!window.ethereum) return;

    try {
        const accounts = await window.ethereum.request({ method: "eth_accounts" });
        if (accounts.length > 0) {
            await connectWallet(false);
        }
    } catch (error) {
        console.error(error);
    }
}

// ---------- read contract state ----------

async function loadData() {
    if (!contract) return;

    try {
        const count = Number(await contract.getCandidateCount());
        const candidates = [];
        let total = 0;

        for (let i = 0; i < count; i++) {
            const [id, name, votes] = await contract.getCandidate(i);
            candidates.push({ id: Number(id), name: name, votes: Number(votes) });
            total += Number(votes);
        }

        hasVoted = await contract.hasVoted(account);

        $("totalVotes").textContent = total;
        $("candidateCount").textContent = count;
        $("voteStatus").textContent = hasVoted ? "Already voted" : "Not voted yet";

        renderCandidates(candidates, total);
        renderResults(candidates, total);

    } catch (error) {
        console.error(error);
        setStatus("Could not read contract", friendlyError(error), "error");
    }
}

function renderCandidates(candidates, total) {
    const grid = $("candidateList");
    grid.innerHTML = "";

    candidates.forEach((candidate) => {
        const percent = total > 0 ? (candidate.votes / total) * 100 : 0;

        const card = document.createElement("article");
        card.className = "candidate-card";

        // top row: avatar + id chip
        const top = document.createElement("div");
        top.className = "card-top";

        const avatar = document.createElement("div");
        avatar.className = "avatar";
        avatar.textContent = candidate.name.charAt(0).toUpperCase();

        const chip = document.createElement("span");
        chip.className = "chip";
        chip.textContent = "ID " + candidate.id;

        top.append(avatar, chip);

        // name
        const name = document.createElement("h3");
        name.textContent = candidate.name;

        // vote count
        const votes = document.createElement("div");
        votes.className = "card-votes";
        const number = document.createElement("strong");
        number.textContent = candidate.votes;
        const label = document.createElement("span");
        label.textContent = candidate.votes === 1 ? "vote" : "votes";
        votes.append(number, label);

        // share bar
        const bar = document.createElement("div");
        bar.className = "bar";
        const fill = document.createElement("div");
        fill.className = "bar-fill";
        fill.style.width = percent + "%";
        bar.appendChild(fill);

        // vote button
        const button = document.createElement("button");
        button.className = "btn";
        button.textContent = hasVoted ? "Already voted" : "Vote for " + candidate.name;
        button.disabled = hasVoted;
        button.addEventListener("click", () => castVote(candidate.id, candidate.name));

        card.append(top, name, votes, bar, button);
        grid.appendChild(card);
    });
}

function renderResults(candidates, total) {
    const box = $("results");
    box.innerHTML = "";

    const maxVotes = Math.max(...candidates.map((c) => c.votes));
    const leaders = candidates.filter((c) => c.votes === maxVotes).length;

    candidates.forEach((candidate) => {
        const percent = total > 0 ? (candidate.votes / total) * 100 : 0;

        const row = document.createElement("div");
        row.className = "result";

        const head = document.createElement("div");
        head.className = "result-head";

        const left = document.createElement("span");
        left.textContent = candidate.name;

        // mark a single clear leader
        if (total > 0 && leaders === 1 && candidate.votes === maxVotes) {
            const tag = document.createElement("span");
            tag.className = "leading";
            tag.textContent = "Leading";
            left.appendChild(tag);
        }

        const right = document.createElement("span");
        right.textContent = candidate.votes + " votes (" + percent.toFixed(1) + "%)";

        head.append(left, right);

        const bar = document.createElement("div");
        bar.className = "bar";
        const fill = document.createElement("div");
        fill.className = "bar-fill";
        fill.style.width = percent + "%";
        bar.appendChild(fill);

        row.append(head, bar);
        box.appendChild(row);
    });
}

// ---------- write to contract (vote) ----------

async function castVote(candidateId, candidateName) {
    try {
        if (!(await checkNetwork())) {
            setStatus("Wrong network", "Switch MetaMask to " + CONFIG.networkName + " first.", "error");
            return;
        }

        if (await contract.hasVoted(account)) {
            setStatus("Already voted", "This address has already voted.", "error");
            await loadData();
            return;
        }

        // Disable all vote buttons while the transaction is in progress.
        document.querySelectorAll(".candidate-card .btn").forEach((b) => (b.disabled = true));

        setStatus("Confirm in MetaMask", "Approve the vote for " + candidateName + " in your wallet.", "pending");

        const tx = await contract.vote(candidateId);

        setStatus("Transaction submitted", "Hash: " + tx.hash + " (waiting for confirmation...)", "pending");

        const receipt = await tx.wait();

        if (receipt.status !== 1) {
            throw new Error("The transaction was mined but failed.");
        }

        setStatus(
            "Vote confirmed",
            "Voted for " + candidateName + ". Block " + receipt.blockNumber +
            " | Gas used: " + receipt.gasUsed + " | Tx hash: " + tx.hash,
            "success"
        );

    } catch (error) {
        console.error(error);
        setStatus("Vote not recorded", friendlyError(error), "error");
    }

    // Refresh results and re-enable (or keep disabled) the buttons.
    await loadData();
}

// ---------- wallet events and start-up ----------

if (window.ethereum) {
    window.ethereum.on("accountsChanged", () => window.location.reload());
    window.ethereum.on("chainChanged", () => window.location.reload());
}

$("contractAddr").textContent = CONFIG.address;
$("connectBtn").addEventListener("click", () => connectWallet(true));
autoConnect();