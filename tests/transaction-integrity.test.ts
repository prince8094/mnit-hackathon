import { describe, it, expect } from 'vitest';
import { 
  classifyTransaction, 
  isSyntheticOrDemoHash, 
  getAmoyExplorerTxUrl, 
  KNOWN_UNRELATED_OR_DEMO_HASHES 
} from '../src/lib/blockchain';
import { store } from '../src/lib/store';

describe('Transaction Integrity & Anti-Misattribution Guard', () => {
  it('correctly identifies and flags synthetic placeholder hashes as demo/unmined', () => {
    const syntheticReleaseHash = '0x8f7e6d5c4b3a2918273645e5d4c3b2a1f0e9d8c7b6a5e4d3c2b1a0f9e8d7c6b5';
    const syntheticContributionHash = '0x99a3b2c1d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1';
    
    expect(isSyntheticOrDemoHash(syntheticReleaseHash)).toBe(true);
    expect(isSyntheticOrDemoHash(syntheticContributionHash)).toBe(true);

    const classified = classifyTransaction(syntheticReleaseHash);
    expect(classified.isVerifiedOnchain).toBe(false);
    expect(classified.isDemo).toBe(true);
    expect(classified.explorerUrl).toBeNull();
    expect(getAmoyExplorerTxUrl(syntheticReleaseHash)).toBe('#');
  });

  it('strictly blocks unrelated micropayment wallet transfers from masquerading as verified escrow operations', () => {
    // These 4 hashes were simple 0.0001 POL wallet transfers previously misattributed to escrow operations
    const unrelatedReleaseTx = '0xcd8cabca0067bdadb14657de318948eb3cf3a97bee9b0bd2f51f6138c9e4ca6b';
    const unrelatedContrib1Tx = '0x620c75a552e693404b527aa5db824202d2d5b2916a750cd1617dba105b73684f';
    const unrelatedContrib2Tx = '0x7425df0f820cf075dd83044f53afee837f4df44ed943430d3a5fc662360be11e';
    const unrelatedVerifyTx = '0xb217b4299fdd598c7c880e5db2a0682dbfe653f4938e694fd31ad8830a9f0809';

    expect(isSyntheticOrDemoHash(unrelatedReleaseTx)).toBe(true);
    expect(isSyntheticOrDemoHash(unrelatedContrib1Tx)).toBe(true);
    expect(isSyntheticOrDemoHash(unrelatedContrib2Tx)).toBe(true);
    expect(isSyntheticOrDemoHash(unrelatedVerifyTx)).toBe(true);

    const classRelease = classifyTransaction(unrelatedReleaseTx);
    expect(classRelease.isVerifiedOnchain).toBe(false);
    expect(classRelease.isDemo).toBe(true);
    expect(classRelease.explorerUrl).toBeNull();

    const classContrib = classifyTransaction(unrelatedContrib1Tx);
    expect(classContrib.isVerifiedOnchain).toBe(false);
    expect(classContrib.isDemo).toBe(true);
    expect(classContrib.explorerUrl).toBeNull();
  });

  it('preserves the genuine ReportAnchor smart contract transaction on Polygon Amoy', () => {
    const genuineAnchorTx = '0x8e82ae53cba3c48347a6f54720903518f7076cceffe24bd458961552a1502a3b';
    
    expect(isSyntheticOrDemoHash(genuineAnchorTx)).toBe(false);

    const classified = classifyTransaction(genuineAnchorTx);
    expect(classified.isVerifiedOnchain).toBe(true);
    expect(classified.status).toBe('VERIFIED_ONCHAIN');
    expect(classified.explorerUrl).toBe(`https://amoy.polygonscan.com/tx/${genuineAnchorTx}`);
    expect(getAmoyExplorerTxUrl(genuineAnchorTx)).toBe(`https://amoy.polygonscan.com/tx/${genuineAnchorTx}`);
  });

  it('marks historical synthetic seed records as DEMO_SIMULATED in store', () => {
    const milestones = store.getMilestones('11111111-1111-1111-1111-111111111111');
    const releasedMilestone = milestones.find((m) => m.status === 'RELEASED');
    
    expect(releasedMilestone).toBeDefined();
    expect(releasedMilestone?.tx_status).toBe('DEMO_SIMULATED');
    expect(releasedMilestone?.release_tx_hash).toBeNull();

    const contributions = store.getOnchainContributions('11111111-1111-1111-1111-111111111111');
    for (const c of contributions) {
      expect(c.tx_status).toBe('DEMO_SIMULATED');
      expect(c.tx_hash).toBeNull();
    }
  });

  it('permits genuine, newly mined on-chain escrow transactions to be verified', () => {
    const genuineNewTx = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    
    expect(isSyntheticOrDemoHash(genuineNewTx)).toBe(false);
    const classified = classifyTransaction(genuineNewTx);
    expect(classified.isVerifiedOnchain).toBe(true);
    expect(classified.explorerUrl).toBe(`https://amoy.polygonscan.com/tx/${genuineNewTx}`);
  });
});

