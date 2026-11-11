import React, { useState, useEffect } from 'react';
import { X, Copy, Check, ShieldCheck, Loader2, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatNaira } from '../utils/rules';

interface AddFundsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddFundsModal: React.FC<AddFundsModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, paymentAccount, fundingRequests, createFundingRequest, cancelFundingRequest, refreshUsers } = useApp();
  const [copied, setCopied] = useState(false);
  const [amount, setAmount] = useState<string>('2000');
  const [senderName, setSenderName] = useState<string>('');
  const [showNameField, setShowNameField] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [trackedRef, setTrackedRef] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const myRequests = fundingRequests.filter((r) => r.userId === currentUser.id);
  const tracked = trackedRef ? myRequests.find((r) => r.reference === trackedRef) : undefined;

  // Opening the window while a payment is still waiting shows that waiting screen straight away
  useEffect(() => {
    if (!isOpen || trackedRef) return;
    const waiting = myRequests.find((r) => r.status === 'PENDING');
    if (waiting) setTrackedRef(waiting.reference);
  }, [isOpen, trackedRef, myRequests]);

  // While waiting, check for the answer every 5 seconds
  useEffect(() => {
    if (!isOpen || tracked?.status !== 'PENDING') return;
    const timer = setInterval(() => refreshUsers(), 5000);
    return () => clearInterval(timer);
  }, [isOpen, tracked?.status, refreshUsers]);

  if (!isOpen) return null;

  const closeWindow = () => {
    if (!tracked || tracked.status !== 'PENDING') setTrackedRef(null);
    setErrorMsg(null);
    onClose();
  };

  const handleCopyAccount = () => {
    if (!paymentAccount) return;
    navigator.clipboard.writeText(paymentAccount.accountNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCancel = async () => {
    if (!tracked) return;
    if (!window.confirm('Cancel this payment notice? Only do this if you have NOT paid, or if you want to start again.')) return;
    setErrorMsg(null);
    setCancelling(true);
    const res = await cancelFundingRequest(tracked.id);
    setCancelling(false);
    if (!res.success) {
      setErrorMsg(res.error || 'Could not cancel this payment notice');
      return;
    }
    setTrackedRef(null);
  };

  const handleIHavePaid = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 100) {
      setErrorMsg('Minimum funding amount is ₦100.00');
      return;
    }
    setIsProcessing(true);
    const res = await createFundingRequest({
      amount: numAmount,
      senderName: senderName.trim() || currentUser.name,
      bank: '',
      note: '',
    });
    setIsProcessing(false);
    if (!res.success || !res.reference) {
      setErrorMsg(res.error || 'Could not submit your payment notice');
      return;
    }
    setTrackedRef(res.reference);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl liquid-glass-card shadow-2xl p-6 md:p-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-5 border-b border-neutral-200/80 dark:border-neutral-800">
          <div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight">Fund Wallet</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Transfer, then tap I Have Paid. That is all.
            </p>
          </div>
          <button
            onClick={closeWindow}
            className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* WAITING FOR CONFIRMATION */}
        {tracked?.status === 'PENDING' && (
          <div className="mt-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <Clock className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-neutral-900 dark:text-white">Waiting for confirmation</h4>
              <p className="text-xs text-neutral-500 mt-2 max-w-xs mx-auto leading-relaxed">
                We are checking your payment. This screen updates by itself. You can close it, and your wallet will
                be credited as soon as we confirm the money.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/80 border border-neutral-200 dark:border-neutral-800 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-neutral-400">Amount</span>
                <span className="font-mono font-bold text-neutral-900 dark:text-white">{formatNaira(tracked.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Reference</span>
                <span className="font-mono font-semibold text-neutral-900 dark:text-white">{tracked.reference}</span>
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 text-[11px] text-neutral-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Checking...
            </div>
            {errorMsg && (
              <div className="p-3 text-xs rounded-xl bg-red-50 text-red-600 border border-red-200">{errorMsg}</div>
            )}
            <button
              type="button"
              onClick={closeWindow}
              className="w-full py-3 px-4 rounded-xl border border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 font-semibold text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
            >
              Close
            </button>
            <button
              type="button"
              disabled={cancelling}
              onClick={handleCancel}
              className="text-xs text-red-600 underline hover:text-red-700 disabled:opacity-50"
            >
              {cancelling ? 'Cancelling...' : 'Cancel this payment'}
            </button>
          </div>
        )}

        {/* CONFIRMED */}
        {tracked?.status === 'APPROVED' && (
          <div className="mt-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-neutral-900 dark:text-white">Payment confirmed</h4>
              <p className="text-xs text-neutral-500 mt-2">
                {formatNaira(tracked.amountCredited ?? tracked.amount)} has been added to your wallet.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/80 border border-neutral-200 dark:border-neutral-800 text-xs flex justify-between">
              <span className="text-neutral-400">New wallet balance</span>
              <span className="font-mono font-bold text-neutral-900 dark:text-white">
                {formatNaira(currentUser.walletBalance)}
              </span>
            </div>
            <button
              type="button"
              onClick={closeWindow}
              className="w-full py-3 px-4 rounded-xl bg-neutral-950 text-white dark:bg-white dark:text-black font-semibold text-sm hover:opacity-90 transition shadow-md"
            >
              Done
            </button>
          </div>
        )}

        {/* NOT CONFIRMED */}
        {tracked?.status === 'REJECTED' && (
          <div className="mt-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-9 h-9" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-neutral-900 dark:text-white">We could not confirm this payment</h4>
              <p className="text-xs text-neutral-500 mt-2 max-w-xs mx-auto leading-relaxed">
                {tracked.reviewNote || 'The money did not reach our account.'} If you did pay, contact support with
                reference <span className="font-mono">{tracked.reference}</span>.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTrackedRef(null)}
                className="flex-1 py-3 px-4 rounded-xl bg-neutral-950 text-white dark:bg-white dark:text-black font-semibold text-sm hover:opacity-90 transition shadow-md"
              >
                Try again
              </button>
              <button
                type="button"
                onClick={closeWindow}
                className="px-5 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 font-semibold text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* PAY + I HAVE PAID */}
        {!tracked && (
          <div className="mt-6 space-y-4">
            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/80 border border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 mb-2">
                <span>1. Transfer to this account</span>
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
                      <span className="font-semibold text-neutral-800 dark:text-neutral-200">{paymentAccount.bank}</span>
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

            <form onSubmit={handleIHavePaid} className="space-y-3">
              <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">2. How much did you send?</p>
              <div className="grid grid-cols-4 gap-2">
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
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-sm font-mono tabular-nums"
                placeholder="Amount (₦)"
              />

              {showNameField ? (
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
              ) : (
                <button
                  type="button"
                  onClick={() => setShowNameField(true)}
                  className="text-[11px] text-neutral-500 underline hover:text-neutral-800"
                >
                  Paid from an account in a different name?
                </button>
              )}

              {errorMsg && (
                <div className="p-3 text-xs rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50">
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={isProcessing || !paymentAccount}
                className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm active:scale-[0.99] transition shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                I Have Paid
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
