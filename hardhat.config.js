import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let AMOY_RPC_URL = "https://polygon-amoy.drpc.org";
let PRIVATE_KEY = "";

try {
  const envPath = path.resolve(__dirname, ".env");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      if (line.startsWith("POLYGON_AMOY_RPC_URL=") || line.startsWith("VITE_AMOY_RPC_URL=")) {
        const val = line.split("=")[1]?.trim();
        if (val) AMOY_RPC_URL = val;
      }
      if (line.startsWith("DEPLOYER_PRIVATE_KEY=")) {
        const val = line.split("=")[1]?.trim();
        if (val) PRIVATE_KEY = val;
      }
    }
  }
} catch (e) {}

/** @type import('hardhat/config').HardhatUserConfig */
export default {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      type: "edr-simulated",
      chainId: 31337,
    },
    polygonAmoy: {
      type: "http",
      url: AMOY_RPC_URL,
      chainId: 80002,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./contracts/test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};
