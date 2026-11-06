import React, { useState } from 'react';
import { X, Copy, Check, CreditCard, Building2, Smartphone, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatNaira } from '../utils/rules';

interface AddFundsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddFundsModal: React.FC<AddFundsModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, paymentAccount, fundingRequests, createFundingRequest } = useApp();
  const [activeTab, setActiveTab] = useState<'transfer' | 'card' | 'ussd'>('transfer');
  const [copied, setCopied] = useState(false);
  const [amount, setAmount] = useState<string>('2000');
  const [senderName, setSenderName] = useState<string>('');
  const [bank, setBank] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const myRequests = fundingRequests.filter((r) => r.userId === currentUser.id).slice(0, 3);

  const handleCopyAccount = () => {
    if (!paymentAccount) return;
    navigator.clipboard.writeText(paymentAccount.accountNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 100) {
      setErrorMsg('Minimum funding amount is ₦100.00');
      return;
    }
    if (!(senderName.trim() || currentUser.name)) {
      setErrorMsg('Enter the name on the account you paid from');
      return;
    }

    setIsProcessing(true);
    const res = await createFundingRequest({
      amount: numAmount,
      senderName: senderName.trim() || currentUser.name,
      bank: bank.trim(),
      note: note.trim(),
    });
    setIsProcessing(false);

    if (!res.success) {
      setErrorMsg(res.error || 'Could not submit your payment notice');
      return;
    }
    setSuccessMsg(
      `Payment notice ${res.reference} received. Your wallet will be credited as soon as we confirm ${formatNaira(numAmount)} in our bank.`
    );
    setNote('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl liquid-glass-card shadow-2xl p-6 md:p-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-5 border-b border-neutral-200/80 dark:border-neutral-800">
          <div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight">
              Fund Wallet
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Pay by bank transfer, then tell us so we can credit your wallet
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switchers */}
        <div className="grid grid-cols-3 gap-2 mt-5 p-1 bg-neutral-100 dark:bg-neutral-900 rounded-xl">
          <button
            onClick={() => setActiveTab('transfer')}
            className={`py-2 px-3 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition ${
              activeTab === 'transfer'
                ? 'bg-white dark:bg-neutral-800 text-neutral-950 dark:text-white shadow-sm'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Bank Transfer
          </button>
          <button
            onClick={() => setActiveTab('card')}
            className={`py-2 px-3 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition ${
              activeTab === 'card'
                ? 'bg-white dark:bg-neutral-800 text-neutral-950 dark:text-white shadow-sm'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            Debit Card
          </button>
          <button
            onClick={() => setActiveTab('ussd')}
            className={`py-2 px-3 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition ${
              activeTab === 'ussd'
                ? 'bg-white dark:bg-neutral-800 text-neutral-950 dark:text-white shadow-sm'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            USSD
          </button>
        </div>

        {successMsg && (
          <div className="mt-4 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold flex items-start gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="mt-4 p-3 text-xs rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50">
            {errorMsg}
          </div>
        )}

        {/* Tab 1: Bank Transfer */}
        {activeTab === 'transfer' && (
          <div className="mt-6 space-y-4">
            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/80 border border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 mb-2">
                <span>Step 1: Transfer to this account</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Verified by our team
                </span>
              </div>

              {paymentAccount ? (
                <>
                  <div className="flex items-center justify-between py-2 border-y border-neutral-200 dark:border-neutral-800 my-2">
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-neutral-400">Account Number</p>
                      <p className="text-2xl font-mono font-bold tracking-wider text-neutral-950 dark:text-white tabular-nums">
                        {paymentAccount.accountNumber}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyAccount}
                      className="px-3 py-2 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 text-xs font-medium flex items-center gap-1.5 hover:opacity-90 transition active:scale-95"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                    <div>
                      <span className="text-neutral-400 block text-[11px]">Bank Name</span>
                      <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                        {paymentAccount.bank}
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-400 block text-[11px]">Account Name</span>
                      <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                        {paymentAccount.accountName}
                      </span>
                    </div>
                  </div>
                  {paymentAccount.note && (
                    <p className="mt-2 text-[11px] text-neutral-500 dark:text-neutral-400">{paymentAccount.note}</p>
                  )}
                </>
              ) : (
                <p className="py-3 text-xs text-neutral-500 dark:text-neutral-400">
                  The funding account has not been set up yet. Please contact support.
                </p>
              )}
            </div>

            <form onSubmit={handleSubmitPayment} className="space-y-3">
              <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Step 2: After you pay, tell us the details
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-neutral-400 mb-1">Amount you sent (₦)</label>
                  <input
                    type="number"
                    min="100"
                    step="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-sm font-mono tabular-nums"
                    placeholder="Amount (₦)"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-neutral-400 mb-1">Bank you paid from</label>
                  <input
                    type="text"
                    value={bank}
                    onChange={(e) => setBank(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-sm"
                    placeholder="e.g. Kuda, GTBank"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Name on the account you paid from</label>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-sm"
                  placeholder={currentUser.name}
                />
              </div>
              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Transaction reference / session ID (optional)</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-sm font-mono"
                  placeholder="From your bank's receipt"
                />
              </div>
              <button
                type="submit"
                disabled={isProcessing || !paymentAccount}
                className="w-full py-3 px-4 rounded-xl bg-neutral-950 text-white dark:bg-white dark:text-black font-semibold text-sm hover:opacity-90 active:scale-[0.99] transition shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                I Have Paid - Submit for Confirmation
              </button>
            </form>

            {myRequests.length > 0 && (
              <div className="p-3.5 rounded-xl bg-neutral-100/70 dark:bg-neutral-900/50 border border-neutral-200/60 dark:border-neutral-800 text-xs">
                <p className="font-medium text-neutral-900 dark:text-neutral-200 mb-2">Your recent payment notices</p>
                <div className="space-y-1.5">
                  {myRequests.map((r) => (
                    <div key={r.id} className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="font-mono text-neutral-600 dark:text-neutral-400">
                        {r.reference} · {formatNaira(r.amount)}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full font-semibold ${
                          r.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : r.status === 'REJECTED'
                            ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {r.status === 'PENDING' ? 'WAITING' : r.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Debit Card (not connected yet) */}
        {activeTab === 'card' && (
          <div className="mt-6 p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/80 border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-600 dark:text-neutral-400 space-y-1.5">
            <p className="font-semibold text-neutral-900 dark:text-white">Card payments are not available yet</p>
            <p>Please use the Bank Transfer tab. Your wallet is credited as soon as we confirm your payment.</p>
          </div>
        )}

        {/* Tab 3: USSD (not connected yet) */}
        {activeTab === 'ussd' && (
          <div className="mt-6 p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/80 border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-600 dark:text-neutral-400 space-y-1.5">
            <p className="font-semibold text-neutral-900 dark:text-white">USSD payments are not available yet</p>
            <p>Please use the Bank Transfer tab. Your wallet is credited as soon as we confirm your payment.</p>
          </div>
        )}
      </div>
    </div>
  );
};
