import { BrowserProvider, Contract, JsonRpcProvider } from 'ethers';
import { REPORT_ANCHOR_ABI } from '../features/blockchain/contract-abi';

export const AMOY_CHAIN_ID = 80002;
export const AMOY_CHAIN_ID_HEX = '0x13882';
export const DEFAULT_AMOY_RPC = 'https://polygon-amoy.drpc.org';
export const DEFAULT_AMOY_EXPLORER = 'https://amoy.polygonscan.com';
export const DEFAULT_CONTRACT_ADDRESS = import.meta.env.VITE_REPORT_ANCHOR_CONTRACT_ADDRESS || '0x4e6b12f7178a9c29fbf80838971fce8d5c7f8f90';

// Config parameter for Polygon Amoy network addition in MetaMask
export const AMOY_NETWORK_PARAMS = {
  chainId: AMOY_CHAIN_ID_HEX,
  chainName: 'Polygon Amoy Testnet',
  nativeCurrency: {
    name: 'POL',
    symbol: 'POL',
    decimals: 18
  },
  rpcUrls: [DEFAULT_AMOY_RPC, 'https://rpc-amoy.polygon.technology'],
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
 * Check if MetaMask / web3 provider is installed
 */
export function isMetaMaskInstalled(): boolean {
  return typeof window !== 'undefined' && Boolean((window as any).ethereum);
}

/**
 * Request account connection to MetaMask
 */
export async function connectWallet(): Promise<{ address: string; chainId: number }> {
  if (!isMetaMaskInstalled()) {
    throw new Error('MetaMask is not installed. Please install MetaMask to anchor reports on Polygon Amoy.');
  }

  const ethereum = (window as any).ethereum;
  const accounts: string[] = await ethereum.request({ method: 'eth_requestAccounts' });
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
  if (!isMetaMaskInstalled()) {
    throw new Error('MetaMask is not installed.');
  }

  const ethereum = (window as any).ethereum;
  try {
    await ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: AMOY_CHAIN_ID_HEX }]
    });
  } catch (switchError: any) {
    // Error code 4902 indicates chain is not added to MetaMask yet
    if (switchError.code === 4902 || switchError?.message?.includes('Unrecognized chain')) {
      await ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [AMOY_NETWORK_PARAMS]
      });
    } else {
      throw switchError;
    }
  }
}

/**
 * Anchor report fingerprint onto Polygon Amoy smart contract via user's MetaMask
 */
export async function anchorReportOnChain(
  projectKey: string,
  reportHash: string,
  version: number,
  contractAddress: string = DEFAULT_CONTRACT_ADDRESS
): Promise<{ txHash: string; publisher: string; blockNumber?: number }> {
  if (!isMetaMaskInstalled()) {
    throw new Error('MetaMask is not installed.');
  }

  const ethereum = (window as any).ethereum;
  const provider = new BrowserProvider(ethereum);
  const signer = await provider.getSigner();
  const address = await signer.getAddress();

  const network = await provider.getNetwork();
  if (Number(network.chainId) !== AMOY_CHAIN_ID) {
    await switchToPolygonAmoy();
  }

  const contract = new Contract(contractAddress, REPORT_ANCHOR_ABI, signer);
  const tx = await contract.anchorReport(projectKey, reportHash, version);
  const receipt = await tx.wait();

  return {
    txHash: receipt.hash || tx.hash,
    publisher: address,
    blockNumber: receipt.blockNumber
  };
}

/**
 * Public read-only check: reads anchored report hash from Amoy via public RPC (NO WALLET NEEDED)
 */
export async function readAnchoredHashFromChain(
  projectKey: string,
  version: number,
  contractAddress: string = DEFAULT_CONTRACT_ADDRESS,
  rpcUrl: string = DEFAULT_AMOY_RPC
): Promise<string | null> {
  try {
    const provider = new JsonRpcProvider(rpcUrl, {
      chainId: AMOY_CHAIN_ID,
      name: 'amoy'
    });
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

