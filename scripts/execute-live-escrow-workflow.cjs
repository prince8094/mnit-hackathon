const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

// Load .env
const envPath = path.resolve(__dirname, "..", ".env");
let rpcUrl = "";
let privateKey = "";
let escrowAddress = "";

if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    if (line.startsWith("POLYGON_AMOY_RPC_URL=")) {
      const val = line.split("=")[1]?.trim();
      if (val) rpcUrl = val;
    } else if (line.startsWith("VITE_AMOY_RPC_URL=") && !rpcUrl) {
      const val = line.split("=")[1]?.trim();
      if (val) rpcUrl = val;
    }
    if (line.startsWith("DEPLOYER_PRIVATE_KEY=")) {
      const val = line.split("=")[1]?.trim();
      if (val) privateKey = val;
    }
    if (line.startsWith("VITE_MILESTONE_ESCROW_CONTRACT_ADDRESS=")) {
      const val = line.split("=")[1]?.trim();
      if (val) escrowAddress = val;
    }
  }
}

if (!rpcUrl) {
  rpcUrl = "https://polygon-amoy.core.chainstack.com/64fe69f288eb65275d659f8014153083";
}

async function run() {
  console.log("=====================================================");
  console.log("FundTrail — Live End-to-End On-Chain Escrow Workflow");
  console.log("=====================================================");
  console.log("Target Network: Polygon Amoy Testnet (Chain ID 80002)");
  console.log("Target Escrow Contract:", escrowAddress);

  if (!privateKey || privateKey.length < 64) {
    console.error("[ERROR] DEPLOYER_PRIVATE_KEY not configured in .env");
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const net = await provider.getNetwork();
  console.log("Connected to Network:", net.name, "ChainId:", Number(net.chainId));

  // Check contract code
  const code = await provider.getCode(escrowAddress);
  if (code === "0x") {
    console.error(`[ERROR] Escrow contract at ${escrowAddress} has no deployed bytecode! Deploy it first.`);
    process.exit(1);
  }
  console.log(`[PASS] Escrow contract bytecode verified (${code.length} bytes) on Polygon Amoy.`);

  const artifactPath = path.resolve(__dirname, "..", "artifacts", "FundTrailMilestoneEscrow.json");
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  // 1. Wallets setup
  const deployerWallet = new ethers.Wallet(privateKey, provider);
  console.log("\n[Wallets]");
  console.log("Deployer / Donor Wallet:", deployerWallet.address);

  // Create temporary distinct wallets for NGO and Independent Verifier
  const ngoWallet = ethers.Wallet.createRandom().connect(provider);
  const verifierWallet = ethers.Wallet.createRandom().connect(provider);

  console.log("NGO Wallet (Recipient):", ngoWallet.address);
  console.log("Independent Verifier Wallet:", verifierWallet.address);

  // Fund NGO and Verifier with small gas from deployer wallet
  console.log("\nFunding NGO and Verifier with testnet POL for transaction gas fees...");
  const gasFundAmount = ethers.parseEther("0.005");
  
  const tx1 = await deployerWallet.sendTransaction({ to: ngoWallet.address, value: gasFundAmount });
  await tx1.wait();
  console.log(`  -> Funded NGO with 0.005 POL (Tx: ${tx1.hash})`);

  const tx2 = await deployerWallet.sendTransaction({ to: verifierWallet.address, value: gasFundAmount });
  await tx2.wait();
  console.log(`  -> Funded Verifier with 0.005 POL (Tx: ${tx2.hash})`);

  const escrowDeployer = new ethers.Contract(escrowAddress, artifact.abi, deployerWallet);
  const escrowNGO = new ethers.Contract(escrowAddress, artifact.abi, ngoWallet);
  const escrowVerifier = new ethers.Contract(escrowAddress, artifact.abi, verifierWallet);

  // Generate unique project ID
  const projectIdStr = `audit-project-${Date.now()}`;
  const projectId = ethers.keccak256(ethers.toUtf8Bytes(projectIdStr));
  console.log(`\n--- Step 1: NGO Creates Project ---`);
  console.log("Project Key:", projectId);

  const milestoneAllocation = ethers.parseEther("0.001");
  const targetAmount = milestoneAllocation;
  const milestoneTitles = ["Milestone 1: Procurement of Rural School Kits"];
  const milestoneAllocations = [milestoneAllocation];

  const createTx = await escrowNGO.createProject(
    projectId,
    ngoWallet.address,
    verifierWallet.address,
    targetAmount,
    milestoneTitles,
    milestoneAllocations
  );
  const createReceipt = await createTx.wait();
  console.log(`[PASS] Project Created! Tx Hash: ${createReceipt.hash}`);
  console.log(`  Explorer Link: https://amoy.polygonscan.com/tx/${createReceipt.hash}`);

  // Step 2: Donor contributes test POL to escrow
  console.log(`\n--- Step 2: Donor Contributes to Escrow ---`);
  const contributionAmount = ethers.parseEther("0.001");
  const contribTx = await escrowDeployer.contribute(projectId, { value: contributionAmount });
  const contribReceipt = await contribTx.wait();
  console.log(`[PASS] Contributed 0.001 POL to Escrow! Tx Hash: ${contribReceipt.hash}`);
  console.log(`  Explorer Link: https://amoy.polygonscan.com/tx/${contribReceipt.hash}`);

  // Step 3: NGO submits milestone evidence
  console.log(`\n--- Step 3: NGO Submits Milestone Evidence ---`);
  const sampleCid = "QmY3tKQVf2ZdNtQh6cJrn1cnaN6G5iHzX7kAfV6SsMuwRT";
  const sampleEvidenceHash = ethers.keccak256(ethers.toUtf8Bytes("Verified Evidence Invoice #9901"));
  const evidenceTx = await escrowNGO.submitMilestoneEvidence(projectId, 0, sampleCid, sampleEvidenceHash);
  const evidenceReceipt = await evidenceTx.wait();
  console.log(`[PASS] Milestone Evidence Submitted! Tx Hash: ${evidenceReceipt.hash}`);
  console.log(`  Explorer Link: https://amoy.polygonscan.com/tx/${evidenceReceipt.hash}`);

  // Step 4: Independent Verifier approves milestone
  console.log(`\n--- Step 4: Independent Verifier Approves Milestone ---`);
  const reviewReason = "Independent social audit completed: invoice and delivery photos verified.";
  const verifyTx = await escrowVerifier.verifyMilestone(projectId, 0, true, reviewReason);
  const verifyReceipt = await verifyTx.wait();
  console.log(`[PASS] Milestone Approved by Verifier! Tx Hash: ${verifyReceipt.hash}`);
  console.log(`  Explorer Link: https://amoy.polygonscan.com/tx/${verifyReceipt.hash}`);

  // Step 5: NGO releases approved funds
  console.log(`\n--- Step 5: NGO Releases Approved Milestone Funds ---`);
  const balBefore = await provider.getBalance(ngoWallet.address);
  const releaseTx = await escrowNGO.releaseMilestoneFunds(projectId, 0);
  const releaseReceipt = await releaseTx.wait();
  const balAfter = await provider.getBalance(ngoWallet.address);
  const gasSpent = releaseReceipt.gasUsed * releaseReceipt.gasPrice;
  const netChange = balAfter - balBefore + gasSpent;

  console.log(`[PASS] Milestone Funds Released! Tx Hash: ${releaseReceipt.hash}`);
  console.log(`  Explorer Link: https://amoy.polygonscan.com/tx/${releaseReceipt.hash}`);
  console.log(`  NGO Balance Before Release: ${ethers.formatEther(balBefore)} POL`);
  console.log(`  NGO Balance After Release:  ${ethers.formatEther(balAfter)} POL`);
  console.log(`  Net Funds Received by NGO:  ${ethers.formatEther(netChange)} POL`);

  console.log("\n=====================================================");
  console.log("SUMMARY OF ON-CHAIN TRANSACTIONS VERIFIED ON AMOY:");
  console.log("=====================================================");
  console.log("1. Contract Deployed At:      ", escrowAddress);
  console.log("2. Project Creation Tx:       ", createReceipt.hash);
  console.log("3. Escrow Contribution Tx:    ", contribReceipt.hash);
  console.log("4. Evidence Submission Tx:    ", evidenceReceipt.hash);
  console.log("5. Verifier Approval Tx:      ", verifyReceipt.hash);
  console.log("6. NGO Fund Release Tx:       ", releaseReceipt.hash);
  console.log("=====================================================");
}

run().catch((err) => {
  console.error("Workflow failed:", err);
  process.exit(1);
});

