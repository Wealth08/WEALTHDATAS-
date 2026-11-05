import React, { useState } from 'react';
import { X, Copy, Check, CreditCard, Building2, Smartphone, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatNaira } from '../utils/rules';

interface AddFundsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddFundsModal: React.FC<AddFundsModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, creditWallet } = useApp();
  const [activeTab, setActiveTab] = useState<'transfer' | 'card' | 'ussd'>('transfer');
  const [copied, setCopied] = useState(false);
  const [amount, setAmount] = useState<string>('2000');
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopyAccount = () => {
    navigator.clipboard.writeText(currentUser.virtualAccount.accountNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSimulatePayment = (channel: 'CARD' | 'USSD' | 'VIRTUAL_ACCOUNT') => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 100) {
      alert('Minimum funding amount is ₦100.00');
      return;
    }

    setIsProcessing(true);
    setSuccessMsg(null);

    // Simulate Paystack / Monnify webhook roundtrip (1.2s)
    setTimeout(async () => {
      const res = await creditWallet(numAmount, channel, `Instant automated checkout via ${channel}`);
      setIsProcessing(false);
      if (!res.success) {
        alert(res.error || 'Funding could not be completed');
        return;
      }
      setSuccessMsg(`Success! ${formatNaira(numAmount)} credited to your wallet.`);
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 1800);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl liquid-glass-card shadow-2xl p-6 md:p-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-5 border-b border-neutral-200/80 dark:border-neutral-800">
          <div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight">
              Fund Wallet
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Automated top-up with Paystack & Monnify virtual accounts
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
          <div className="mt-4 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            {successMsg}
          </div>
        )}

        {/* Tab 1: Dedicated Virtual Account (Bank Transfer) */}
        {activeTab === 'transfer' && (
          <div className="mt-6 space-y-4">
            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/80 border border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 mb-2">
                <span>Permanent Dedicated Virtual Account</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Instant Webhook Active
                </span>
              </div>

              <div className="flex items-center justify-between py-2 border-y border-neutral-200 dark:border-neutral-800 my-2">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-neutral-400">Account Number</p>
                  <p className="text-2xl font-mono font-bold tracking-wider text-neutral-950 dark:text-white tabular-nums">
                    {currentUser.virtualAccount.accountNumber}
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
                    {currentUser.virtualAccount.bankName}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-400 block text-[11px]">Account Name</span>
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                    {currentUser.virtualAccount.accountName}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-neutral-100/70 dark:bg-neutral-900/50 border border-neutral-200/60 dark:border-neutral-800 text-xs text-neutral-600 dark:text-neutral-400">
              <p className="font-medium text-neutral-900 dark:text-neutral-200 mb-1">
                How Dedicated Bank Transfer Works:
              </p>
              <ul className="space-y-1 text-[11px] list-disc list-inside">
                <li>Transfer any amount from your banking app (Kuda, OPay, GTBank, Zenith, etc.) to this account.</li>
                <li>Our Monnify & Paystack webhook credits your wallet balance automatically within 5 seconds.</li>
                <li>Zero stamp duty fees for verified cybercafes and retail agents.</li>
              </ul>
            </div>

            {/* Quick Simulation Trigger for Transfer */}
            <div className="pt-2">
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Simulate Direct Bank Transfer (Test Mode)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="100"
                  step="100"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-sm font-mono tabular-nums"
                  placeholder="Amount (₦)"
                />
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => handleSimulatePayment('VIRTUAL_ACCOUNT')}
                  className="px-5 py-2.5 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-black font-semibold text-xs whitespace-nowrap hover:opacity-90 active:scale-95 transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  Simulate Transfer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Debit Card (Paystack Inline Checkout) */}
        {activeTab === 'card' && (
          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Select or Enter Top-Up Amount
              </label>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {['1000', '2000', '5000', '10000'].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAmount(val)}
                    className={`py-2 text-xs font-mono font-medium rounded-xl border transition ${
                      amount === val
                        ? 'border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-black'
                        : 'border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:border-neutral-400'
                    }`}
                  >
                    ₦{parseInt(val).toLocaleString()}
                  </button>
                ))}
              </div>
              <input
                type="number"
                min="100"
                step="100"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-sm font-mono tabular-nums"
                placeholder="Custom Amount (₦)"
              />
            </div>

            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/80 border border-neutral-200 dark:border-neutral-800 text-xs space-y-2">
              <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                <span>Gateway Processor</span>
                <span className="font-semibold text-neutral-900 dark:text-white">Paystack Inline</span>
              </div>
              <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                <span>Top-up Amount</span>
                <span className="font-mono font-bold text-neutral-900 dark:text-white">
                  {formatNaira(parseFloat(amount) || 0)}
                </span>
              </div>
              <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                <span>Processing Fee</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">₦0.00 (Zero Fee)</span>
              </div>
            </div>

            <button
              type="button"
              disabled={isProcessing}
              onClick={() => handleSimulatePayment('CARD')}
              className="w-full py-3 px-4 rounded-xl bg-neutral-950 text-white dark:bg-white dark:text-black font-semibold text-sm hover:opacity-90 active:scale-[0.99] transition shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying Card Webhook...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  Pay with Card ({formatNaira(parseFloat(amount) || 0)})
                </>
              )}
            </button>
          </div>
        )}

        {/* Tab 3: USSD Banking */}
        {activeTab === 'ussd' && (
          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Amount to Top-Up
              </label>
              <input
                type="number"
                min="100"
                step="100"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-sm font-mono tabular-nums mb-3"
                placeholder="Amount (₦)"
              />
            </div>

            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/80 border border-neutral-200 dark:border-neutral-800">
              <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-2">
                Direct USSD String (GTBank, Zenith, Access, UBA)
              </p>
              <div className="p-3 bg-neutral-950 text-neutral-100 rounded-xl font-mono text-xs tracking-wider flex items-center justify-between">
                <span>*737*50*{(parseFloat(amount) || 2000)}*9012384729#</span>
                <span className="text-[10px] bg-neutral-800 px-2 py-0.5 rounded text-neutral-300">GTBank</span>
              </div>
            </div>

            <button
              type="button"
              disabled={isProcessing}
              onClick={() => handleSimulatePayment('USSD')}
              className="w-full py-3 px-4 rounded-xl bg-neutral-950 text-white dark:bg-white dark:text-black font-semibold text-sm hover:opacity-90 active:scale-[0.99] transition shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Confirming USSD Push...
                </>
              ) : (
                <>
                  <Smartphone className="w-4 h-4" />
                  Authorize USSD Payment
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
