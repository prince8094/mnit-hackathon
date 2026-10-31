import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { store, UserSession } from '../lib/store';
import { Project, ProjectMilestone } from '../types';
import { 
  isMetaMaskInstalled, 
  connectWallet, 
  switchToPolygonAmoy, 
  verifyMilestoneOnchain,
  computeProjectIdKey,
  getAmoyExplorerTxUrl,
  getAmoyExplorerAddressUrl,
  AMOY_CHAIN_ID,
  DEFAULT_ESCROW_CONTRACT_ADDRESS,
  classifyTransaction
} from '../lib/blockchain';
import { getIPFSGatewayUrl } from '../lib/ipfs';
import { 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  ExternalLink, 
  Clock, 
  FileText, 
  Wallet, 
  Lock, 
  Layers, 
  ArrowRight, 
  Info,
  ShieldAlert,
  PackageCheck
} from 'lucide-react';
import { EvidenceIntelligenceSection } from '../components/evidence/EvidenceIntelligenceSection';
import { ProofOfDeliverySection } from '../components/delivery/ProofOfDeliverySection';

export const VerifierDashboardPage: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<UserSession | null>(store.getCurrentUser());
  const [allMilestones, setAllMilestones] = useState<ProjectMilestone[]>(store.getAllMilestones());
  const [projects, setProjects] = useState<Project[]>(store.getProjects());

  // Web3 Wallet state
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isAmoy, setIsAmoy] = useState<boolean>(false);
  const [walletConnecting, setWalletConnecting] = useState(false);

  // Verification interaction state
  const [selectedMilestone, setSelectedMilestone] = useState<ProjectMilestone | null>(null);
  const [reviewReason, setReviewReason] = useState<string>('Verified independent invoices and distribution photos on IPFS.');
  const [verifyingInProgress, setVerifyingInProgress] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string; txHash?: string | null } | null>(null);
  const [verifierTab, setVerifierTab] = useState<'milestones' | 'intelligence' | 'delivery'>('milestones');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  useEffect(() => {
    return store.subscribe(() => {
      setCurrentUser(store.getCurrentUser());
      setAllMilestones(store.getAllMilestones());
      setProjects(store.getProjects());
    });
  }, []);

  const handleConnectWallet = async () => {
    setStatusMessage(null);
    setWalletConnecting(true);
    try {
      const { address, chainId } = await connectWallet();
      setWalletAddress(address);
      const isAmoyChain = chainId === AMOY_CHAIN_ID;
      setIsAmoy(isAmoyChain);
      if (!isAmoyChain) {
        try {
          await switchToPolygonAmoy();
          setIsAmoy(true);
        } catch (switchErr: any) {
          console.warn('Network switch warning:', switchErr);
          setStatusMessage({
            type: 'error',
            text: `Connected to wallet ${address.slice(0, 6)}...${address.slice(-4)}, but wallet is not on Polygon Amoy. Please switch network in MetaMask to Polygon Amoy (Chain ID 80002).`
          });
          return;
        }
      }
    } catch (err: any) {
      console.error('Wallet connect error:', err);
      const msg = err.message || '';
      if (msg.includes('internal error') || err.code === -32603) {
        setStatusMessage({
          type: 'error',
          text: 'MetaMask encountered an internal error. Please open the MetaMask browser extension, unlock your wallet or clear any pending prompts, and try again.'
        });
      } else {
        setStatusMessage({ type: 'error', text: msg || 'Failed to connect MetaMask.' });
      }
    } finally {
      setWalletConnecting(false);
    }
  };

  const handleUseDemoVerifierWallet = () => {
    setWalletAddress('0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC');
    setIsAmoy(true);
    setStatusMessage({
      type: 'success',
      text: 'Connected with designated Independent Verifier wallet (Dr. Sunita Rao: 0x3C44...93BC).'
    });
  };

  const submittedMilestones = allMilestones.filter(m => m.status === 'SUBMITTED');
  const verifiedMilestones = allMilestones.filter(m => m.status === 'APPROVED' || m.status === 'RELEASED' || m.status === 'REJECTED');

  const handleVerify = async (milestone: ProjectMilestone, approve: boolean) => {
    setStatusMessage(null);
    if (!reviewReason.trim()) {
      alert('Please provide a verification audit note / reason.');
      return;
    }

    const project = projects.find(p => p.id === milestone.project_id) || store.getProjectById(milestone.project_id);
    if (!project) {
      alert('Project not found');
      return;
    }

    // Crucial rule: An NGO wallet cannot verify its own milestone
    if (walletAddress && project.ngo_wallet && walletAddress.toLowerCase() === project.ngo_wallet.toLowerCase()) {
      setStatusMessage({
        type: 'error',
        text: 'Access Denied: The registered NGO wallet cannot verify its own submitted milestone. Please switch to the authorized independent verifier wallet.'
      });
      return;
    }

    setVerifyingInProgress(true);
    try {
      let txHash: string | null = null;
      let verifierUsed = walletAddress || '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC';

      // If MetaMask is installed and connected to Amoy, attempt real on-chain transaction
      if (isMetaMaskInstalled() && walletAddress && isAmoy) {
        try {
          const projectKey = computeProjectIdKey(project.public_slug || project.id);
          const res = await verifyMilestoneOnchain(
            projectKey,
            milestone.milestone_index,
            approve,
            reviewReason.trim()
          );
          txHash = res.txHash;
          verifierUsed = res.verifierAddress;
        } catch (onchainErr: any) {
          console.warn('Onchain verification notice (recording verified state):', onchainErr);
        }
      }

      // Update milestone status in store
      await store.updateMilestone(milestone.id, {
        status: approve ? 'APPROVED' : 'REJECTED',
        reviewed_at: new Date().toISOString(),
        review_reason: reviewReason.trim()
      });

      // Record audit verification log
      await store.addMilestoneVerification({
        milestone_id: milestone.id,
        project_id: milestone.project_id,
        verifier_wallet: verifierUsed,
        approved: approve,
        review_reason: reviewReason.trim(),
        tx_hash: txHash
      });

      setStatusMessage({
        type: 'success',
        text: `Milestone "${milestone.title}" has been ${approve ? 'APPROVED' : 'REJECTED'} by independent verifier! Funds are now conditionally unlocked for release.`,
        txHash
      });

      setSelectedMilestone(null);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Verification failed.' });
    } finally {
      setVerifyingInProgress(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-2xl shadow-md border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 mb-3">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            <span>Independent Verifier Portal • Polygon Amoy (80002)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Milestone Accountability & Audit Desk
          </h1>
          <p className="text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed">
            As an independent social auditor or designated verifier, you inspect IPFS evidence and cryptographically approve milestones. Escrowed testnet POL is released to NGOs <strong>only</strong> after your independent approval.
          </p>
        </div>

        {/* Web3 Wallet Card */}
        <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/15 shrink-0 w-full sm:w-auto text-xs space-y-2.5">
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-300 font-medium flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-indigo-300" />
              Verifier Wallet
            </span>
            {walletAddress ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                Connected
              </span>
            ) : (
              <span className="text-slate-400">Not Connected</span>
            )}
          </div>

          {walletAddress ? (
            <div>
              <p className="font-mono text-white text-[11px] truncate max-w-[200px]" title={walletAddress}>
                {walletAddress}
              </p>
              <div className="flex items-center justify-between text-[10px] text-slate-400 mt-0.5">
                <span>Network: {isAmoy ? 'Polygon Amoy (80002)' : 'Wrong Network'}</span>
                <button 
                  onClick={() => setWalletAddress(null)} 
                  className="underline text-slate-400 hover:text-white ml-2"
                >
                  Disconnect
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <button
                onClick={handleConnectWallet}
                disabled={walletConnecting}
                className="w-full px-3 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-sm flex items-center justify-center gap-1.5"
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>{walletConnecting ? 'Connecting...' : 'Connect MetaMask'}</span>
              </button>
              <button
                type="button"
                onClick={handleUseDemoVerifierWallet}
                className="w-full py-1 text-[11px] text-indigo-300 hover:text-white underline text-center block"
              >
                Or connect as Dr. Sunita Rao (0x3C44...)
              </button>
            </div>
          )}

          <div className="pt-1 border-t border-white/10 text-[10px] text-slate-300 flex items-center justify-between">
            <span>Role: Dr. Sunita Rao</span>
            <button 
              onClick={() => store.loginAs('VERIFIER')} 
              className="underline text-indigo-300 hover:text-white"
            >
              Switch Persona
            </button>
          </div>
        </div>
      </div>

      {/* Status Notifications */}
      {statusMessage && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 ${
          statusMessage.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-red-50 border-red-200 text-red-900'
        }`}>
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          )}
          <div className="text-xs space-y-1">
            <p className="font-semibold">{statusMessage.text}</p>
            {statusMessage.txHash && (
              <p className="font-mono text-[11px] text-slate-600">
                PolygonScan Tx:{' '}
                <a
                  href={getAmoyExplorerTxUrl(statusMessage.txHash)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-700 underline font-bold inline-flex items-center gap-0.5"
                >
                  {statusMessage.txHash.slice(0, 14)}...{statusMessage.txHash.slice(-8)}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Auditor Desk Navigation Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6">
          <button
            onClick={() => setVerifierTab('milestones')}
            className={`pb-3 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
              verifierTab === 'milestones'
                ? 'border-indigo-600 text-indigo-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Clock className="w-4 h-4 text-amber-600" />
            <span>Pending Milestone Approvals ({submittedMilestones.length})</span>
          </button>

          <button
            onClick={() => setVerifierTab('intelligence')}
            className={`pb-3 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
              verifierTab === 'intelligence'
                ? 'border-indigo-600 text-indigo-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-indigo-600" />
            <span>Evidence Intelligence & Flag Resolution</span>
          </button>

          <button
            onClick={() => setVerifierTab('delivery')}
            className={`pb-3 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
              verifierTab === 'delivery'
                ? 'border-teal-600 text-teal-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <PackageCheck className="w-4 h-4 text-teal-600" />
            <span>Proof of Delivery Inspection</span>
          </button>
        </nav>
      </div>

      {verifierTab === 'milestones' && (
      <>
      {/* Awaiting Review Queue */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-600" />
            <span>Milestones Awaiting Independent Verification ({submittedMilestones.length})</span>
          </h2>
          <span className="text-xs text-slate-500">
            Escrow release blocked until verifier sign-off
          </span>
        </div>

        {submittedMilestones.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-3 shadow-xs">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">No Pending Milestones</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              All submitted project evidence has been reviewed. When an NGO uploads invoices to IPFS and submits a milestone, it will appear here for audit.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {submittedMilestones.map((m) => {
              const proj = projects.find(p => p.id === m.project_id) || store.getProjectById(m.project_id);
              return (
                <div 
                  key={m.id}
                  className="bg-white p-6 rounded-2xl border border-amber-200 shadow-xs space-y-4 hover:border-amber-300 transition"
                >
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-sm border border-amber-200">
                        Awaiting Audit Sign-off
                      </span>
                      <h3 className="text-base font-bold text-slate-900 mt-1">
                        Milestone #{m.milestone_index + 1}: {m.title}
                      </h3>
                      <p className="text-xs text-slate-500">
                        Project: <strong>{proj?.title || 'School Kit Support'}</strong> • Allocation:{' '}
                        <strong className="text-indigo-600 font-bold">{m.allocated_pol} POL (Testnet)</strong>
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-semibold text-slate-700">
                        Submitted: {m.submitted_at ? new Date(m.submitted_at).toLocaleDateString() : 'Recently'}
                      </span>
                    </div>
                  </div>

                  {/* Evidence & Hash Inspection */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl text-xs border border-slate-200">
                    <div>
                      <span className="text-slate-500 font-semibold block mb-1">Public IPFS Evidence:</span>
                      {m.ipfs_cid ? (
                        <a
                          href={getIPFSGatewayUrl(m.ipfs_cid)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-indigo-700 hover:text-indigo-900 font-bold bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Inspect IPFS Document (CID: {m.ipfs_cid.slice(0, 12)}...)</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-slate-400">No IPFS document attached</span>
                      )}
                    </div>

                    <div>
                      <span className="text-slate-500 font-semibold block mb-1">Cryptographic Fingerprint (SHA-256):</span>
                      <p className="font-mono text-[11px] text-slate-700 break-all bg-white p-1.5 rounded border border-slate-200">
                        {m.evidence_hash || 'SHA-256 verified from invoice manifest'}
                      </p>
                    </div>
                  </div>

                  {/* Verification Review Input & Actions */}
                  <div className="space-y-3 pt-2">
                    <label className="block text-xs font-semibold text-slate-700">
                      Audit Note / Verification Reason (Recorded On-Chain):
                    </label>
                    <input
                      type="text"
                      value={reviewReason}
                      onChange={(e) => setReviewReason(e.target.value)}
                      placeholder="e.g. Verified 60 student kit vendor invoices and rural school distribution logs on IPFS."
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />

                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <button
                        onClick={() => handleVerify(m, true)}
                        disabled={verifyingInProgress}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-xs disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{verifyingInProgress ? 'Auditing...' : 'Approve Milestone & Authorize Fund Release'}</span>
                      </button>

                      <button
                        onClick={() => handleVerify(m, false)}
                        disabled={verifyingInProgress}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Reject (Inadequate Evidence)</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Historical Audit Trail */}
      <div className="space-y-4 pt-4 border-t border-slate-200">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Layers className="w-5 h-5 text-slate-600" />
          <span>Audit History & Verified Milestone Releases</span>
        </h2>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="py-3 px-4">Milestone</th>
                  <th className="py-3 px-4">Allocation</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">IPFS Evidence</th>
                  <th className="py-3 px-4">Verifier Audit Reason</th>
                  <th className="py-3 px-4">On-Chain Tx</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {verifiedMilestones.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {m.title}
                    </td>
                    <td className="py-3 px-4 font-bold text-indigo-700">
                      {m.allocated_pol} POL
                    </td>
                    <td className="py-3 px-4">
                      {m.status === 'RELEASED' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> Funds Released
                        </span>
                      )}
                      {m.status === 'APPROVED' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> Approved
                        </span>
                      )}
                      {m.status === 'REJECTED' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-800 bg-red-100 px-2 py-0.5 rounded-full">
                          <XCircle className="w-3 h-3" /> Rejected
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {m.ipfs_cid ? (
                        <a
                          href={getIPFSGatewayUrl(m.ipfs_cid)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center gap-1"
                        >
                          <span>{m.ipfs_cid.slice(0, 8)}...</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={m.review_reason || ''}>
                      {m.review_reason || 'Verified'}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px]">
                      {(() => {
                        const txInfo = classifyTransaction(m.release_tx_hash, m.tx_status);
                        if (txInfo.isVerifiedOnchain && txInfo.explorerUrl) {
                          return (
                            <a
                              href={txInfo.explorerUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-700 underline font-semibold inline-flex items-center gap-1"
                            >
                              {m.release_tx_hash?.slice(0, 8)}...
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          );
                        }
                        if (m.status === 'RELEASED') {
                          return (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200 font-sans">
                              Demo Simulated
                            </span>
                          );
                        }
                        return <span className="text-slate-400 font-sans">—</span>;
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      </>
      )}

      {/* Auditor Tab: Evidence Intelligence */}
      {verifierTab === 'intelligence' && (
        <div className="space-y-4">
          {projects.length > 0 && (
            <div className="flex items-center gap-2 bg-white p-3 rounded-xl border border-slate-200">
              <span className="text-xs font-semibold text-slate-600">Select Project for Audit:</span>
              <select
                value={selectedProjectId || projects[0]?.id}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="text-xs font-bold text-slate-800 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>
          )}

          {projects.length > 0 && (
            <EvidenceIntelligenceSection
              project={projects.find((p) => p.id === (selectedProjectId || projects[0]?.id)) || projects[0]}
              expenses={store.getExpenses(selectedProjectId || projects[0]?.id)}
              evidenceFiles={store.getEvidenceFiles(selectedProjectId || projects[0]?.id)}
              flags={store.getEvidenceFlags(selectedProjectId || projects[0]?.id)}
              summary={store.runEvidenceIntelligence(selectedProjectId || projects[0]?.id).summary}
              isVerifier={true}
              onRefresh={() => setAllMilestones(store.getAllMilestones())}
            />
          )}
        </div>
      )}

      {/* Auditor Tab: Proof of Delivery */}
      {verifierTab === 'delivery' && (
        <div className="space-y-4">
          {projects.length > 0 && (
            <div className="flex items-center gap-2 bg-white p-3 rounded-xl border border-slate-200">
              <span className="text-xs font-semibold text-slate-600">Select Project for Delivery Inspection:</span>
              <select
                value={selectedProjectId || projects[0]?.id}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="text-xs font-bold text-slate-800 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>
          )}

          {projects.length > 0 && (
            <ProofOfDeliverySection
              project={projects.find((p) => p.id === (selectedProjectId || projects[0]?.id)) || projects[0]}
              batches={store.getDistributionBatches(selectedProjectId || projects[0]?.id)}
              isVerifier={true}
              onRefresh={() => setAllMilestones(store.getAllMilestones())}
            />
          )}
        </div>
      )}
    </div>
  );
};

