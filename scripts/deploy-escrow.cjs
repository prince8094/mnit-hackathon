const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

// Load .env
const envPath = path.resolve(__dirname, "..", ".env");
let rpcUrl = "";
let privateKey = "";

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
    }
  }
  if (!rpcUrl) {
    rpcUrl = "https://polygon-amoy.core.chainstack.com/64fe69f288eb65275d659f8014153083";
  }

  async function deploy() {
    console.log("==========================================");
    console.log("FundTrail - Milestone Escrow Deployment");
    console.log("==========================================");
    console.log("Target Network: Polygon Amoy Testnet (Chain ID 80002)");

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const net = await provider.getNetwork();
    console.log("Connected to Network:", net.name, "ChainId:", Number(net.chainId));

    if (!privateKey || privateKey.length < 64) {
      console.log("\n[NOTICE] DEPLOYER_PRIVATE_KEY is not configured in .env.");
      console.log("To deploy directly to Polygon Amoy via this script:");
      console.log("1. Add DEPLOYER_PRIVATE_KEY=<your_testnet_private_key> into .env");
      console.log("2. Ensure the address has testnet POL from https://faucet.polygon.technology/");
      console.log("3. Run: node scripts/deploy-escrow.cjs\n");
      console.log("Alternatively, users can deploy or interact with the contract using MetaMask in the browser UI.");
      return;
    }

    const wallet = new ethers.Wallet(privateKey, provider);
    console.log("Deployer Address:", wallet.address);

    const balance = await provider.getBalance(wallet.address);
    console.log("Deployer Balance:", ethers.formatEther(balance), "POL");

    if (balance === 0n) {
      console.error("[ERROR] Deployer wallet has 0 POL balance. Please fund it via Polygon Amoy faucet.");
      process.exit(1);
    }

    const artifactPath = path.resolve(__dirname, "..", "artifacts", "FundTrailMilestoneEscrow.json");
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

    console.log("Deploying FundTrailMilestoneEscrow to Polygon Amoy...");
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
    const contract = await factory.deploy();
    console.log("Deployment transaction sent:", contract.deploymentTransaction().hash);

    await contract.waitForDeployment();
    const address = await contract.getAddress();
    console.log("\n>>> SUCCESS! Contract deployed to:", address);
    console.log("PolygonScan Explorer Link: https://amoy.polygonscan.com/address/" + address);

    // Update .env with new contract address
    let envContent = fs.readFileSync(envPath, "utf8");
    if (envContent.includes("VITE_MILESTONE_ESCROW_CONTRACT_ADDRESS=")) {
      envContent = envContent.replace(
        /VITE_MILESTONE_ESCROW_CONTRACT_ADDRESS=.*/,
        `VITE_MILESTONE_ESCROW_CONTRACT_ADDRESS=${address}`
      );
    } else {
      envContent += `\nVITE_MILESTONE_ESCROW_CONTRACT_ADDRESS=${address}\n`;
    }
    fs.writeFileSync(envPath, envContent);
    console.log("Updated .env with VITE_MILESTONE_ESCROW_CONTRACT_ADDRESS=" + address);
  }

  deploy().catch((err) => {
    console.error("Deployment failed:", err);
    process.exit(1);
  });

