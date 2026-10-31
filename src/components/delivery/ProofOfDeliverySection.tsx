import React, { useState } from 'react';
import {
  PackageCheck,
  Plus,
  QrCode,
  Printer,
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Download,
  Users
} from 'lucide-react';
import { DistributionBatch, Project } from '../../types';
import { store } from '../../lib/store';
import {
  generateTokensForBatch,
  calculateDeliveryAggregates,
  GeneratedTokenCard
} from '../../lib/proof-of-delivery';

interface ProofOfDeliverySectionProps {
  project: Project;
  batches: DistributionBatch[];
  isVerifier?: boolean;
  onRefresh?: () => void;
}

export const ProofOfDeliverySection: React.FC<ProofOfDeliverySectionProps> = ({
  project,
  batches,
  isVerifier = false,
  onRefresh
}) => {
  const [isCreatingBatch, setIsCreatingBatch] = useState(false);
  const [batchName, setBatchName] = useState('');
  const [batchNumber, setBatchNumber] = useState(`BATCH-0${batches.length + 1}`);
  const [distributionDate, setDistributionDate] = useState(new Date().toISOString().split('T')[0]);
  const [location, setLocation] = useState('');
  const [itemDescription, setItemDescription] = useState('Standard Educational Kit');
  const [expectedQuantity, setExpectedQuantity] = useState('50');
  const [publicDescription, setPublicDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // QR Modal State
  const [activeBatchForQRs, setActiveBatchForQRs] = useState<DistributionBatch | null>(null);
  const [generatedCards, setGeneratedCards] = useState<GeneratedTokenCard[]>([]);
  const [generatingQRs, setGeneratingQRs] = useState(false);

  const stats = calculateDeliveryAggregates(batches);

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(expectedQuantity, 10);
    if (!batchName.trim() || !batchNumber.trim() || isNaN(qty) || qty <= 0) return;

    setSubmitting(true);
    try {
      const newBatch = await store.createDistributionBatch({
        organization_id: project.organization_id,
        project_id: project.id,
        batch_number: batchNumber.trim(),
        batch_name: batchName.trim(),
        distribution_date: distributionDate,
        location_or_institution: location.trim() || 'Designated Primary School',
        item_description: itemDescription.trim(),
        expected_quantity: qty,
        public_description: publicDescription.trim() || null,
        status: 'IN_PROGRESS'
      });

      // Generate tokens & hashes for new batch
      const { tokensToStore } = await generateTokensForBatch(newBatch);
      await store.storeDeliveryTokens(tokensToStore);

      setIsCreatingBatch(false);
      setBatchName('');
      setExpectedQuantity('50');
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Failed to create batch:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenQRs = async (batch: DistributionBatch) => {
    setActiveBatchForQRs(batch);
    setGeneratingQRs(true);

    try {
      const { cards, tokensToStore } = await generateTokensForBatch(batch);
      setGeneratedCards(cards);

      // Ensure tokens exist in store
      const existing = store.getDeliveryTokens(batch.id);
      if (existing.length === 0) {
        await store.storeDeliveryTokens(tokensToStore);
      }
    } catch (e) {
      console.error('QR generation error:', e);
    } finally {
      setGeneratingQRs(false);
    }
  };

  const handlePrintSheet = () => {
    window.print();
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center font-bold">
            <PackageCheck className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">QR-Based Proof of Delivery</h2>
            <p className="text-xs text-slate-500">
              Single-use beneficiary acknowledgement tokens with zero personal data collection
            </p>
          </div>
        </div>

        {!isVerifier && (
          <button
            onClick={() => setIsCreatingBatch(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
          >
            <Plus className="w-3.5 h-3.5" /> Create Distribution Batch
          </button>
        )}
      </div>

      {/* Aggregate Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/60">
          <span className="text-[11px] font-medium text-slate-500 block">Total Items Expected</span>
          <span className="text-xl font-bold text-slate-900 block mt-1">
            {stats.totalExpected.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-slate-400">{stats.batchesCount} distribution batches</span>
        </div>

        <div className="bg-emerald-50/60 rounded-xl p-3.5 border border-emerald-200/60">
          <span className="text-[11px] font-medium text-emerald-800 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Confirmed Receipts
          </span>
          <span className="text-xl font-bold text-emerald-950 block mt-1">
            {stats.totalAcknowledged.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-emerald-700">Digital QR acknowledgements</span>
        </div>

        <div className="bg-amber-50/60 rounded-xl p-3.5 border border-amber-200/60">
          <span className="text-[11px] font-medium text-amber-800 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-600" /> Pending Receipts
          </span>
          <span className="text-xl font-bold text-amber-950 block mt-1">
            {stats.totalPending.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-amber-700">Awaiting recipient scan</span>
        </div>

        <div className="bg-teal-50/60 rounded-xl p-3.5 border border-teal-200/60">
          <span className="text-[11px] font-medium text-teal-800 block">Acknowledgement Rate</span>
          <span className="text-xl font-bold text-teal-950 block mt-1">
            {stats.acknowledgementRatePercent}%
          </span>
          <div className="w-full bg-teal-200/60 rounded-full h-1.5 mt-1.5 overflow-hidden">
            <div
              className="bg-teal-600 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, stats.acknowledgementRatePercent)}%` }}
            />
          </div>
        </div>

        <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/60 col-span-2 md:col-span-1 flex flex-col justify-between">
          <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Privacy Standard
          </span>
          <span className="text-xs font-semibold text-slate-800">100% Zero-PII</span>
          <span className="text-[10px] text-slate-400">No minors' data or Aadhaar stored</span>
        </div>
      </div>

      {/* Distribution Batches List */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Active Distribution Batches ({batches.length})
        </h3>

        {batches.length === 0 ? (
          <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-6">
            <PackageCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-500 font-medium">No distribution batches created yet.</p>
            <p className="text-[11px] text-slate-400 mt-1">
              Create a batch to issue printable QR acknowledgement sheets for field distribution.
            </p>
          </div>
        ) : (
          batches.map((batch) => {
            const pct = batch.expected_quantity > 0 ? Math.round((batch.acknowledged_count / batch.expected_quantity) * 100) : 0;
            return (
              <div
                key={batch.id}
                className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:border-slate-300 transition"
              >
                <div className="space-y-1.5 max-w-xl">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-slate-200 text-slate-800 text-[11px] font-mono font-bold rounded">
                      {batch.batch_number}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900">{batch.batch_name}</h4>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-semibold rounded-full">
                      {batch.status}
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span><strong>Item:</strong> {batch.item_description}</span>
                    <span><strong>Date:</strong> {batch.distribution_date}</span>
                    <span><strong>Location:</strong> {batch.location_or_institution}</span>
                  </div>

                  {batch.public_description && (
                    <p className="text-[11px] text-slate-500 italic">{batch.public_description}</p>
                  )}
                </div>

                {/* Progress & Actions */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 shrink-0">
                  <div className="w-44 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500 font-medium">Delivered:</span>
                      <span className="font-bold text-slate-800">
                        {batch.acknowledged_count} / {batch.expected_quantity} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenQRs(batch)}
                      className="px-3 py-1.5 bg-white border border-slate-300 hover:border-emerald-500 hover:text-emerald-700 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-sm"
                    >
                      <QrCode className="w-3.5 h-3.5 text-emerald-600" />
                      View QR Codes
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Batch Modal */}
      {isCreatingBatch && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-4">
            <h3 className="font-bold text-lg text-slate-900">Create Distribution Batch</h3>
            <p className="text-xs text-slate-500">
              Generate one-time QR acknowledgement tokens for field distribution. Tokens expire in 60 days and guarantee single-use receipt tracking.
            </p>

            <form onSubmit={handleCreateBatch} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Batch Number</label>
                  <input
                    type="text"
                    required
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:border-emerald-500 focus:outline-none"
                    placeholder="BATCH-01"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Distribution Date</label>
                  <input
                    type="date"
                    required
                    value={distributionDate}
                    onChange={(e) => setDistributionDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Batch Title / Campaign Name</label>
                <input
                  type="text"
                  required
                  value={batchName}
                  onChange={(e) => setBatchName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:border-emerald-500 focus:outline-none"
                  placeholder="e.g. Sanganer Village Rural School Kit Drive"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Item Description</label>
                  <input
                    type="text"
                    required
                    value={itemDescription}
                    onChange={(e) => setItemDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:border-emerald-500 focus:outline-none"
                    placeholder="e.g. School Kit (Bag, Stationery, Notebooks)"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    required
                    value={expectedQuantity}
                    onChange={(e) => setExpectedQuantity(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:border-emerald-500 focus:outline-none"
                    placeholder="60"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Distribution Location / Institution</label>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:border-emerald-500 focus:outline-none"
                  placeholder="e.g. Govt Primary School, Sanganer, Jaipur"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Public Notes / Description (Optional)</label>
                <textarea
                  rows={2}
                  value={publicDescription}
                  onChange={(e) => setPublicDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:border-emerald-500 focus:outline-none"
                  placeholder="Details for public report view..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingBatch(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Generating Cryptographic Tokens...' : 'Generate Batch & Tokens'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Codes Viewer & Printable Distribution Sheet Modal */}
      {activeBatchForQRs && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <span className="text-[11px] font-mono font-bold text-emerald-700 uppercase bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {activeBatchForQRs.batch_number} • {activeBatchForQRs.expected_quantity} Items
                </span>
                <h3 className="font-bold text-base text-slate-900 mt-1">
                  Distribution Sheet & Printable QR Tokens: {activeBatchForQRs.batch_name}
                </h3>
                <p className="text-xs text-slate-500">
                  Item: {activeBatchForQRs.item_description} • Location: {activeBatchForQRs.location_or_institution}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintSheet}
                  className="px-3 py-1.5 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Sheet
                </button>
                <button
                  onClick={() => setActiveBatchForQRs(null)}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold transition"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Modal Content / QR Grid */}
            <div className="p-6 overflow-y-auto flex-1 bg-slate-100/60">
              {generatingQRs ? (
                <div className="py-16 text-center space-y-3">
                  <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs font-medium text-slate-600">Generating cryptographic QR tokens...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800 flex items-center justify-between">
                    <span>
                      Each QR code below contains an unguessable single-use token. Field recipients can scan with any phone camera to acknowledge receipt at <code>/ack/:token</code>.
                    </span>
                    <span className="font-semibold text-emerald-900 shrink-0 ml-2">Zero-PII</span>
                  </div>

                  {/* QR Cards Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 print:grid-cols-3 print:gap-2">
                    {generatedCards.slice(0, 36).map((card) => (
                      <div
                        key={card.recipientIndex}
                        className="bg-white rounded-2xl p-3.5 border border-slate-200 text-center space-y-2 shadow-sm"
                      >
                        <div className="text-[11px] font-bold text-slate-700 flex items-center justify-between border-b border-slate-100 pb-1">
                          <span>Token #{card.recipientIndex}</span>
                          <span className="text-[9px] font-mono text-slate-400">
                            {card.tokenHash.slice(0, 8)}
                          </span>
                        </div>

                        <img
                          src={card.qrDataUrl}
                          alt={`QR Token #${card.recipientIndex}`}
                          className="w-32 h-32 mx-auto rounded-lg"
                        />

                        <div className="text-[10px] text-slate-500 font-medium truncate">
                          {activeBatchForQRs.item_description}
                        </div>

                        <a
                          href={card.acknowledgementUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-semibold hover:underline"
                        >
                          Test Acknowledge <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    ))}
                  </div>

                  {generatedCards.length > 36 && (
                    <p className="text-xs text-center text-slate-500 pt-2">
                      Showing first 36 QR tokens. Click "Print Sheet" to print complete batch.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

