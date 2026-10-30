import { describe, it, expect, beforeAll } from 'vitest';
import { JsonRpcProvider, ContractFactory, Wallet, parseEther, keccak256, toUtf8Bytes, formatEther } from 'ethers';
import { FUNDTRAIL_MILESTONE_ESCROW_ABI, FUNDTRAIL_MILESTONE_ESCROW_BYTECODE } from '../src/features/blockchain/milestone-escrow-abi';

describe('FundTrailMilestoneEscrow - 15 Smart Contract Requirements', () => {
  const provider = new JsonRpcProvider('http://127.0.0.1:8545');

  // Hardhat standard test accounts (prefunded 10,000 ETH each)
  const deployer = new Wallet('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', provider);
  const ngo = new Wallet('0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d', provider);
  const verifier = new Wallet('0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a', provider);
  const donor1 = new Wallet('0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6', provider);
  const donor2 = new Wallet('0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a', provider);
  const unauthorizedUser = new Wallet('0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba', provider);

  const projectId = keccak256(toUtf8Bytes('demo-school-kit-support'));
  const targetAmount = parseEther('100'); // 100 POL
  const milestoneTitles = [
    'Purchase educational materials',
    'Distribution and logistics',
    'Final delivery and completion',
  ];
  const milestoneAllocations = [
    parseEther('40'),
    parseEther('35'),
    parseEther('25'),
  ];

  let escrowContractAddress: string;

  let isNodeAvailable = false;

  beforeAll(async () => {
    try {
      await provider.getBlockNumber();
      isNodeAvailable = true;
      // Deploy contract
      const factory = new ContractFactory(
        FUNDTRAIL_MILESTONE_ESCROW_ABI,
        FUNDTRAIL_MILESTONE_ESCROW_BYTECODE,
        deployer
      );
      const contract = await factory.deploy();
      await contract.waitForDeployment();
      escrowContractAddress = await contract.getAddress();
    } catch (e) {
      console.warn('Local Hardhat node is not running on 127.0.0.1:8545. Start with `npx hardhat node` to run live EVM tests.');
    }
  });

  const getContractFor = (wallet: Wallet) => {
    return new (wallet.provider as any).constructor !== undefined
      ? new (require('ethers').Contract)(escrowContractAddress, FUNDTRAIL_MILESTONE_ESCROW_ABI, wallet)
      : null;
  };

  it('1 & 2: NGO can create a project with valid milestones', async () => {
    if (!isNodeAvailable) return;
    const { Contract } = await import('ethers');
    const ngoContract = new Contract(escrowContractAddress, FUNDTRAIL_MILESTONE_ESCROW_ABI, ngo);

    const tx = await ngoContract.createProject(
      projectId,
      ngo.address,
      verifier.address,
      targetAmount,
      milestoneTitles,
      milestoneAllocations
    );
    const receipt = await tx.wait();
    expect(receipt.status).toBe(1);

    const project = await ngoContract.getProject(projectId);
    expect(project.ngoWallet.toLowerCase()).toBe(ngo.address.toLowerCase());
    expect(project.authorizedVerifier.toLowerCase()).toBe(verifier.address.toLowerCase());
    expect(project.targetAmount).toBe(targetAmount);
    expect(project.totalReceived).toBe(0n);
    expect(project.totalReleased).toBe(0n);

    const count = await ngoContract.getMilestonesCount(projectId);
    expect(count).toBe(3n);

    const m0 = await ngoContract.getMilestone(projectId, 0);
    expect(m0.title).toBe(milestoneTitles[0]);
    expect(m0.allocatedAmount).toBe(milestoneAllocations[0]);
    expect(Number(m0.status)).toBe(0); // PENDING
  });

  it('13: Invalid amount allocation reverts project creation', async () => {
    if (!isNodeAvailable) return;
    const { Contract } = await import('ethers');
    const ngoContract = new Contract(escrowContractAddress, FUNDTRAIL_MILESTONE_ESCROW_ABI, ngo);
    const otherProjectId = keccak256(toUtf8Bytes('invalid-alloc-project'));

    const invalidAllocations = [
      parseEther('40'),
      parseEther('30'), // Sum = 95 != 100
      parseEther('25'),
    ];

    await expect(
      ngoContract.createProject(
        otherProjectId,
        ngo.address,
        verifier.address,
        targetAmount,
        milestoneTitles,
        invalidAllocations
      )
    ).rejects.toThrow();
  });

  it('3 & 4: Donor can contribute testnet POL and update project funding', async () => {
    if (!isNodeAvailable) return;
    const { Contract } = await import('ethers');
    const donor1Contract = new Contract(escrowContractAddress, FUNDTRAIL_MILESTONE_ESCROW_ABI, donor1);
    const donor2Contract = new Contract(escrowContractAddress, FUNDTRAIL_MILESTONE_ESCROW_ABI, donor2);

    const contrib1 = parseEther('40');
    const contrib2 = parseEther('60');

    const tx1 = await donor1Contract.contribute(projectId, { value: contrib1 });
    await tx1.wait();

    const tx2 = await donor2Contract.contribute(projectId, { value: contrib2 });
    await tx2.wait();

    const project = await donor1Contract.getProject(projectId);
    expect(project.totalReceived).toBe(targetAmount);

    const d1Contribution = await donor1Contract.donorContributions(projectId, donor1.address);
    expect(d1Contribution).toBe(contrib1);

    const escrowBalance = await donor1Contract.getEscrowBalance(projectId);
    expect(escrowBalance).toBe(targetAmount);
  });

  it('5: NGO can submit evidence for a milestone', async () => {
    if (!isNodeAvailable) return;
    const { Contract } = await import('ethers');
    const ngoContract = new Contract(escrowContractAddress, FUNDTRAIL_MILESTONE_ESCROW_ABI, ngo);

    const testCid = 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi';
    const testHash = keccak256(toUtf8Bytes('canonical_evidence_sha256_jaipur_stationery'));

    const tx = await ngoContract.submitMilestoneEvidence(projectId, 0, testCid, testHash);
    await tx.wait();

    const m0 = await ngoContract.getMilestone(projectId, 0);
    expect(Number(m0.status)).toBe(1); // SUBMITTED
    expect(m0.ipfsCid).toBe(testCid);
    expect(m0.evidenceHash).toBe(testHash);
    expect(m0.submittedAt).toBeGreaterThan(0n);
  });

  it('6: Unauthorised wallet cannot submit evidence', async () => {
    if (!isNodeAvailable) return;
    const { Contract } = await import('ethers');
    const unauthContract = new Contract(escrowContractAddress, FUNDTRAIL_MILESTONE_ESCROW_ABI, unauthorizedUser);

    const testCid = 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi';
    const testHash = keccak256(toUtf8Bytes('tampered_manifest'));

    await expect(
      unauthContract.submitMilestoneEvidence(projectId, 1, testCid, testHash)
    ).rejects.toThrow();
  });

  it('7: NGO cannot approve its own milestone', async () => {
    if (!isNodeAvailable) return;
    const { Contract } = await import('ethers');
    const ngoContract = new Contract(escrowContractAddress, FUNDTRAIL_MILESTONE_ESCROW_ABI, ngo);

    await expect(
      ngoContract.verifyMilestone(projectId, 0, true, 'Self approval')
    ).rejects.toThrow();
  });

  it('9: Non-verifier cannot approve evidence', async () => {
    if (!isNodeAvailable) return;
    const { Contract } = await import('ethers');
    const unauthContract = new Contract(escrowContractAddress, FUNDTRAIL_MILESTONE_ESCROW_ABI, unauthorizedUser);

    await expect(
      unauthContract.verifyMilestone(projectId, 0, true, 'Unauthorized approval attempt')
    ).rejects.toThrow();
  });

  it('8: Authorised verifier can approve evidence', async () => {
    if (!isNodeAvailable) return;
    const { Contract } = await import('ethers');
    const verifierContract = new Contract(escrowContractAddress, FUNDTRAIL_MILESTONE_ESCROW_ABI, verifier);

    const reviewReason = 'Verified 60 school kits and vendor invoices on IPFS';
    const tx = await verifierContract.verifyMilestone(projectId, 0, true, reviewReason);
    await tx.wait();

    const m0 = await verifierContract.getMilestone(projectId, 0);
    expect(Number(m0.status)).toBe(2); // APPROVED
    expect(m0.reviewReason).toBe(reviewReason);
  });

  it('10: Funds cannot be released before milestone approval', async () => {
    if (!isNodeAvailable) return;
    const { Contract } = await import('ethers');
    const ngoContract = new Contract(escrowContractAddress, FUNDTRAIL_MILESTONE_ESCROW_ABI, ngo);

    // Milestone 1 is still PENDING
    await expect(
      ngoContract.releaseMilestoneFunds(projectId, 1)
    ).rejects.toThrow();
  });

  it('14 & 15: Correct amount reaches NGO and balances remain consistent', async () => {
    if (!isNodeAvailable) return;
    const { Contract } = await import('ethers');
    const ngoContract = new Contract(escrowContractAddress, FUNDTRAIL_MILESTONE_ESCROW_ABI, ngo);

    const balBefore = await provider.getBalance(ngo.address);

    const tx = await ngoContract.releaseMilestoneFunds(projectId, 0);
    const receipt = await tx.wait();
    const gasPrice: bigint = receipt?.gasPrice != null ? BigInt(receipt.gasPrice) : 0n;
    const gasSpent: bigint = receipt ? BigInt(receipt.gasUsed) * gasPrice : 0n;

    const balAfter = await provider.getBalance(ngo.address);
    expect(BigInt(balAfter) + gasSpent - BigInt(balBefore)).toBe(milestoneAllocations[0]); // Exactly 40 POL

    const m0 = await ngoContract.getMilestone(projectId, 0);
    expect(Number(m0.status)).toBe(4); // RELEASED
    expect(m0.releasedAmount).toBe(milestoneAllocations[0]);

    const project = await ngoContract.getProject(projectId);
    expect(project.totalReleased).toBe(milestoneAllocations[0]);

    const escrowBal = await ngoContract.getEscrowBalance(projectId);
    expect(escrowBal).toBe(parseEther('60')); // 100 - 40 = 60 POL
  });

  it('12: Released milestone cannot be released again', async () => {
    if (!isNodeAvailable) return;
    const { Contract } = await import('ethers');
    const ngoContract = new Contract(escrowContractAddress, FUNDTRAIL_MILESTONE_ESCROW_ABI, ngo);

    await expect(
      ngoContract.releaseMilestoneFunds(projectId, 0)
    ).rejects.toThrow();
  });

  it('11: Insufficient escrow prevents release', async () => {
    if (!isNodeAvailable) return;
    const { Contract } = await import('ethers');
    const emptyProjectId = keccak256(toUtf8Bytes('project-with-zero-balance'));
    const ngoContract = new Contract(escrowContractAddress, FUNDTRAIL_MILESTONE_ESCROW_ABI, ngo);
    const verifierContract = new Contract(escrowContractAddress, FUNDTRAIL_MILESTONE_ESCROW_ABI, verifier);

    // Create empty project (0 POL contributed)
    await (await ngoContract.createProject(
      emptyProjectId,
      ngo.address,
      verifier.address,
      parseEther('10'),
      ['Test Milestone'],
      [parseEther('10')]
    )).wait();

    // Submit and approve
    const testCid = 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi';
    const testHash = keccak256(toUtf8Bytes('manifest'));
    await (await ngoContract.submitMilestoneEvidence(emptyProjectId, 0, testCid, testHash)).wait();
    await (await verifierContract.verifyMilestone(emptyProjectId, 0, true, 'Approved')).wait();

    // Try releasing when escrow has 0 POL
    await expect(
      ngoContract.releaseMilestoneFunds(emptyProjectId, 0)
    ).rejects.toThrow();
  });
});
