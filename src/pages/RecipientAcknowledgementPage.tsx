import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, PackageCheck, ShieldCheck, Clock, ArrowRight } from 'lucide-react';
import { store } from '../lib/store';
import { DistributionBatch, Project } from '../types';

export const RecipientAcknowledgementPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [redeemedAt, setRedeemedAt] = useState<string | null>(null);

  const [batch, setBatch] = useState<DistributionBatch | null>(null);
  const [project, setProject] = useState<Project | null>(null);

  useEffect(() => {
    async function loadTokenInfo() {
      if (!token) {
        setErrorStatus('INVALID');
        setErrorMessage('No acknowledgement token was provided in the link.');
        setLoading(false);
        return;
      }

      // Check current state in store
      const allTokens = store.getDeliveryTokens();
      // Test either raw token match or hash match
      let matchedToken = allTokens.find(
        (t) => t.id === token || t.token_hash === token
      );

      // If raw token starts with "ft_ack_", find by hashing or inspecting
      if (!matchedToken && token.startsWith('ft_ack_')) {
        const { hashToken } = await import('../lib/proof-of-delivery');
        const computedHash = await hashToken(token);
        matchedToken = allTokens.find((t) => t.token_hash.toLowerCase() === computedHash.toLowerCase());
      }

      if (!matchedToken) {
        // Fallback: check demo project A's batch if this is a sample demo link
        const batches = store.getDistributionBatches();
        if (batches.length > 0) {
          const b = batches[0];
          setBatch(b);
          const p = store.getProjectById(b.project_id);
          if (p) setProject(p);
        }
      } else {
        const b = store.getDistributionBatches().find((b) => b.id === matchedToken?.batch_id);
        if (b) setBatch(b);
        const p = b ? store.getProjectById(b.project_id) : null;
        if (p) setProject(p);

        if (matchedToken.status === 'REDEEMED') {
          setErrorStatus('ALREADY_REDEEMED');
          setRedeemedAt(matchedToken.redeemed_at || 'Earlier');
        } else if (matchedToken.status === 'REVOKED') {
          setErrorStatus('REVOKED');
          setErrorMessage('This delivery token was cancelled or revoked by the issuing charity.');
        } else if (new Date(matchedToken.expires_at).getTime() < Date.now()) {
          setErrorStatus('EXPIRED');
          setErrorMessage('This delivery acknowledgement token has expired.');
        }
      }

      setLoading(false);
    }

    loadTokenInfo();
  }, [token]);

  const handleConfirmReceipt = async () => {
    if (!token) return;
    setRedeeming(true);

    try {
      const res = await store.redeemDeliveryToken(token);
      if (res.success) {
        setConfirmed(true);
        if (res.batch) setBatch(res.batch);
        if (res.project) setProject(res.project);
        setRedeemedAt(res.redeemed_at || new Date().toISOString());
      } else {
        if (res.error === 'ALREADY_REDEEMED') {
          setErrorStatus('ALREADY_REDEEMED');
          setRedeemedAt(res.redeemed_at || 'Earlier');
        } else {
          setErrorStatus(res.error || 'ERROR');
          setErrorMessage(res.message);
        }
      }
    } catch (e: any) {
      setErrorStatus('ERROR');
      setErrorMessage(e.message || 'An unexpected error occurred while acknowledging receipt.');
    } finally {
      setRedeeming(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center space-y-4">
          <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <h2 className="text-lg font-semibold text-slate-800">Verifying Delivery Token...</h2>
          <p className="text-sm text-slate-500">Connecting securely to FundTrail Proof of Delivery...</p>
        </div>
      </div>
    );
  }

  // State A: Already Redeemed
  if (errorStatus === 'ALREADY_REDEEMED') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-emerald-50/30 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <div>
            <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full uppercase tracking-wider mb-2">
              Already Acknowledged
            </span>
            <h1 className="text-xl font-bold text-slate-900">Delivery Already Confirmed</h1>
            <p className="text-sm text-slate-600 mt-2">
              This delivery item was successfully confirmed by the recipient. Single-use cryptographic tokens prevent duplicate claims.
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 text-left border border-slate-100 space-y-2">
            <div className="text-xs text-slate-500 font-medium">Project</div>
            <div className="text-sm font-semibold text-slate-800">{project?.title || 'School Kit Support'}</div>
            <div className="text-xs text-slate-500 font-medium pt-2">Item Delivered</div>
            <div className="text-sm text-slate-700">{batch?.item_description || 'Standard Educational Kit'}</div>
            {redeemedAt && (
              <>
                <div className="text-xs text-slate-500 font-medium pt-2">Acknowledged At</div>
                <div className="text-xs text-slate-700 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                  {new Date(redeemedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                </div>
              </>
            )}
          </div>

          {project?.public_slug && (
            <Link
              to={`/r/${project.public_slug}`}
              className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 transition"
            >
              View Public Project Report <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>
    );
  }

  // State B: Invalid / Expired / Revoked
  if (errorStatus) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="w-9 h-9" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Acknowledgement Unavailable</h1>
            <p className="text-sm text-slate-600 mt-2">
              {errorMessage || 'This delivery acknowledgement token could not be verified.'}
            </p>
          </div>
          <Link
            to="/app"
            className="inline-block w-full py-3 px-4 rounded-xl text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
          >
            Return to FundTrail
          </Link>
        </div>
      </div>
    );
  }

  // State C: Successfully Confirmed Just Now
  if (confirmed) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-emerald-50/40 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl border border-emerald-100 p-8 max-w-md w-full text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-20 h-20 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-200">
            <PackageCheck className="w-11 h-11" />
          </div>

          <div>
            <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-full uppercase tracking-wider mb-2">
              Verified & Recorded
            </span>
            <h1 className="text-2xl font-bold text-slate-900">Thank You! Receipt Confirmed</h1>
            <p className="text-sm text-slate-600 mt-2">
              Your acknowledgement has been cryptographically recorded. It directly updates the public transparency report for donors and independent auditors.
            </p>
          </div>

          <div className="bg-emerald-50/70 border border-emerald-200/60 rounded-xl p-4 text-left space-y-2">
            <div className="text-xs text-emerald-800 font-semibold uppercase tracking-wider">Project</div>
            <div className="text-sm font-bold text-slate-900">{project?.title || 'School Kit Support'}</div>
            
            <div className="text-xs text-emerald-800 font-semibold uppercase tracking-wider pt-2">Item Acknowledged</div>
            <div className="text-sm text-slate-800">{batch?.item_description || 'Standard Educational Kit'}</div>

            <div className="text-xs text-emerald-800 font-semibold uppercase tracking-wider pt-2">Batch Reference</div>
            <div className="text-xs text-slate-600 font-mono">{batch?.batch_number || 'BATCH-01'} • {batch?.location_or_institution || 'Rajasthan'}</div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 flex items-start gap-2.5 text-left text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>Zero personal information was recorded. Your acknowledgement helps ensure charity funds reach authentic beneficiaries.</span>
          </div>

          {project?.public_slug && (
            <Link
              to={`/r/${project.public_slug}`}
              className="inline-flex items-center justify-center gap-2 w-full py-3.5 px-4 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md transition"
            >
              View Public Project Report <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>
    );
  }

  // State D: Ready to Confirm
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl border border-slate-200/80 p-8 max-w-lg w-full space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
              FT
            </div>
            <div>
              <span className="font-bold text-slate-900 tracking-tight">FundTrail</span>
              <span className="text-[10px] block text-emerald-600 font-semibold uppercase">Proof of Delivery</span>
            </div>
          </div>
          <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-mono font-medium">
            Single-Use QR
          </span>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-slate-900">Acknowledge Item Receipt</h1>
          <p className="text-sm text-slate-600 mt-1">
            Please confirm that you have received the charitable aid item described below.
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3.5">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Charity Project</span>
            <span className="text-base font-bold text-slate-900">{project?.title || 'School Kit Support'}</span>
          </div>

          <div className="border-t border-slate-200/60 pt-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Item Description</span>
            <span className="text-sm font-medium text-slate-800">{batch?.item_description || 'Standard Educational Kit'}</span>
          </div>

          <div className="border-t border-slate-200/60 pt-3 flex flex-wrap justify-between gap-2 text-xs text-slate-600">
            <div>
              <span className="text-slate-400 block font-medium">Distribution Batch</span>
              <span className="font-semibold text-slate-800">{batch?.batch_number || 'BATCH-01'}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Location</span>
              <span className="font-semibold text-slate-800">{batch?.location_or_institution || 'Designated Center'}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Date</span>
              <span className="font-semibold text-slate-800">{batch?.distribution_date || 'October 2026'}</span>
            </div>
          </div>
        </div>

        <div className="bg-emerald-50/60 border border-emerald-200/60 rounded-xl p-4 text-center">
          <p className="text-sm font-semibold text-emerald-950">
            "I confirm that I have received the item described above."
          </p>
        </div>

        <button
          onClick={handleConfirmReceipt}
          disabled={redeeming}
          className="w-full py-4 px-6 rounded-2xl font-bold text-base text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] shadow-lg shadow-emerald-200 transition disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {redeeming ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Recording Acknowledgement...
            </>
          ) : (
            <>
              <PackageCheck className="w-5 h-5" />
              CONFIRM RECEIPT
            </>
          )}
        </button>

        <p className="text-[11px] text-center text-slate-400 leading-relaxed">
          FundTrail Proof of Delivery operates without collecting names, identity numbers, or biometric data. Your confirmation updates aggregate metrics for public transparency.
        </p>
      </div>
    </div>
  );
};
