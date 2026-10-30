import React from 'react';
import { ReviewStatus } from '../../types';
import { ShieldAlert, FileText, CheckCircle2, UserCheck } from 'lucide-react';

interface Props {
  status: ReviewStatus;
  showIcon?: boolean;
}

export const StatusBadge: React.FC<Props> = ({ status, showIcon = true }) => {
  switch (status) {
    case 'INDEPENDENTLY_VERIFIED':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
          {showIcon && <CheckCircle2 className="w-3.5 h-3.5" />}
          Independently Verified
        </span>
      );
    case 'NGO_REVIEWED':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-300">
          {showIcon && <UserCheck className="w-3.5 h-3.5" />}
          NGO Reviewed
        </span>
      );
    case 'DOCUMENT_UPLOADED':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300" title="A document has been uploaded by the NGO. This is not an independent audit.">
          {showIcon && <FileText className="w-3.5 h-3.5" />}
          Document Uploaded (Self-Reported)
        </span>
      );
    case 'NGO_REPORTED':
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300" title="Self-reported claim by the NGO. Not independently verified.">
          {showIcon && <ShieldAlert className="w-3.5 h-3.5 text-slate-500" />}
          Self-Reported by NGO
        </span>
      );
  }
};

