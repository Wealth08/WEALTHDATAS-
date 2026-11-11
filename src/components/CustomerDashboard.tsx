import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Copy, 
  Check, 
  Download, 
  ExternalLink, 
  Search, 
  Volume2, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  FileText,
  ShieldCheck,
  Building,
  CreditCard,
  PhoneCall,
  UserCheck,
  Flame,
  ArrowUpRight
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ServiceItem } from '../types';
import { formatNaira } from '../utils/rules';
import { downloadBase64Pdf } from '../utils/downloadPdf';

interface CustomerDashboardProps {
  onSelectService: (service: ServiceItem) => void;
  onOpenAddFunds: () => void;
  activeCategoryFilter?: string;
}

export const CustomerDashboard: React.FC<CustomerDashboardProps> = ({
  onSelectService,
  onOpenAddFunds,
  activeCategoryFilter = 'ALL',
}) => {
  const { currentUser, services, transactions, recentVerifications, paymentAccount, fundingRequests } = useApp();
  const waitingPayment = fundingRequests.find((r) => r.userId === currentUser.id && r.status === 'PENDING');
  const [copiedDVA, setCopiedDVA] = useState(false);
  const [displayBalance, setDisplayBalance] = useState(currentUser.walletBalance);

  // Smooth animated wallet balance counter
  useEffect(() => {
    let start = displayBalance;
    const end = currentUser.walletBalance;
    if (start === end) return;

    const duration = 600;
    const startTime = performance.now();

    const updateCounter = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const current = start + (end - start) * progress;
      setDisplayBalance(Math.round(current * 100) / 100);

      if (progress < 1) {
        requestAnimationFrame(updateCounter);
      }
    };

    requestAnimationFrame(updateCounter);
  }, [currentUser.walletBalance]);

  const handleCopyDVA = () => {
    if (!paymentAccount) return;
    navigator.clipboard.writeText(paymentAccount.accountNumber);
    setCopiedDVA(true);
    setTimeout(() => setCopiedDVA(false), 2000);
  };

  const filteredServices = services.filter((s) => {
    if (activeCategoryFilter === 'ALL') return true;
    if (activeCategoryFilter === 'NIN') return s.category === 'NIN';
    if (activeCategoryFilter === 'BVN') return s.category === 'BVN';
    if (activeCategoryFilter === 'CLEARANCE') return s.category === 'CLEARANCE';
    if (activeCategoryFilter === 'MODIFICATION') return s.category === 'MODIFICATION';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Welcome Banner matching Image 1 */}
      <div>
        <h1 className="text-3xl font-extrabold text-neutral-950 dark:text-white tracking-tight">
          Welcome, {currentUser.name.split(' ')[0]}!
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Ready to manage your identity & verification services?
        </p>
      </div>

      {/* Notice Banner matching Image 1 with speaker icon */}
      <div className="p-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/40 flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
          <Volume2 className="w-4 h-4" />
        </div>
        <div className="text-xs text-blue-950 dark:text-blue-200 leading-relaxed font-medium">
          <span className="font-bold">System Notice:</span> Services have been upgraded. IPE Clearance is processed within 24 - 48 Hours. Newspaper Publication is going within 24 - 48 Hours. Instant NIN and BVN Premium Slips generate in 2 seconds. Full auto-refund is guaranteed if any manual ticket cannot be cleared.
        </div>
      </div>

      {/* Wallet Balance Card matching Image 1 layout */}
      <div className="p-6 md:p-7 rounded-3xl liquid-glass-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-neutral-400 block mb-1">
            Wallet Balance
          </span>
          <div className="text-3xl md:text-4xl font-mono font-extrabold text-neutral-950 dark:text-white tabular-nums tracking-tight">
            {formatNaira(displayBalance)}
          </div>
          <span className="text-[11px] text-neutral-400 mt-1 block">
            Tier: <strong className="text-neutral-800 dark:text-neutral-200">{currentUser.tier}</strong> · User ID: {currentUser.id}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenAddFunds}
            className="px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-blue-600/20 active:scale-95 transition"
          >
            <Plus className="w-4 h-4" />
            Add Funds
          </button>
        </div>
      </div>

      {waitingPayment && (
        <button
          type="button"
          onClick={onOpenAddFunds}
          className="w-full text-left p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-3 text-xs"
        >
          <span className="font-semibold text-amber-900">
            Your payment of {formatNaira(waitingPayment.amount)} is waiting for confirmation
          </span>
          <span className="font-semibold text-amber-700">View</span>
        </button>
      )}

      {/* Dedicated Virtual Account (DVA) Bar */}
      <div className="p-4 md:p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-900/70 border border-neutral-200/80 dark:border-neutral-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 flex items-center justify-center font-mono font-bold text-xs shrink-0">
            DVA
          </div>
          <div>
            <span className="text-neutral-400 text-[11px] block font-medium">
              Wealthdatas Funding Account (transfer, then tap Add Funds to confirm)
            </span>
            <div className="flex items-center gap-2 font-mono font-bold text-neutral-900 dark:text-white text-sm">
              <span>{paymentAccount ? paymentAccount.bank : 'Funding account'}:</span>
              <span className="tracking-wider">{paymentAccount ? paymentAccount.accountNumber : 'Not set up yet'}</span>
            </div>
            <span className="text-[10px] text-neutral-500">
              Account Name: {paymentAccount ? paymentAccount.accountName : '-'}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCopyDVA}
          className="self-start md:self-center px-4 py-2 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 font-semibold text-xs flex items-center gap-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition"
        >
          {copiedDVA ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          {copiedDVA ? 'Account Copied' : 'Copy Account'}
        </button>
      </div>

      {/* OUR SERVICES section matching Image 1 layout */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-900 dark:text-white">
            Our Services ({filteredServices.length})
          </h2>
          <span className="text-xs text-neutral-400 font-medium">Click any card to begin</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredServices.map((service) => (
            <div
              key={service.id}
              onClick={() => onSelectService(service)}
              className="group p-5 rounded-3xl liquid-glass-card hover:border-neutral-400 dark:hover:border-neutral-600 cursor-pointer transition-all duration-200 flex flex-col justify-between h-48 relative overflow-hidden"
            >
              {/* Top Row: Service Emblem */}
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center p-2.5 group-hover:scale-105 transition-transform">
                  {service.category === 'NIN' ? (
                    <div className="w-full h-full rounded-full bg-emerald-600/15 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold text-[10px]">
                      NIMC
                    </div>
                  ) : service.category === 'BVN' ? (
                    <div className="w-full h-full rounded-full bg-amber-600/15 text-amber-700 dark:text-amber-400 flex items-center justify-center font-bold text-[10px]">
                      NIBSS
                    </div>
                  ) : service.category === 'CLEARANCE' ? (
                    <div className="w-full h-full rounded-full bg-blue-600/15 text-blue-700 dark:text-blue-400 flex items-center justify-center font-bold text-[10px]">
                      IPE
                    </div>
                  ) : (
                    <div className="w-full h-full rounded-full bg-purple-600/15 text-purple-700 dark:text-purple-400 flex items-center justify-center font-bold text-[10px]">
                      MOD
                    </div>
                  )}
                </div>

                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 font-semibold">
                  {service.turnaround}
                </span>
              </div>

              {/* Middle Title */}
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                  {service.title}
                </h3>
                <p className="text-[11px] text-neutral-500 line-clamp-1 mt-0.5">
                  {service.description}
                </p>
              </div>

              {/* Bottom Row: Exact Pricing */}
              <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800/80">
                <span className="text-xs font-mono font-bold text-neutral-950 dark:text-white tabular-nums">
                  {formatNaira(service.price)}
                </span>
                <span className="text-[11px] text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-white font-semibold flex items-center gap-0.5">
                  Select <ArrowUpRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Verifications & Quick Downloads */}
      {recentVerifications.length > 0 && (
        <div className="p-6 rounded-3xl liquid-glass-card space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-200/80 dark:border-neutral-800">
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-900 dark:text-white">
              Recent Verifications Ready for PDF Download
            </h3>
            <span className="text-xs text-neutral-500 font-medium">Session Slips</span>
          </div>

          <div className="space-y-2">
            {recentVerifications.map((rec, i) => (
              <div
                key={i}
                className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-bold text-neutral-900 dark:text-white">
                    {rec.data.lastName} {rec.data.firstName}
                  </span>
                  <div className="text-[11px] font-mono text-neutral-400">
                    ID: {rec.data.nin || rec.data.bvn} · LGA: {rec.data.lga}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const ok = downloadBase64Pdf(rec.pdfBase64 || '', `Wealthdatas_Slip_${rec.queryParam}.pdf`);
                    if (!ok) alert('This slip is no longer available to download. Please run the verification again.');
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 text-xs font-semibold flex items-center gap-1.5 hover:opacity-90 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Slip (PDF)
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Transactions Ledger */}
      <div className="p-6 rounded-3xl liquid-glass-card space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-200/80 dark:border-neutral-800">
          <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-900 dark:text-white">
            Recent Wallet Transactions
          </h3>
          <span className="text-xs text-neutral-400 font-medium">Latest Activity</span>
        </div>

        <div className="space-y-2">
          {transactions.slice(0, 5).map((t) => (
            <div
              key={t.id}
              className="p-3 rounded-2xl bg-neutral-50/60 dark:bg-neutral-900/40 border border-neutral-200/60 dark:border-neutral-800 flex items-center justify-between text-xs"
            >
              <div>
                <p className="font-semibold text-neutral-900 dark:text-white">{t.description}</p>
                <p className="text-[11px] font-mono text-neutral-400">
                  Ref: {t.reference} · {new Date(t.createdAt).toLocaleDateString()}
                </p>
              </div>

              <div className="text-right font-mono font-bold text-sm tabular-nums">
                <span
                  className={
                    t.type === 'CREDIT' || t.type === 'REFUND'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-neutral-900 dark:text-white'
                  }
                >
                  {t.type === 'DEBIT' ? '-' : '+'}
                  {formatNaira(t.amount)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
