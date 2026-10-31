import {
  BrowserProvider,
  Contract,
  JsonRpcProvider,
  keccak256,
  toUtf8Bytes,
  parseEther,
  formatEther
} from 'ethers';
import { REPORT_ANCHOR_ABI } from '../features/blockchain/contract-abi';
import { FUNDTRAIL_MILESTONE_ESCROW_ABI } from '../features/blockchain/milestone-escrow-abi';
import { TransactionClassification } from '../types';

export const AMOY_CHAIN_ID = 80002;
export const AMOY_CHAIN_ID_HEX = '0x13882';
export const DEFAULT_AMOY_RPC = 
  import.meta.env.VITE_AMOY_RPC_URL || 
  'https://rpc-amoy.polygon.technology';

export const DEFAULT_AMOY_EXPLORER = 
  import.meta.env.VITE_AMOY_EXPLORER_URL || 
  'https://amoy.polygonscan.com';

export const DEFAULT_ANCHOR_CONTRACT_ADDRESS = 
  import.meta.env.VITE_REPORT_ANCHOR_CONTRACT_ADDRESS || 
  '0xaee46f1a48e92E9C7cb47AC59aeE4B3B49B6976F';

export const DEFAULT_ESCROW_CONTRACT_ADDRESS = 
  import.meta.env.VITE_MILESTONE_ESCROW_CONTRACT_ADDRESS || 
  '0x6e25b7E580EE473f47e32943261623190886C871';

// Config parameter for Polygon Amoy network addition in MetaMask
export const AMOY_NETWORK_PARAMS = {
  chainId: AMOY_CHAIN_ID_HEX,
  chainName: 'Polygon Amoy Testnet',
  nativeCurrency: {
    name: 'POL',
    symbol: 'POL',
    decimals: 18
  },
  rpcUrls: [
    'https://rpc-amoy.polygon.technology',
    'https://polygon-amoy.core.chainstack.com/64fe69f288eb65275d659f8014153083',
    DEFAULT_AMOY_RPC
  ],
  blockExplorerUrls: [DEFAULT_AMOY_EXPLORER]
};

export interface WalletState {
  isConnected: boolean;
  address: string | null;
  chainId: number | null;
  isAmoy: boolean;
  error: string | null;
}

/**
 * Known synthetic or unrelated micropayment hashes that must NEVER be
 * misrepresented as verified escrow operations (releases, contributions, verifications).
 */
export const KNOWN_UNRELATED_OR_DEMO_HASHES = new Set([
  '0x8f7e6d5c4b3a2918273645e5d4c3b2a1f0e9d8c7b6a5e4d3c2b1a0f9e8d7c6b5'.toLowerCase(),
  '0x99a3b2c1d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1'.toLowerCase(),
  '0x88f2a1b9c7d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6'.toLowerCase(),
  '0x7e6d5c4b3a2918273645e5d4c3b2a1f0e9d8c7b6a5e4d3c2b1a0f9e8d7c6b5a4'.toLowerCase(),
  '0xcd8cabca0067bdadb14657de318948eb3cf3a97bee9b0bd2f51f6138c9e4ca6b'.toLowerCase(),
  '0x620c75a552e693404b527aa5db824202d2d5b2916a750cd1617dba105b73684f'.toLowerCase(),
  '0x7425df0f820cf075dd83044f53afee837f4df44ed943430d3a5fc662360be11e'.toLowerCase(),
  '0xb217b4299fdd598c7c880e5db2a0682dbfe653f4938e694fd31ad8830a9f0809'.toLowerCase(),
]);

/**
 * Checks if a hash is synthetic, placeholder or known unrelated transaction.
 */
export function isSyntheticOrDemoHash(hash: string | null | undefined): boolean {
  if (!hash) return true;
  const clean = hash.toLowerCase().trim();
  if (!clean.startsWith('0x') || clean.length !== 66) return true;
  return KNOWN_UNRELATED_OR_DEMO_HASHES.has(clean);
}

/**
 * Classifies a transaction to strictly separate real on-chain escrow operations,
 * demo/simulated records, and pending state.
 */
export function classifyTransaction(
  txHash: string | null | undefined,
  explicitStatus?: TransactionClassification
): {
  status: TransactionClassification;
  isVerifiedOnchain: boolean;
  isDemo: boolean;
  label: string;
  explorerUrl: string | null;
} {
  if (explicitStatus === 'DEMO_SIMULATED' || isSyntheticOrDemoHash(txHash)) {
    return {
      status: 'DEMO_SIMULATED',
      isVerifiedOnchain: false,
      isDemo: true,
      label: 'Demo Simulated (Off-chain)',
      explorerUrl: null
    };
  }

  if (explicitStatus === 'PENDING' || !txHash) {
    return {
      status: 'PENDING',
      isVerifiedOnchain: false,
      isDemo: false,
      label: 'Pending Confirmation',
      explorerUrl: null
    };
  }

  if (txHash && txHash.startsWith('0x') && txHash.length === 66 && !isSyntheticOrDemoHash(txHash)) {
    return {
      status: 'VERIFIED_ONCHAIN',
      isVerifiedOnchain: true,
      isDemo: false,
      label: 'Verified on Polygon Amoy',
      explorerUrl: `${DEFAULT_AMOY_EXPLORER}/tx/${txHash}`
    };
  }

  return {
    status: 'INVALID',
    isVerifiedOnchain: false,
    isDemo: false,
    label: 'Invalid Transaction',
    explorerUrl: null
  };
}

export function getAmoyExplorerTxUrl(txHash: string | null | undefined): string {
  if (!txHash || !txHash.startsWith('0x') || txHash.length < 66) return '#';
  if (isSyntheticOrDemoHash(txHash)) return '#';
  return `${DEFAULT_AMOY_EXPLORER}/tx/${txHash}`;
}

export function getAmoyExplorerAddressUrl(address: string): string {
  if (!address) return '#';
  return `${DEFAULT_AMOY_EXPLORER}/address/${address}`;
}

export function computeProjectIdKey(projectIdOrSlug: string): string {
  return keccak256(toUtf8Bytes(projectIdOrSlug.trim()));
}

/**
 * Safely retrieve Ethereum provider, disambiguating multiple wallet extensions
 */
export function getEthereumProvider(): any {
  if (typeof window === 'undefined') return null;
  const win = window as any;
  if (!win.ethereum) return null;
  if (Array.isArray(win.ethereum.providers)) {
    const metaMaskProvider = win.ethereum.providers.find((p: any) => p.isMetaMask);
    if (metaMaskProvider) return metaMaskProvider;
  }
  return win.ethereum;
}

/**
 * Check if MetaMask / web3 provider is installed
 */
export function isMetaMaskInstalled(): boolean {
  return Boolean(getEthereumProvider());
}

/**
 * Request account connection to MetaMask
 */
export async function connectWallet(): Promise<{ address: string; chainId: number }> {
  const ethereum = getEthereumProvider();
  if (!ethereum) {
    throw new Error('MetaMask is not installed. Please install MetaMask to interact with Polygon Amoy.');
  }

  // 1. Try reading existing accounts first
  let accounts: string[] = [];
  try {
    accounts = (await ethereum.request({ method: 'eth_accounts' })) || [];
  } catch (e) {
    console.warn('eth_accounts check warning:', e);
  }

  // 2. If no account authorized yet, request user permission
  if (!accounts || accounts.length === 0) {
    try {
      accounts = await ethereum.request({ method: 'eth_requestAccounts' });
    } catch (reqErr: any) {
      if (reqErr.code === -32603 || reqErr?.message?.includes('internal error')) {
        throw new Error(
          'MetaMask reported an internal error or pending request. Please click your MetaMask extension icon, unlock your wallet or reject any pending prompts, and try again.'
        );
      }
      if (reqErr.code === 4001 || reqErr?.message?.includes('rejected')) {
        throw new Error('Connection request was rejected in MetaMask.');
      }
      throw reqErr;
    }
  }

  if (!accounts || accounts.length === 0) {
    throw new Error('No account selected or permission denied.');
  }

  const chainIdHex: string = await ethereum.request({ method: 'eth_chainId' });
  const chainId = parseInt(chainIdHex, 16);

  return { address: accounts[0], chainId };
}

/**
 * Switch wallet network to Polygon Amoy (Chain ID 80002)
 */
export async function switchToPolygonAmoy(): Promise<void> {
  const ethereum = getEthereumProvider();
  if (!ethereum) {
    throw new Error('MetaMask is not installed.');
  }

  try {
    await ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: AMOY_CHAIN_ID_HEX }]
    });
  } catch (switchError: any) {
    console.warn('wallet_switchEthereumChain notice, attempting wallet_addEthereumChain:', switchError);
    // Code 4902, -32603, or unrecognised chain message all require adding the chain
    try {
      await ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [AMOY_NETWORK_PARAMS]
      });
    } catch (addError: any) {
      if (addError.code === 4001 || addError?.message?.includes('rejected')) {
        throw new Error('Network switch to Polygon Amoy was rejected in MetaMask.');
      }
      throw new Error(
        'Could not automatically configure Polygon Amoy network. Please open MetaMask -> Networks -> Add Network -> Polygon Amoy (Chain ID 80002, RPC: https://rpc-amoy.polygon.technology).'
      );
    }
  }
}

// -------------------------------------------------------------
// Milestone Escrow Smart Contract Operations
// -------------------------------------------------------------

async function getSignerAndEnsureAmoy() {
  if (!isMetaMaskInstalled()) {
    throw new Error('MetaMask is not installed.');
  }

  const ethereum = (window as any).ethereum;
  const provider = new BrowserProvider(ethereum);
  const signer = await provider.getSigner();

  const network = await provider.getNetwork();
  if (Number(network.chainId) !== AMOY_CHAIN_ID) {
    await switchToPolygonAmoy();
  }

  return signer;
}

/**
 * Create Project with Milestones on Polygon Amoy Escrow
 */
export async function createOnchainProject(
  projectIdKey: string,
  ngoWallet: string,
  verifierWallet: string,
  targetAmountPol: number,
  milestoneTitles: string[],
  milestoneAllocationsPol: number[],
  contractAddress: string = DEFAULT_ESCROW_CONTRACT_ADDRESS
): Promise<{ txHash: string }> {
  const signer = await getSignerAndEnsureAmoy();
  const contract = new Contract(contractAddress, FUNDTRAIL_MILESTONE_ESCROW_ABI, signer);

  const targetWei = parseEther(targetAmountPol.toString());
  const allocationsWei = milestoneAllocationsPol.map(a => parseEther(a.toString()));

  const tx = await contract.createProject(
    projectIdKey,
    ngoWallet,
    verifierWallet,
    targetWei,
    milestoneTitles,
    allocationsWei
  );
  const receipt = await tx.wait();
  return { txHash: receipt.hash || tx.hash };
}

/**
 * Contribute Testnet POL to Project Escrow
 */
export async function contributeOnchain(
  projectIdKey: string,
  amountPol: number,
  contractAddress: string = DEFAULT_ESCROW_CONTRACT_ADDRESS
): Promise<{ txHash: string; donorAddress: string }> {
  const signer = await getSignerAndEnsureAmoy();
  const contract = new Contract(contractAddress, FUNDTRAIL_MILESTONE_ESCROW_ABI, signer);
  const donorAddress = await signer.getAddress();

  const valueWei = parseEther(amountPol.toString());
  const tx = await contract.contribute(projectIdKey, { value: valueWei });
  const receipt = await tx.wait();

  return {
    txHash: receipt.hash || tx.hash,
    donorAddress
  };
}

/**
 * NGO submits IPFS evidence and canonical fingerprint for a milestone
 */
export async function submitMilestoneEvidenceOnchain(
  projectIdKey: string,
  milestoneIndex: number,
  ipfsCid: string,
  evidenceHash: string,
  contractAddress: string = DEFAULT_ESCROW_CONTRACT_ADDRESS
): Promise<{ txHash: string }> {
  const signer = await getSignerAndEnsureAmoy();
  const contract = new Contract(contractAddress, FUNDTRAIL_MILESTONE_ESCROW_ABI, signer);

  // Format hash as bytes32
  let formattedHash = evidenceHash;
  if (!formattedHash.startsWith('0x')) {
    formattedHash = '0x' + formattedHash;
  }
  if (formattedHash.length < 66) {
    formattedHash = formattedHash.padEnd(66, '0');
  }

  const tx = await contract.submitMilestoneEvidence(
    projectIdKey,
    milestoneIndex,
    ipfsCid,
    formattedHash
  );
  const receipt = await tx.wait();

  return { txHash: receipt.hash || tx.hash };
}

/**
 * Authorized verifier approves or rejects milestone
 */
export async function verifyMilestoneOnchain(
  projectIdKey: string,
  milestoneIndex: number,
  approved: boolean,
  reviewReason: string,
  contractAddress: string = DEFAULT_ESCROW_CONTRACT_ADDRESS
): Promise<{ txHash: string; verifierAddress: string }> {
  const signer = await getSignerAndEnsureAmoy();
  const contract = new Contract(contractAddress, FUNDTRAIL_MILESTONE_ESCROW_ABI, signer);
  const verifierAddress = await signer.getAddress();

  const tx = await contract.verifyMilestone(
    projectIdKey,
    milestoneIndex,
    approved,
    reviewReason
  );
  const receipt = await tx.wait();

  return {
    txHash: receipt.hash || tx.hash,
    verifierAddress
  };
}

/**
 * Release milestone escrow funds to the NGO
 */
export async function releaseMilestoneFundsOnchain(
  projectIdKey: string,
  milestoneIndex: number,
  contractAddress: string = DEFAULT_ESCROW_CONTRACT_ADDRESS
): Promise<{ txHash: string }> {
  const signer = await getSignerAndEnsureAmoy();
  const contract = new Contract(contractAddress, FUNDTRAIL_MILESTONE_ESCROW_ABI, signer);

  const tx = await contract.releaseMilestoneFunds(projectIdKey, milestoneIndex);
  const receipt = await tx.wait();

  return { txHash: receipt.hash || tx.hash };
}

// -------------------------------------------------------------
// Read-Only Public Queries (NO WALLET NEEDED)
// -------------------------------------------------------------

export async function readOnchainProject(
  projectIdKey: string,
  contractAddress: string = DEFAULT_ESCROW_CONTRACT_ADDRESS,
  rpcUrl: string = DEFAULT_AMOY_RPC
) {
  try {
    const provider = new JsonRpcProvider(rpcUrl, { chainId: AMOY_CHAIN_ID, name: 'amoy' });
    const contract = new Contract(contractAddress, FUNDTRAIL_MILESTONE_ESCROW_ABI, provider);

    const p = await contract.getProject(projectIdKey);
    const count = await contract.getMilestonesCount(projectIdKey);
    const escrowBalance = await contract.getEscrowBalance(projectIdKey);

    return {
      ngoWallet: p.ngoWallet,
      authorizedVerifier: p.authorizedVerifier,
      targetAmountPol: Number(formatEther(p.targetAmount)),
      totalReceivedPol: Number(formatEther(p.totalReceived)),
      totalReleasedPol: Number(formatEther(p.totalReleased)),
      escrowBalancePol: Number(formatEther(escrowBalance)),
      status: Number(p.status),
      createdAt: Number(p.createdAt),
      milestoneCount: Number(count)
    };
  } catch (err) {
    console.warn('Read onchain project notice:', err);
    return null;
  }
}

export async function readOnchainMilestones(
  projectIdKey: string,
  contractAddress: string = DEFAULT_ESCROW_CONTRACT_ADDRESS,
  rpcUrl: string = DEFAULT_AMOY_RPC
) {
  try {
    const provider = new JsonRpcProvider(rpcUrl, { chainId: AMOY_CHAIN_ID, name: 'amoy' });
    const contract = new Contract(contractAddress, FUNDTRAIL_MILESTONE_ESCROW_ABI, provider);

    const count = await contract.getMilestonesCount(projectIdKey);
    const milestones = [];

    const statusMap = ['PENDING', 'SUBMITTED', 'APPROVED', 'REJECTED', 'RELEASED'] as const;

    for (let i = 0; i < Number(count); i++) {
      const m = await contract.getMilestone(projectIdKey, i);
      milestones.push({
        milestoneIndex: i,
        title: m.title,
        allocatedPol: Number(formatEther(m.allocatedAmount)),
        releasedPol: Number(formatEther(m.releasedAmount)),
        status: statusMap[Number(m.status)] || 'PENDING',
        ipfsCid: m.ipfsCid,
        evidenceHash: m.evidenceHash,
        submittedAt: Number(m.submittedAt) ? new Date(Number(m.submittedAt) * 1000).toISOString() : null,
        reviewedAt: Number(m.reviewedAt) ? new Date(Number(m.reviewedAt) * 1000).toISOString() : null,
        reviewReason: m.reviewReason
      });
    }

    return milestones;
  } catch (err) {
    console.warn('Read onchain milestones notice:', err);
    return [];
  }
}

// -------------------------------------------------------------
// Report Hash Anchoring Operations (Legacy/Snapshot anchors)
// -------------------------------------------------------------

export async function anchorReportOnChain(
  projectKey: string,
  reportHash: string,
  version: number,
  contractAddress: string = DEFAULT_ANCHOR_CONTRACT_ADDRESS
): Promise<{ txHash: string; publisher: string; blockNumber?: number }> {
  const signer = await getSignerAndEnsureAmoy();
  const address = await signer.getAddress();

  const contract = new Contract(contractAddress, REPORT_ANCHOR_ABI, signer);
  const tx = await contract.anchorReport(projectKey, reportHash, version);
  const receipt = await tx.wait();

  return {
    txHash: receipt.hash || tx.hash,
    publisher: address,
    blockNumber: receipt.blockNumber
  };
}

export async function readAnchoredHashFromChain(
  projectKey: string,
  version: number,
  contractAddress: string = DEFAULT_ANCHOR_CONTRACT_ADDRESS,
  rpcUrl: string = DEFAULT_AMOY_RPC
): Promise<string | null> {
  try {
    const provider = new JsonRpcProvider(rpcUrl, { chainId: AMOY_CHAIN_ID, name: 'amoy' });
    const contract = new Contract(contractAddress, REPORT_ANCHOR_ABI, provider);
    const hash: string = await contract.getReportHash(projectKey, version);
    if (!hash || hash === '0x0000000000000000000000000000000000000000000000000000000000000000') {
      return null;
    }
    return hash;
  } catch (err: any) {
    console.warn('RPC read error on Polygon Amoy:', err);
    throw err;
  }
}
