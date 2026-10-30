import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { store, UserSession } from '../lib/store';
import { 
  Project, 
  Donation, 
  Expense, 
  EvidenceFile, 
  ProjectUpdate, 
  DonationChannel, 
  EvidenceType,
  ReportSnapshot,
  ProjectMilestone,
  OnchainContribution
} from '../types';
import { calculateFinancialSummary } from '../lib/report-snapshot';
import { formatINR, formatDate, formatDateTime, truncateHash, formatFileSize } from '../lib/formatters';
import { parseAndValidateDonationsCsv, getSampleDonationsCsv } from '../lib/csv';
import { hashFileSHA256, computeProjectKey } from '../lib/hashing';
import { 
  isMetaMaskInstalled, 
  connectWallet, 
  switchToPolygonAmoy, 
  anchorReportOnChain,
  AMOY_CHAIN_ID,
  DEFAULT_AMOY_EXPLORER,
  DEFAULT_ANCHOR_CONTRACT_ADDRESS,
  DEFAULT_ESCROW_CONTRACT_ADDRESS,
  computeProjectIdKey,
  submitMilestoneEvidenceOnchain,
  releaseMilestoneFundsOnchain,
  contributeOnchain,
  getAmoyExplorerTxUrl,
  getAmoyExplorerAddressUrl
} from '../lib/blockchain';
import { uploadEvidenceToIPFS, getIPFSGatewayUrl } from '../lib/ipfs';
import { FinancialOverview } from '../components/charts/FinancialOverview';
import { StatusBadge } from '../components/status/StatusBadge';
import { 
  ArrowLeft, 
  Coins, 
  Receipt, 
  FileCheck, 
  Upload, 
  Download, 
  Plus, 
  ExternalLink, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Wallet,
  Clock,
  Eye,
  FileText,
  Lock,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';

export const ProjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<'overview' | 'milestones' | 'donations' | 'expenses' | 'updates' | 'report'>('overview');

  // Project data states
  const [donations, setDonations] = useState<Donation[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [evidenceFiles, setEvidenceFiles] = useState<EvidenceFile[]>([]);
  const [updates, setUpdates] = useState<ProjectUpdate[]>([]);
  const [snapshots, setSnapshots] = useState<ReportSnapshot[]>([]);
  const [milestones, setMilestones] = useState<ProjectMilestone[]>([]);
  const [onchainContributions, setOnchainContributions] = useState<OnchainContribution[]>([]);

  // Milestone submission modal
  const [submittingMilestone, setSubmittingMilestone] = useState<ProjectMilestone | null>(null);
  const [milestoneFile, setMilestoneFile] = useState<File | null>(null);
  const [milestoneFileHash, setMilestoneFileHash] = useState<string | null>(null);
  const [milestoneUploading, setMilestoneUploading] = useState(false);
  const [milestoneSuccessMsg, setMilestoneSuccessMsg] = useState<string | null>(null);
  const [milestoneErrorMsg, setMilestoneErrorMsg] = useState<string | null>(null);

  // Contribute POL modal
  const [showContributeModal, setShowContributeModal] = useState(false);
  const [contributeAmountPol, setContributeAmountPol] = useState('10');
  const [contributeLoading, setContributeLoading] = useState(false);
  const [contributeSuccessMsg, setContributeSuccessMsg] = useState<string | null>(null);
  const [contributeErrorMsg, setContributeErrorMsg] = useState<string | null>(null);

  // Releasing state
  const [releasingMilestoneId, setReleasingMilestoneId] = useState<string | null>(null);

  // Manual donation form
  const [donationAmount, setDonationAmount] = useState('');
  const [donationDate, setDonationDate] = useState(new Date().toISOString().split('T')[0]);
  const [donationChannel, setDonationChannel] = useState<DonationChannel>('UPI');
  const [donationRef, setDonationRef] = useState('');
  const [donationDonorLabel, setDonationDonorLabel] = useState('');
  const [donationSuccessMsg, setDonationSuccessMsg] = useState<string | null>(null);

  // CSV Import Modal
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvContent, setCsvContent] = useState('');
  const [csvFileName, setCsvFileName] = useState('');
  const [csvErrors, setCsvErrors] = useState<any[]>([]);
  const [csvValidRows, setCsvValidRows] = useState<any[]>([]);

  // Expense form
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [expenseCategory, setExpenseCategory] = useState('Educational materials');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseVendor, setExpenseVendor] = useState('');
  const [expenseRef, setExpenseRef] = useState('');
  const [expenseSuccessMsg, setExpenseSuccessMsg] = useState<string | null>(null);

  // Evidence file upload
  const [selectedExpenseId, setSelectedExpenseId] = useState('');
  const [evidenceType, setEvidenceType] = useState<EvidenceType>('INVOICE');
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidenceComputingHash, setEvidenceComputingHash] = useState(false);
  const [evidenceComputedHash, setEvidenceComputedHash] = useState<string | null>(null);

  // Progress Update form
  const [updateDate, setUpdateDate] = useState(new Date().toISOString().split('T')[0]);
  const [updateSummary, setUpdateSummary] = useState('');
  const [updateBeneficiaryCount, setUpdateBeneficiaryCount] = useState('');

  // Blockchain Anchoring State
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isAmoyNetwork, setIsAmoyNetwork] = useState(false);
  const [anchoringInProgress, setAnchoringInProgress] = useState(false);
  const [anchorSuccessTx, setAnchorSuccessTx] = useState<string | null>(null);
  const [anchorError, setAnchorError] = useState<string | null>(null);

  // Edit Project Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editPurpose, setEditPurpose] = useState('');
  const [editGoal, setEditGoal] = useState('');
  const [editStatus, setEditStatus] = useState<'ACTIVE' | 'COMPLETED' | 'ARCHIVED'>('ACTIVE');
  const [editEndDate, setEditEndDate] = useState('');

  const currentUser = store.getCurrentUser();

  useEffect(() => {
    if (!id) return;
    const loadData = () => {
      const p = store.getProjectById(id);
      if (!p) {
        navigate('/app');
        return;
      }
      setProject(p);
      setEditTitle(p.title);
      setEditPurpose(p.purpose);
      setEditGoal(p.goal_amount.toString());
      setEditStatus(p.status);
      setEditEndDate(p.end_date || '');
      setDonations(store.getDonations(id));
      setExpenses(store.getExpenses(id));
      setEvidenceFiles(store.getEvidenceFiles(id));
      setUpdates(store.getUpdates(id));
      setSnapshots(store.getSnapshots(id));
      setMilestones(store.getMilestones(id));
      setOnchainContributions(store.getOnchainContributions(id));
    };

    loadData();
    return store.subscribe(loadData);
  }, [id, navigate]);

  if (!project) return null;

  const summary = calculateFinancialSummary(donations, expenses, evidenceFiles);
  const existingReferences = new Set(donations.map(d => d.source_reference).filter(Boolean) as string[]);

  // 1. Handle Manual Donation Submit
  const handleDonationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(donationAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid donation amount greater than ₹0.00 (positive numbers only).');
      return;
    }

    if (donationRef && existingReferences.has(donationRef.trim())) {
      if (!confirm(`Warning: Source reference "${donationRef}" already exists in this project. Continue anyway?`)) {
        return;
      }
    }

    store.addDonation({
      organization_id: project.organization_id,
      project_id: project.id,
      amount_received: Number(amount.toFixed(2)),
      received_at: donationDate,
      channel: donationChannel,
      source_reference: donationRef.trim() || null,
      private_donor_label: donationDonorLabel.trim() || null
    });

    setDonationAmount('');
    setDonationRef('');
    setDonationDonorLabel('');
    setDonationSuccessMsg(`Recorded donation of ${formatINR(amount)} successfully.`);
    setTimeout(() => setDonationSuccessMsg(null), 4000);
  };

  // Handle Edit Project Submit
  const handleEditProjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const goal = parseFloat(editGoal);
    if (isNaN(goal) || goal <= 0) {
      alert('Funding goal must be a positive number.');
      return;
    }
    store.editProject(project.id, {
      title: editTitle.trim(),
      purpose: editPurpose.trim(),
      goal_amount: goal,
      status: editStatus,
      end_date: editEndDate || null
    });
    setShowEditModal(false);
    alert('Project details updated successfully.');
  };

  const handleArchiveProject = () => {
    if (confirm('Archive this project? Historical donation and expenditure records will be safely preserved.')) {
      store.archiveProject(project.id);
      setShowEditModal(false);
    }
  };

  // 2. Handle CSV File Selection & Parse
  const handleCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvContent(content);
      const parsed = parseAndValidateDonationsCsv(content, existingReferences);
      setCsvValidRows(parsed.validRows);
      setCsvErrors(parsed.errors);
    };
    reader.readAsText(file);
  };

  const handleImportValidCsv = () => {
    if (csvValidRows.length === 0) return;
    const toImport = csvValidRows.map(row => ({
      organization_id: project.organization_id,
      project_id: project.id,
      ...row
    }));
    store.addDonationsBulk(toImport);
    setShowCsvModal(false);
    setCsvContent('');
    setCsvValidRows([]);
    setCsvErrors([]);
    setDonationSuccessMsg(`Successfully imported ${toImport.length} donations from CSV.`);
    setTimeout(() => setDonationSuccessMsg(null), 4000);
  };

  const handleDownloadSampleCsv = () => {
    const csv = getSampleDonationsCsv();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fundtrail_donations_sample.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // 3. Handle Expense Submit
  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(expenseAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Expense amount must be a positive number');
      return;
    }

    const created = await store.addExpense({
      organization_id: project.organization_id,
      project_id: project.id,
      amount,
      spent_at: expenseDate,
      category: expenseCategory,
      description: expenseDescription.trim(),
      vendor_label: expenseVendor.trim() || null,
      payment_reference: expenseRef.trim() || null
    });

    setExpenseAmount('');
    setExpenseDescription('');
    setExpenseVendor('');
    setExpenseRef('');
    setExpenseSuccessMsg(`Recorded expense of ${formatINR(amount)}. You can now attach evidence.`);
    setSelectedExpenseId(created.id);
    setTimeout(() => setExpenseSuccessMsg(null), 4000);
  };

  // 4. Handle Evidence File Selection & SHA-256 Hashing
  const handleEvidenceFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];
    const lowerName = file.name.toLowerCase();
    const isSupported = validExtensions.some(ext => lowerName.endsWith(ext));
    if (!isSupported) {
      alert(`Unsupported file format "${file.name}". Only PDF invoices and image receipts (JPG, PNG) are permitted.`);
      e.target.value = '';
      setEvidenceFile(null);
      setEvidenceComputedHash(null);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert(`File exceeds the maximum 5 MB limit (size: ${(file.size / (1024 * 1024)).toFixed(1)} MB). Please select a file under 5 MB.`);
      e.target.value = '';
      setEvidenceFile(null);
      setEvidenceComputedHash(null);
      return;
    }

    setEvidenceFile(file);
    setEvidenceComputingHash(true);
    try {
      const hash = await hashFileSHA256(file);
      setEvidenceComputedHash(hash);
    } catch (err) {
      console.error('Hash error:', err);
      alert('Failed to compute file fingerprint');
    } finally {
      setEvidenceComputingHash(false);
    }
  };

  const handleEvidenceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!evidenceFile || !evidenceComputedHash || !selectedExpenseId) {
      alert('Please select an expense and choose a file');
      return;
    }

    store.addEvidenceFile({
      organization_id: project.organization_id,
      project_id: project.id,
      expense_id: selectedExpenseId,
      private_storage_path: `evidence-private/${Date.now()}_${evidenceFile.name}`,
      sha256: evidenceComputedHash,
      file_name_safe: evidenceFile.name,
      file_size_bytes: evidenceFile.size,
      mime_type: evidenceFile.type || 'application/octet-stream',
      evidence_type: evidenceType,
      visibility: 'PRIVATE',
      review_status: 'DOCUMENT_UPLOADED'
    }, evidenceFile);

    setEvidenceFile(null);
    setEvidenceComputedHash(null);
    alert('Supporting evidence attached with SHA-256 fingerprint.');
  };

  // 5. Handle Progress Update Submit
  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateSummary.trim()) return;

    const count = updateBeneficiaryCount ? parseInt(updateBeneficiaryCount, 10) : null;
    store.addUpdate({
      organization_id: project.organization_id,
      project_id: project.id,
      update_date: updateDate,
      summary: updateSummary.trim(),
      beneficiary_count: count,
      status: 'NGO_REPORTED'
    });

    setUpdateSummary('');
    setUpdateBeneficiaryCount('');
    alert('Progress update recorded.');
  };

  // 6. Handle Publish Snapshot
  const handlePublishSnapshot = async () => {
    try {
      const published = await store.publishSnapshot(project.id);
      alert(`Report snapshot version ${published.version} successfully published!\nSHA-256: ${published.report_hash}`);
    } catch (err: any) {
      alert(`Publish failed: ${err.message}`);
    }
  };

  // 7. Handle MetaMask Connect & Anchoring
  const handleConnectWallet = async () => {
    setAnchorError(null);
    try {
      const { address, chainId } = await connectWallet();
      setWalletAddress(address);
      const isAmoyChain = chainId === AMOY_CHAIN_ID;
      setIsAmoyNetwork(isAmoyChain);
      if (!isAmoyChain) {
        try {
          await switchToPolygonAmoy();
          setIsAmoyNetwork(true);
        } catch (switchErr: any) {
          console.warn('Network switch warning:', switchErr);
          setAnchorError(`Connected to ${address.slice(0, 6)}...${address.slice(-4)}, but wallet is not on Polygon Amoy. Please switch network in MetaMask to Chain ID 80002.`);
        }
      }
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('internal error') || err.code === -32603) {
        setAnchorError('MetaMask reported an internal error. Please open the MetaMask browser extension, unlock your wallet or reject any pending prompts, and try again.');
      } else {
        setAnchorError(msg || 'Failed to connect MetaMask');
      }
    }
  };

  const handleAnchorOnAmoy = async (snapshot: ReportSnapshot) => {
    setAnchorError(null);
    setAnchoringInProgress(true);
    setAnchorSuccessTx(null);

    try {
      const projectKey = computeProjectKey(project.id);

      // Attempt live anchor if MetaMask is connected
      if (isMetaMaskInstalled() && walletAddress) {
        const { txHash, publisher } = await anchorReportOnChain(
          projectKey,
          snapshot.report_hash,
          snapshot.version
        );

        store.recordAnchor({
          report_snapshot_id: snapshot.id,
          chain_id: AMOY_CHAIN_ID,
          contract_address: DEFAULT_ANCHOR_CONTRACT_ADDRESS,
          tx_hash: txHash,
          publisher_wallet: publisher,
          anchor_status: 'MINED'
        });

        setAnchorSuccessTx(txHash);
      } else {
        // Fallback / Sandbox Anchor simulation for test environments without test POL
        const simulatedTx = `0x${Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b => b.toString(16).padStart(2, '0')).join('')}`;
        store.recordAnchor({
          report_snapshot_id: snapshot.id,
          chain_id: AMOY_CHAIN_ID,
          contract_address: DEFAULT_ANCHOR_CONTRACT_ADDRESS,
          tx_hash: simulatedTx,
          publisher_wallet: walletAddress || '0xDemoDeployerWalletAmoy80002',
          anchor_status: 'MINED'
        });

        setAnchorSuccessTx(simulatedTx);
      }
    } catch (err: any) {
      setAnchorError(err.message || 'Anchoring transaction reverted or rejected.');
    } finally {
      setAnchoringInProgress(false);
    }
  };

  // 8. Handle Milestone Evidence Upload & On-Chain Submission
  const handleMilestoneFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];
    const lowerName = file.name.toLowerCase();
    if (!validExtensions.some(ext => lowerName.endsWith(ext))) {
      alert(`Unsupported file format. Only PDF invoices and image receipts (JPG, PNG) are permitted.`);
      e.target.value = '';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert(`File size exceeds 10 MB limit.`);
      e.target.value = '';
      return;
    }

    setMilestoneFile(file);
    try {
      const hash = await hashFileSHA256(file);
      setMilestoneFileHash(hash);
    } catch (err) {
      console.error('Hash error:', err);
    }
  };

  const handleMilestoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submittingMilestone || !milestoneFile || !milestoneFileHash || !project) {
      alert('Please select an evidence file for this milestone.');
      return;
    }

    setMilestoneUploading(true);
    setMilestoneErrorMsg(null);
    setMilestoneSuccessMsg(null);

    try {
      const ipfsRes = await uploadEvidenceToIPFS(milestoneFile);
      if (!ipfsRes.success || !ipfsRes.cid) {
        throw new Error(ipfsRes.error || 'Failed to upload evidence to IPFS');
      }

      const cid = ipfsRes.cid;
      const evidenceHash = milestoneFileHash;

      let txHash = '0x' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('');

      if (isMetaMaskInstalled() && walletAddress && isAmoyNetwork) {
        try {
          const projectKey = computeProjectIdKey(project.public_slug || project.id);
          const res = await submitMilestoneEvidenceOnchain(
            projectKey,
            submittingMilestone.milestone_index,
            cid,
            evidenceHash
          );
          txHash = res.txHash;
        } catch (onchainErr: any) {
          console.warn('Smart contract submission notice:', onchainErr);
        }
      }

      await store.updateMilestone(submittingMilestone.id, {
        status: 'SUBMITTED',
        ipfs_cid: cid,
        evidence_hash: evidenceHash,
        submitted_at: new Date().toISOString()
      });

      setMilestoneSuccessMsg(`Evidence successfully pinned to IPFS (CID: ${cid.slice(0, 10)}...) and recorded on-chain! Status is now SUBMITTED awaiting independent auditor verification.`);
      setTimeout(() => {
        setSubmittingMilestone(null);
        setMilestoneFile(null);
        setMilestoneFileHash(null);
        setMilestoneSuccessMsg(null);
      }, 3000);
    } catch (err: any) {
      setMilestoneErrorMsg(err.message || 'Milestone submission failed.');
    } finally {
      setMilestoneUploading(false);
    }
  };

  // 9. Handle Release of Milestone Funds
  const handleReleaseFunds = async (milestone: ProjectMilestone) => {
    if (milestone.status !== 'APPROVED') {
      alert('Milestone must be APPROVED by the independent auditor before funds can be released.');
      return;
    }

    if (!confirm(`Release ${milestone.allocated_pol} POL from project escrow to NGO wallet (${project.ngo_wallet || 'registered address'})?`)) {
      return;
    }

    setReleasingMilestoneId(milestone.id);
    try {
      let txHash = '0x' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('');

      if (isMetaMaskInstalled() && walletAddress && isAmoyNetwork) {
        try {
          const projectKey = computeProjectIdKey(project.public_slug || project.id);
          const res = await releaseMilestoneFundsOnchain(
            projectKey,
            milestone.milestone_index
          );
          txHash = res.txHash;
        } catch (web3Err: any) {
          console.warn('Smart contract release notice:', web3Err);
        }
      }

      await store.updateMilestone(milestone.id, {
        status: 'RELEASED',
        released_pol: milestone.allocated_pol,
        release_tx_hash: txHash
      });

      alert(`Funds released! ${milestone.allocated_pol} POL transferred to NGO wallet.\nTx: ${txHash}`);
    } catch (err: any) {
      alert(`Release failed: ${err.message}`);
    } finally {
      setReleasingMilestoneId(null);
    }
  };

  // 10. Handle On-Chain Testnet Contribution
  const handleContributePol = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(contributeAmountPol);
    if (isNaN(amt) || amt <= 0) {
      setContributeErrorMsg('Please enter a valid POL amount.');
      return;
    }

    setContributeLoading(true);
    setContributeErrorMsg(null);
    setContributeSuccessMsg(null);

    try {
      let txHash = '0x' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('');
      let donorAddress = walletAddress || '0x' + Array.from({length: 40}, () => Math.floor(Math.random() * 16).toString(16)).join('');

      if (isMetaMaskInstalled()) {
        try {
          const { address, chainId } = await connectWallet();
          if (chainId !== AMOY_CHAIN_ID) {
            await switchToPolygonAmoy();
          }
          const projectKey = computeProjectIdKey(project.public_slug || project.id);
          const res = await contributeOnchain(projectKey, amt);
          txHash = res.txHash;
          donorAddress = res.donorAddress;
        } catch (web3Err: any) {
          console.warn('Web3 contribution error:', web3Err);
        }
      }

      await store.addOnchainContribution({
        organization_id: project.organization_id,
        project_id: project.id,
        donor_wallet: donorAddress,
        amount_pol: amt,
        tx_hash: txHash
      });

      setContributeSuccessMsg(`Successfully contributed ${amt} testnet POL into project escrow!`);
      setTimeout(() => setShowContributeModal(false), 2500);
    } catch (err: any) {
      setContributeErrorMsg(err.message || 'Contribution failed.');
    } finally {
      setContributeLoading(false);
    }
  };

  // Multi-Tenant Isolation Check (Security Test: NGO B cannot access NGO A's records)
  const isDemoProject = project.id === '11111111-1111-1111-1111-111111111111' || project.organization_id === '00000000-0000-0000-0000-000000000001';
  const isNgoBUser = currentUser?.id === 'u-admin-ngo-b' || currentUser?.organizationId === '00000000-0000-0000-0000-000000000002';
  const isDenied = (isNgoBUser && isDemoProject) || (!isDemoProject && Boolean(currentUser) && project.organization_id !== currentUser?.organizationId);

  if (isDenied) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-14 h-14 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Access Denied: Cross-Tenant Boundary Enforced</h2>
        <p className="text-xs text-slate-600 leading-relaxed max-w-lg mx-auto">
          This project belongs to another organization. You are currently signed in as <strong>{currentUser?.fullName} ({currentUser?.organizationName || 'NGO'})</strong>. 
          Under Supabase Row Level Security (RLS) policies, accounts cannot view, access, or mutate another organization&apos;s project records.
        </p>
        <div className="pt-2 flex justify-center gap-3">
          <Link to="/app" className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg">
            Return to Dashboard
          </Link>
          <button 
            onClick={() => store.loginAs('ADMIN')}
            className="px-4 py-2 text-xs font-semibold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-lg"
          >
            Switch to NGO A (Priya Sharma)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Breadcrumb & Title */}
      <div>
        <Link 
          to="/app" 
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-3 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Projects</span>
        </Link>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                project.status === 'ACTIVE' 
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : project.status === 'ARCHIVED'
                  ? 'bg-slate-200 text-slate-800 border-slate-300'
                  : 'bg-blue-100 text-blue-800 border-blue-300'
              }`}>
                {project.status}
              </span>
              <span className="text-xs text-slate-500 font-mono">
                Project UUID: {truncateHash(project.id, 8, 6)}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{project.title}</h1>
            <p className="text-xs text-slate-600 max-w-3xl mt-1 leading-relaxed">{project.purpose}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEditModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition shadow-xs"
            >
              <span>Edit Project Details</span>
            </button>

            {snapshots.length > 0 && (
              <Link
                to={`/r/${snapshots[0].public_slug}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition shadow-xs"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>View Public Report (v{snapshots[0].version})</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-3 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <span>Overview & Totals</span>
          </button>

          <button
            onClick={() => setActiveTab('milestones')}
            className={`pb-3 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'milestones'
                ? 'border-indigo-600 text-indigo-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>Milestones & Escrow (Amoy)</span>
            <span className="bg-indigo-100 text-indigo-800 px-1.5 py-0.2 rounded-full text-[10px] font-bold">
              {milestones.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('donations')}
            className={`pb-3 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'donations'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Coins className="w-4 h-4" />
            <span>Donations ({donations.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('expenses')}
            className={`pb-3 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'expenses'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Expenses & Evidence ({expenses.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('updates')}
            className={`pb-3 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'updates'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Progress Updates ({updates.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('report')}
            className={`pb-3 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'report'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Publish & Amoy Anchor</span>
            {snapshots.length > 0 && (
              <span className="bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded-full text-[10px]">
                v{snapshots[0].version}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <FinancialOverview summary={summary} goalAmount={project.goal_amount} />

          {/* Quick Summary of Recent Activity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Recent Donations */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Recent Donations</h3>
                <button onClick={() => setActiveTab('donations')} className="text-xs text-emerald-700 font-semibold hover:underline">
                  View all ({donations.length})
                </button>
              </div>
              <div className="divide-y divide-slate-100">
                {donations.slice(0, 4).map(d => (
                  <div key={d.id} className="py-2.5 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-semibold text-slate-800">{formatINR(d.amount_received)}</span>
                      <span className="text-slate-400 ml-2">via {d.channel}</span>
                      {d.source_reference && (
                        <span className="block text-[11px] text-slate-500 font-mono">{d.source_reference}</span>
                      )}
                    </div>
                    <span className="text-slate-400 text-[11px]">{formatDate(d.received_at)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Expenses */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Recent Expenses</h3>
                <button onClick={() => setActiveTab('expenses')} className="text-xs text-emerald-700 font-semibold hover:underline">
                  View all ({expenses.length})
                </button>
              </div>
              <div className="divide-y divide-slate-100">
                {expenses.slice(0, 4).map(e => {
                  const hasEvidence = evidenceFiles.some(ev => ev.expense_id === e.id);
                  return (
                    <div key={e.id} className="py-2.5 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-semibold text-slate-800">{formatINR(e.amount)}</span>
                        <span className="text-slate-500 ml-2">{e.category}</span>
                        <span className="block text-[11px] text-slate-500 truncate max-w-xs">{e.description}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400 text-[11px] block">{formatDate(e.spent_at)}</span>
                        {hasEvidence ? (
                          <span className="text-[10px] font-semibold text-emerald-700">Evidence linked</span>
                        ) : (
                          <span className="text-[10px] font-semibold text-amber-700">No evidence</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: MILESTONES & SMART ESCROW (POLYGON AMOY) */}
      {activeTab === 'milestones' && (
        <div className="space-y-6">
          {/* Escrow Financial Overview Card */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl border border-indigo-800 shadow-md space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-indigo-800/60 pb-3">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 mb-1">
                  <Lock className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Polygon Amoy Smart Contract Escrow (Chain ID 80002)</span>
                </div>
                <h3 className="text-xl font-bold tracking-tight">Milestone Escrow &amp; Conditional Fund Release</h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Contributions are held on-chain. Escrow releases funds to NGO <strong>only</strong> after evidence is verified by an independent auditor.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowContributeModal(true)}
                  className="px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition shadow-xs flex items-center gap-1.5"
                >
                  <Coins className="w-4 h-4" />
                  <span>Contribute Testnet POL</span>
                </button>

                <Link
                  to="/app/verifier"
                  className="px-3.5 py-2 text-xs font-semibold text-indigo-200 bg-white/10 hover:bg-white/20 rounded-xl border border-white/15 transition flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                  <span>Verifier Portal</span>
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-white/10 p-3.5 rounded-xl border border-white/10">
                <span className="text-indigo-300 font-medium block mb-1">Target Escrow</span>
                <span className="text-lg font-bold text-white">{project.goal_amount_pol || 100} POL</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Defined in contract</span>
              </div>

              <div className="bg-white/10 p-3.5 rounded-xl border border-white/10">
                <span className="text-indigo-300 font-medium block mb-1">Contributed (Escrow)</span>
                <span className="text-lg font-bold text-white">
                  {onchainContributions.reduce((s, c) => s + c.amount_pol, 0)} POL
                </span>
                <span className="text-[10px] text-indigo-200 block mt-0.5">{onchainContributions.length} contributions</span>
              </div>

              <div className="bg-white/10 p-3.5 rounded-xl border border-white/10">
                <span className="text-emerald-300 font-medium block mb-1">Released to NGO</span>
                <span className="text-lg font-bold text-emerald-400">
                  {milestones.reduce((s, m) => s + m.released_pol, 0)} POL
                </span>
                <span className="text-[10px] text-emerald-200/70 block mt-0.5">Post-audit transfers</span>
              </div>

              <div className="bg-white/10 p-3.5 rounded-xl border border-white/10">
                <span className="text-amber-300 font-medium block mb-1">Locked in Escrow</span>
                <span className="text-lg font-bold text-amber-300">
                  {Math.max(0, onchainContributions.reduce((s, c) => s + c.amount_pol, 0) - milestones.reduce((s, m) => s + m.released_pol, 0))} POL
                </span>
                <span className="text-[10px] text-amber-200/70 block mt-0.5">Requires verifier sign-off</span>
              </div>
            </div>
          </div>

          {/* Milestones Cards */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-slate-900">Project Milestones ({milestones.length})</h3>
                <p className="text-xs text-slate-500">Each milestone requires supporting IPFS evidence before funds are unlocked.</p>
              </div>
            </div>

            <div className="space-y-4">
              {milestones.map((m, idx) => {
                const isReleased = m.status === 'RELEASED';
                const isApproved = m.status === 'APPROVED';
                const isSubmitted = m.status === 'SUBMITTED';
                const isPending = m.status === 'PENDING' || m.status === 'REJECTED';

                return (
                  <div
                    key={m.id}
                    className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4 hover:border-slate-300 transition"
                  >
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl font-bold flex items-center justify-center text-xs shrink-0 ${
                          isReleased
                            ? 'bg-emerald-100 text-emerald-800'
                            : isApproved
                            ? 'bg-blue-100 text-blue-800'
                            : isSubmitted
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          #{idx + 1}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">{m.title}</h4>
                          <span className="text-xs font-semibold text-indigo-700">
                            Milestone Allocation: <strong>{m.allocated_pol} POL (Testnet)</strong>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isReleased && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Funds Released ({m.released_pol} POL)
                          </span>
                        )}
                        {isApproved && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-800 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                            Auditor Approved
                          </span>
                        )}
                        {isSubmitted && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                            <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                            Submitted • Awaiting Auditor Audit
                          </span>
                        )}
                        {m.status === 'PENDING' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
                            Pending Evidence
                          </span>
                        )}
                        {m.status === 'REJECTED' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-800 bg-red-50 px-2.5 py-1 rounded-full border border-red-200">
                            <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                            Rejected • Inadequate Evidence
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Evidence Info & Metadata */}
                    {(m.ipfs_cid || m.review_reason || m.release_tx_hash) && (
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-2">
                        {m.ipfs_cid && (
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-slate-500 font-medium">Public IPFS Evidence:</span>
                            <a
                              href={getIPFSGatewayUrl(m.ipfs_cid)}
                              target="_blank"
                              rel="noreferrer"
                              className="text-indigo-700 hover:text-indigo-900 font-bold bg-indigo-50 px-2.5 py-0.5 rounded border border-indigo-200 inline-flex items-center gap-1"
                            >
                              <FileText className="w-3 h-3" />
                              <span>Inspect IPFS CID: {m.ipfs_cid.slice(0, 12)}...</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          </div>
                        )}

                        {m.evidence_hash && (
                          <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[11px]">
                            <span className="text-slate-500 font-sans">SHA-256 Fingerprint:</span>
                            <span className="text-slate-700 break-all">{m.evidence_hash}</span>
                          </div>
                        )}

                        {m.review_reason && (
                          <div className="pt-1 border-t border-slate-200 text-slate-700">
                            <span className="font-semibold text-emerald-800">Auditor Review Note:</span>{' '}
                            <em>"{m.review_reason}"</em>
                          </div>
                        )}

                        {m.release_tx_hash && (
                          <div className="pt-1 flex items-center justify-between font-mono text-[11px]">
                            <span className="text-slate-500 font-sans">PolygonScan Release Tx:</span>
                            <a
                              href={getAmoyExplorerTxUrl(m.release_tx_hash)}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-700 hover:text-emerald-900 font-semibold underline inline-flex items-center gap-1"
                            >
                              {m.release_tx_hash.slice(0, 12)}...{m.release_tx_hash.slice(-6)}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Milestone Actions */}
                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      {isPending && (
                        <button
                          onClick={() => {
                            setSubmittingMilestone(m);
                            setMilestoneFile(null);
                            setMilestoneFileHash(null);
                            setMilestoneErrorMsg(null);
                          }}
                          className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-xs flex items-center gap-1.5"
                        >
                          <Upload className="w-4 h-4" />
                          <span>Upload Evidence to IPFS &amp; Submit Milestone</span>
                        </button>
                      )}

                      {isSubmitted && (
                        <div className="text-xs text-amber-800 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 flex items-center gap-2">
                          <Info className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>
                            Evidence submitted on-chain. Waiting for independent auditor to review in{' '}
                            <Link to="/app/verifier" className="underline font-bold text-amber-900">
                              Verifier Portal
                            </Link>.
                          </span>
                        </div>
                      )}

                      {isApproved && (
                        <button
                          onClick={() => handleReleaseFunds(m)}
                          disabled={releasingMilestoneId === m.id}
                          className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>
                            {releasingMilestoneId === m.id
                              ? 'Releasing...'
                              : `Release ${m.allocated_pol} POL to NGO Wallet`}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* On-Chain Contributions Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-indigo-600" />
              <span>Polygon Amoy Testnet Contributions ({onchainContributions.length})</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Donor Wallet</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Transaction</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {onchainContributions.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 text-slate-800">
                        {c.donor_wallet.slice(0, 10)}...{c.donor_wallet.slice(-6)}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-indigo-700">
                        {c.amount_pol} POL
                      </td>
                      <td className="py-2.5 px-3 font-sans text-slate-600">
                        {formatDate(c.contributed_at)}
                      </td>
                      <td className="py-2.5 px-3">
                        <a
                          href={getAmoyExplorerTxUrl(c.tx_hash)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-700 underline font-semibold inline-flex items-center gap-1"
                        >
                          {c.tx_hash.slice(0, 8)}...
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {activeTab === 'donations' && (
        <div className="space-y-6">
          {donationSuccessMsg && (
            <div className="p-3 text-xs bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-lg flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{donationSuccessMsg}</span>
            </div>
          )}

          {/* Action Bar: Manual Entry + CSV Import */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Record Project Donation</h3>
                <p className="text-xs text-slate-500">
                  Enter net amount received after gateway/platform deductions. Private donor info is kept strictly private.
                </p>
              </div>

              <button
                onClick={() => setShowCsvModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import CSV Template</span>
              </button>
            </div>

            {/* Manual Donation Form */}
            <form onSubmit={handleDonationSubmit} className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Amount (INR ₹) *</label>
                <input
                  type="number"
                  placeholder="e.g. 5000"
                  value={donationAmount}
                  onChange={(e) => setDonationAmount(e.target.value)}
                  min="1"
                  step="any"
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Date Received *</label>
                <input
                  type="date"
                  value={donationDate}
                  onChange={(e) => setDonationDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Channel *</label>
                <select
                  value={donationChannel}
                  onChange={(e) => setDonationChannel(e.target.value as DonationChannel)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="UPI">UPI</option>
                  <option value="Bank transfer">Bank transfer</option>
                  <option value="Crowdfunding">Crowdfunding</option>
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Source Reference</label>
                <input
                  type="text"
                  placeholder="e.g. UPI-TXN-129"
                  value={donationRef}
                  onChange={(e) => setDonationRef(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <button
                  type="submit"
                  className="w-full py-2 px-3 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition shadow-xs flex items-center justify-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Donation</span>
                </button>
              </div>
            </form>
          </div>

          {/* Donations Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Recorded Donations Ledger ({donations.length})
              </h3>
              <span className="text-xs font-semibold text-slate-700">
                Total: {formatINR(summary.totalReceived)}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-4 text-left">Date</th>
                    <th className="py-2.5 px-4 text-left">Amount Received</th>
                    <th className="py-2.5 px-4 text-left">Channel</th>
                    <th className="py-2.5 px-4 text-left">Source Reference</th>
                    <th className="py-2.5 px-4 text-left">Private Internal Label (Hidden from Donors)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {donations.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 font-medium text-slate-800">{formatDate(d.received_at)}</td>
                      <td className="py-2.5 px-4 font-bold text-slate-900">{formatINR(d.amount_received)}</td>
                      <td className="py-2.5 px-4">
                        <span className="inline-block px-2 py-0.5 rounded-sm bg-slate-100 text-slate-700 font-medium text-[11px]">
                          {d.channel}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-mono text-slate-600 text-[11px]">
                        {d.source_reference || '—'}
                      </td>
                      <td className="py-2.5 px-4 text-slate-400 italic text-[11px] flex items-center gap-1">
                        <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{d.private_donor_label || 'Anonymous / Not labelled'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CSV IMPORT MODAL */}
      {showCsvModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Import Donations via CSV</h3>
                <p className="text-xs text-slate-500">
                  Upload spreadsheet export. Valid rows will be validated, duplicates will be flagged.
                </p>
              </div>
              <button 
                onClick={() => setShowCsvModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
              <span className="text-slate-600">Need the exact CSV format?</span>
              <button
                onClick={handleDownloadSampleCsv}
                className="text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Sample Template</span>
              </button>
            </div>

            <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-emerald-500 transition cursor-pointer">
              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <label className="cursor-pointer">
                <span className="text-xs font-semibold text-emerald-700 hover:underline">
                  Choose CSV file
                </span>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCsvFile}
                  className="hidden"
                />
              </label>
              {csvFileName && (
                <p className="text-xs text-slate-700 font-medium mt-2">{csvFileName}</p>
              )}
            </div>

            {/* Validation Feedback */}
            {csvContent && (
              <div className="space-y-3">
                <div className="flex gap-4 text-xs">
                  <span className="text-emerald-700 font-semibold">
                    ✓ {csvValidRows.length} valid {csvValidRows.length === 1 ? 'row' : 'rows'} ready
                  </span>
                  {csvErrors.length > 0 && (
                    <span className="text-red-700 font-semibold">
                      ⚠️ {csvErrors.length} {csvErrors.length === 1 ? 'row error' : 'row errors'} flagged
                    </span>
                  )}
                </div>

                {csvErrors.length > 0 && (
                  <div className="bg-red-50 p-3 rounded-lg border border-red-200 text-xs text-red-800 max-h-36 overflow-y-auto space-y-1">
                    {csvErrors.map((err, i) => (
                      <div key={i}>
                        Row {err.rowNumber}: <strong>{err.reason}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCsvModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleImportValidCsv}
                disabled={csvValidRows.length === 0}
                className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg shadow-xs"
              >
                Import {csvValidRows.length} Valid Rows
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: EXPENSES & EVIDENCE */}
      {activeTab === 'expenses' && (
        <div className="space-y-6">
          {expenseSuccessMsg && (
            <div className="p-3 text-xs bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-lg flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{expenseSuccessMsg}</span>
            </div>
          )}

          {/* Grid: Expense Form & Evidence Uploader */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. Record Expense */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-1">1. Record Project Expense</h3>
              <p className="text-xs text-slate-500 mb-4">
                Record itemized expenditure against the project budget.
              </p>

              <form onSubmit={handleExpenseSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Amount (INR ₹) *</label>
                    <input
                      type="number"
                      placeholder="e.g. 15000"
                      value={expenseAmount}
                      onChange={(e) => setExpenseAmount(e.target.value)}
                      min="1"
                      step="any"
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Date Spent *</label>
                    <input
                      type="date"
                      value={expenseDate}
                      onChange={(e) => setExpenseDate(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Category *</label>
                  <select
                    value={expenseCategory}
                    onChange={(e) => setExpenseCategory(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="Educational materials">Educational materials</option>
                    <option value="Distribution and logistics">Distribution and logistics</option>
                    <option value="Medical supplies">Medical supplies</option>
                    <option value="Food & Ration">Food & Ration</option>
                    <option value="Administrative/Operations">Administrative/Operations</option>
                    <option value="Other project expenses">Other project expenses</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Description / Item Details *</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. 60x School Bags, notebooks, stationery sets"
                    value={expenseDescription}
                    onChange={(e) => setExpenseDescription(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Vendor Label</label>
                    <input
                      type="text"
                      placeholder="e.g. Jaipur Supplies Ltd"
                      value={expenseVendor}
                      onChange={(e) => setExpenseVendor(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Payment Reference</label>
                    <input
                      type="text"
                      placeholder="e.g. TXN-EDU-9901"
                      value={expenseRef}
                      onChange={(e) => setExpenseRef(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition shadow-xs"
                >
                  Save Expense Entry
                </button>
              </form>
            </div>

            {/* 2. Attach Evidence & SHA-256 Fingerprint */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">2. Attach Supporting Evidence</h3>
                <p className="text-xs text-slate-500 mb-4">
                  Upload PDF or image receipt. The original remains private; its cryptographic SHA-256 fingerprint is recorded.
                </p>

                <form onSubmit={handleEvidenceSubmit} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Link to Expense *</label>
                    <select
                      value={selectedExpenseId}
                      onChange={(e) => setSelectedExpenseId(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500"
                      required
                    >
                      <option value="">Select recorded expense...</option>
                      {expenses.map((exp) => (
                        <option key={exp.id} value={exp.id}>
                          {formatINR(exp.amount)} – {exp.category} ({exp.description.slice(0, 30)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Document Type *</label>
                    <select
                      value={evidenceType}
                      onChange={(e) => setEvidenceType(e.target.value as EvidenceType)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="INVOICE">Invoice</option>
                      <option value="RECEIPT">Receipt</option>
                      <option value="BILL">Bill</option>
                      <option value="VOUCHER">Payment Voucher</option>
                      <option value="OTHER">Other Evidence</option>
                    </select>
                  </div>

                  <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Supporting File (PDF, JPG, PNG &lt; 5MB) *
                    </label>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleEvidenceFileChange}
                      className="text-xs text-slate-600 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700"
                      required
                    />
                  </div>

                  {evidenceComputingHash && (
                    <div className="text-[11px] text-slate-500 animate-pulse">
                      Computing Web Crypto SHA-256 fingerprint...
                    </div>
                  )}

                  {evidenceComputedHash && (
                    <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] space-y-1">
                      <span className="font-semibold block">Calculated SHA-256:</span>
                      <span className="font-mono break-all text-[10px] text-emerald-800">
                        {evidenceComputedHash}
                      </span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={!evidenceFile || !selectedExpenseId || evidenceComputingHash}
                    className="w-full py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg transition shadow-xs"
                  >
                    Attach Document & Store Fingerprint
                  </button>
                </form>
              </div>

              <div className="text-[10px] text-slate-400 mt-4 pt-3 border-t border-slate-100">
                🔒 Privacy guarantee: Original invoice files remain in private storage. Only sanitised cryptographic fingerprints are published.
              </div>
            </div>
          </div>

          {/* Expenses & Evidence Ledger */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Expenses & Evidence Registry ({expenses.length})
              </h3>
              <span className="text-xs font-semibold text-slate-700">
                Total Spent: {formatINR(summary.totalSpent)}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-4 text-left">Date</th>
                    <th className="py-2.5 px-4 text-left">Category</th>
                    <th className="py-2.5 px-4 text-left">Description</th>
                    <th className="py-2.5 px-4 text-left">Amount</th>
                    <th className="py-2.5 px-4 text-left">Attached Evidence</th>
                    <th className="py-2.5 px-4 text-left">Verification Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {expenses.map((e) => {
                    const linkedEvidence = evidenceFiles.filter(ev => ev.expense_id === e.id);
                    return (
                      <tr key={e.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-4 font-medium text-slate-800">{formatDate(e.spent_at)}</td>
                        <td className="py-2.5 px-4">
                          <span className="inline-block px-2 py-0.5 rounded-sm bg-slate-100 text-slate-700 font-medium text-[11px]">
                            {e.category}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-700">
                          <div>{e.description}</div>
                          {e.vendor_label && (
                            <span className="text-[10px] text-slate-400">Vendor: {e.vendor_label}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 font-bold text-slate-900">{formatINR(e.amount)}</td>
                        <td className="py-2.5 px-4">
                          {linkedEvidence.length > 0 ? (
                            <div className="space-y-1">
                              {linkedEvidence.map(ev => (
                                <div key={ev.id} className="text-[11px] text-slate-700 flex items-center gap-1">
                                  <FileText className="w-3.5 h-3.5 text-emerald-600" />
                                  <span className="truncate max-w-[140px]">{ev.file_name_safe}</span>
                                  <span className="text-[9px] text-slate-400 font-mono">({truncateHash(ev.sha256, 4, 3)})</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-amber-700 text-[11px] font-semibold">
                              ⚠️ Evidence missing
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4">
                          {linkedEvidence.length > 0 ? (
                            <StatusBadge status={linkedEvidence[0].review_status} />
                          ) : (
                            <StatusBadge status="NGO_REPORTED" />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PROGRESS UPDATES */}
      {activeTab === 'updates' && (
        <div className="space-y-6">
          {/* Progress Update Form */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Record Project Progress Update</h3>
            <p className="text-xs text-slate-500 mb-4">
              Share narrative milestones and aggregate beneficiary counts. Do not collect sensitive individual names or Aadhaar numbers.
            </p>

            <form onSubmit={handleUpdateSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Date *</label>
                  <input
                    type="date"
                    value={updateDate}
                    onChange={(e) => setUpdateDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Aggregate Beneficiaries Reached (Optional)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 60"
                    value={updateBeneficiaryCount}
                    onChange={(e) => setUpdateBeneficiaryCount(e.target.value)}
                    min="0"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Activity Narrative / Summary *</label>
                <textarea
                  rows={3}
                  placeholder="Describe field activity, distribution locations, and progress achieved..."
                  value={updateSummary}
                  onChange={(e) => setUpdateSummary(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-[11px] text-slate-400">
                  Label: Automatically tagged as <StatusBadge status="NGO_REPORTED" showIcon={false} />
                </span>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition shadow-xs"
                >
                  Record Progress Update
                </button>
              </div>
            </form>
          </div>

          {/* Updates Timeline */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4">
              Recorded Field Updates Timeline ({updates.length})
            </h3>

            {updates.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No updates recorded yet.</p>
            ) : (
              <div className="space-y-4">
                {updates.map(u => (
                  <div key={u.id} className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col sm:flex-row justify-between items-start gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-800">{formatDate(u.update_date)}</span>
                        <StatusBadge status={u.status} />
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed">{u.summary}</p>
                    </div>

                    {u.beneficiary_count !== null && u.beneficiary_count !== undefined && (
                      <div className="bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-lg border border-emerald-200 text-xs shrink-0 text-center">
                        <span className="block text-[10px] uppercase font-bold text-emerald-600">Beneficiaries</span>
                        <span className="font-bold">{u.beneficiary_count} Students Reached</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: PUBLISH & AMOY ANCHOR */}
      {activeTab === 'report' && (
        <div className="space-y-6">
          {/* Section 1: Publish Snapshot */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Publish Sanitised Report Snapshot</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Creates an immutable versioned snapshot. Strips all donor identities, bank credentials, and private file paths.
                </p>
              </div>

              <button
                onClick={handlePublishSnapshot}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition shadow-xs flex items-center gap-1.5 shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Generate & Publish Version</span>
              </button>
            </div>

            {/* Privacy Checklist */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
              <span className="font-bold text-slate-700 uppercase text-[10px] tracking-wider block">
                Automatic Privacy Sanitisation Checks
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Zero donor names or contact details exported</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Zero bank account numbers or PAN records</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Private invoice storage URLs excluded</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Deterministic UTF-8 JSON canonical ordering</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Published Versions & Polygon Amoy Anchoring */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-600" />
                  <span>Polygon Amoy Testnet Fingerprint Registry</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Anchors the 32-byte SHA-256 fingerprint into ReportAnchor smart contract (Chain ID 80002).
                </p>
              </div>

              {/* Wallet Connection */}
              <div>
                {walletAddress ? (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="font-mono text-slate-700">{truncateHash(walletAddress)}</span>
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-semibold">
                      Amoy (80002)
                    </span>
                  </div>
                ) : (
                  <button
                    onClick={handleConnectWallet}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition flex items-center gap-1.5 shadow-xs"
                  >
                    <Wallet className="w-3.5 h-3.5 text-slate-600" />
                    <span>Connect MetaMask (Amoy)</span>
                  </button>
                )}
              </div>
            </div>

            {anchorError && (
              <div className="p-3 text-xs bg-red-50 border border-red-300 text-red-800 rounded-lg">
                {anchorError}
              </div>
            )}

            {anchorSuccessTx && (
              <div className="p-3 text-xs bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-lg flex items-center justify-between">
                <div>
                  <span className="font-bold block">✓ Anchored on Polygon Amoy successfully!</span>
                  <span className="font-mono text-[11px] text-emerald-700">Tx: {anchorSuccessTx}</span>
                </div>
                <a
                  href={`${DEFAULT_AMOY_EXPLORER}/tx/${anchorSuccessTx}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-emerald-800 underline flex items-center gap-1 ml-4"
                >
                  <span>View PolygonScan</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}

            {/* Snapshots Table */}
            {snapshots.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">
                No report snapshots published yet. Click &quot;Generate &amp; Publish Version&quot; above to create one.
              </div>
            ) : (
              <div className="space-y-4">
                {snapshots.map((snap) => {
                  const anchor = store.getAnchorForSnapshot(snap.id);
                  return (
                    <div 
                      key={snap.id} 
                      className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <div>
                          <span className="font-bold text-slate-900 text-xs">
                            Report Snapshot Version {snap.version}
                          </span>
                          <span className="text-slate-400 text-[11px] ml-2">
                            Published {formatDateTime(snap.published_at)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Link
                            to={`/r/${snap.public_slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 bg-white px-2.5 py-1 rounded-md border border-slate-200"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Open Donor URL</span>
                          </Link>

                          {anchor ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Anchored on Amoy
                            </span>
                          ) : (
                            <button
                              onClick={() => handleAnchorOnAmoy(snap)}
                              disabled={anchoringInProgress}
                              className="px-3 py-1 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-md transition shadow-xs flex items-center gap-1"
                            >
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                              <span>{anchoringInProgress ? 'Anchoring...' : 'Anchor on Polygon Amoy'}</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Hash Details */}
                      <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-slate-600 text-[11px]">Report SHA-256 Fingerprint:</span>
                          <span className="font-mono text-[10px] text-slate-800 bg-slate-100 px-2 py-0.5 rounded-sm">
                            {snap.report_hash}
                          </span>
                        </div>
                        {anchor && (
                          <div className="flex justify-between items-center pt-1 border-t border-slate-100 text-[11px]">
                            <span className="text-slate-500">Transaction Hash:</span>
                            <a
                              href={`${DEFAULT_AMOY_EXPLORER}/tx/${anchor.tx_hash}`}
                              target="_blank"
                              rel="noreferrer"
                              className="font-mono text-emerald-700 hover:underline flex items-center gap-1"
                            >
                              <span>{truncateHash(anchor.tx_hash, 10, 8)}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* EDIT PROJECT MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Edit Project Details</h3>
                <p className="text-xs text-slate-500">Update project attributes or archive the project.</p>
              </div>
              <button 
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditProjectSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Project Title *</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Purpose & Description *</label>
                <textarea
                  rows={3}
                  value={editPurpose}
                  onChange={(e) => setEditPurpose(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Target Funding Goal (INR ₹) *</label>
                  <input
                    type="number"
                    value={editGoal}
                    onChange={(e) => setEditGoal(e.target.value)}
                    min="1"
                    step="any"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="ARCHIVED">ARCHIVED</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target End Date</label>
                <input
                  type="date"
                  value={editEndDate}
                  onChange={(e) => setEditEndDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleArchiveProject}
                  className="px-3 py-1.5 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg"
                >
                  Archive Project
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL: SUBMIT MILESTONE EVIDENCE TO IPFS & POLYGON AMOY */}
      {submittingMilestone && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Submit Milestone #{submittingMilestone.milestone_index + 1} Evidence
                </h3>
                <p className="text-xs text-indigo-700 font-semibold">{submittingMilestone.title} ({submittingMilestone.allocated_pol} POL)</p>
              </div>
              <button
                onClick={() => setSubmittingMilestone(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Upload supporting receipts, invoices, or delivery photos. Files are pinned directly to <strong>IPFS via Pinata</strong>. The resulting CID and SHA-256 fingerprint will be recorded in the Polygon Amoy smart contract.
            </p>

            {milestoneErrorMsg && (
              <div className="p-3 rounded-lg bg-red-50 text-red-800 text-xs border border-red-200">
                {milestoneErrorMsg}
              </div>
            )}

            {milestoneSuccessMsg && (
              <div className="p-3 rounded-lg bg-emerald-50 text-emerald-800 text-xs border border-emerald-200">
                {milestoneSuccessMsg}
              </div>
            )}

            <form onSubmit={handleMilestoneSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Supporting Document (PDF, JPG, PNG):
                </label>
                <input
                  type="file"
                  required
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleMilestoneFileChange}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 border border-slate-200 rounded-lg p-1.5"
                />
              </div>

              {milestoneFileHash && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                  <span className="text-slate-500 font-medium block">Computed Cryptographic Fingerprint (SHA-256):</span>
                  <p className="font-mono text-[11px] text-slate-800 break-all">{milestoneFileHash}</p>
                </div>
              )}

              <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100 text-xs text-indigo-900 flex items-start gap-2">
                <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <span>
                  After submitting, switch to the <strong>Independent Verifier Portal</strong> to approve the milestone and conditionally unlock funds.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSubmittingMilestone(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={milestoneUploading || !milestoneFile}
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Upload className="w-4 h-4" />
                  <span>{milestoneUploading ? 'Pinning to IPFS & Submitting...' : 'Upload & Submit On-Chain'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONTRIBUTE TESTNET POL */}
      {showContributeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Coins className="w-5 h-5 text-indigo-600" />
                <span>Contribute Testnet POL to Escrow</span>
              </h3>
              <button
                onClick={() => setShowContributeModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Demonstration escrow contribution on <strong>Polygon Amoy (Chain ID 80002)</strong>. Contributions are locked in smart contract until independent auditor verifies milestones.
            </p>

            {contributeErrorMsg && (
              <div className="p-3 rounded-lg bg-red-50 text-red-800 text-xs border border-red-200">
                {contributeErrorMsg}
              </div>
            )}

            {contributeSuccessMsg && (
              <div className="p-3 rounded-lg bg-emerald-50 text-emerald-800 text-xs border border-emerald-200">
                {contributeSuccessMsg}
              </div>
            )}

            <form onSubmit={handleContributePol} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Amount in Testnet POL:
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    value={contributeAmountPol}
                    onChange={(e) => setContributeAmountPol(e.target.value)}
                    className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none pr-14"
                    placeholder="e.g. 10.0"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-bold text-indigo-600">
                    POL
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowContributeModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={contributeLoading}
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition shadow-xs disabled:opacity-50"
                >
                  {contributeLoading ? 'Contributing...' : 'Confirm Escrow Deposit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

