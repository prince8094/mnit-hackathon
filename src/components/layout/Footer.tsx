import React from 'react';
import { ShieldCheck, ExternalLink, Globe } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-slate-200 mt-auto py-8 text-xs text-slate-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 text-slate-800 font-semibold mb-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>FundTrail — Evidence-Backed NGO Project Reporting</span>
            </div>
            <p className="max-w-xl text-slate-500 leading-relaxed text-[11px]">
              FundTrail anchors cryptographic fingerprints of published report snapshots onto Polygon Amoy (Chain ID 80002) to detect post-publication alterations. Anchoring validates data integrity relative to publication; it does not constitute an independent audit or guarantee delivery of physical items.
            </p>
          </div>

          <div className="flex flex-wrap gap-4 text-slate-600 text-[11px]">
            <a 
              href="https://amoy.polygonscan.com" 
              target="_blank" 
              rel="noreferrer"
              className="hover:text-emerald-700 flex items-center gap-1"
            >
              <Globe className="w-3.5 h-3.5" /> PolygonScan Amoy
            </a>
            <a 
              href="https://faucet.polygon.technology" 
              target="_blank" 
              rel="noreferrer"
              className="hover:text-emerald-700 flex items-center gap-1"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Polygon Faucet
            </a>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center text-[11px] text-slate-400">
          <div>Built for Transparent Charity Donations • Target: Grassroots Indian NGOs</div>
          <div className="mt-1 sm:mt-0">All monetary amounts shown in INR (₹)</div>
        </div>
      </div>
    </footer>
  );
};

