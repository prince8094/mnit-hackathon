import React from 'react';
import { VerificationState } from '../../types';
import { CheckCircle2, AlertTriangle, AlertCircle, HelpCircle } from 'lucide-react';

interface Props {
  state: VerificationState;
}

export const IntegrityBadge: React.FC<Props> = ({ state }) => {
  switch (state) {
    case 'MATCH':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-400">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          MATCH: Integrity Check Passed
        </span>
      );
    case 'MISMATCH':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-400 animate-pulse">
          <AlertCircle className="w-4 h-4 text-red-600" />
          MISMATCH: Tampered or Modified Content
        </span>
      );
    case 'UNAVAILABLE':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-800 border border-orange-400">
          <AlertTriangle className="w-4 h-4 text-orange-600" />
          UNAVAILABLE: Network/RPC Offline
        </span>
      );
    case 'NOT ANCHORED':
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
          <HelpCircle className="w-4 h-4 text-slate-500" />
          NOT ANCHORED: Draft Report
        </span>
      );
  }
};

