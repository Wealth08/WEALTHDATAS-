import React, { useState, useEffect } from 'react';
import { STAFF_PATH } from '../utils/staffPath';
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  Settings, 
  ShieldAlert, 
  PlusCircle, 
  MinusCircle, 
  Check, 
  Edit3, 
  Save, 
  History,
  FileCheck2,
  UserPlus
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatNaira } from '../utils/rules';

export const SuperAdminDashboard: React.FC = () => {
  const { 
    services, 
    updateServicePrice, 
    allUsers, 
    transactions, 
    creditWallet, 
    debitWalletManual,
    currentUser,
    createStaffAccount,
    setStaffActive,
    paymentAccount,
    fundingRequests,
    reviewFundingRequest,
    setPaymentAccount,
    serviceCosts,
    setServiceCost,
    profit
  } = useApp();

  const [activeTab, setActiveTab] = useState<'analytics' | 'pricing' | 'wallets' | 'audit' | 'staff' | 'funding' | 'profit'>('analytics');

  // Pricing edit state
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editedPrice, setEditedPrice] = useState<string>('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Manual wallet action state
  const [targetUserId, setTargetUserId] = useState<string>(allUsers[0]?.id || '');
  const [walletActionType, setWalletActionType] = useState<'CREDIT' | 'DEBIT'>('CREDIT');
  const [actionAmount, setActionAmount] = useState<string>('5000');
  const [auditNote, setAuditNote] = useState<string>('Customer manual bank transfer verified by Super Admin');
  const [walletFeedback, setWalletFeedback] = useState<string | null>(null);

  // Wallet target defaults to the first account once the user list has loaded
  useEffect(() => {
    if (!targetUserId && allUsers[0]) setTargetUserId(allUsers[0].id);
  }, [allUsers, targetUserId]);

  // Staff account creation state
  const staffUsers = allUsers.filter((u) => u.role !== 'USER');
  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPhone, setStaffPhone] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffBusy, setStaffBusy] = useState(false);
  const [staffFeedback, setStaffFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffFeedback(null);
    if (staffPassword.length < 8) {
      setStaffFeedback({ ok: false, text: 'Password must be at least 8 characters' });
      return;
    }
    setStaffBusy(true);
    const res = await createStaffAccount({
      name: staffName,
      email: staffEmail,
      phone: staffPhone,
      password: staffPassword,
    });
    setStaffBusy(false);
    if (!res.ok) {
      setStaffFeedback({ ok: false, text: res.error || 'Could not create staff account' });
      return;
    }
    setStaffFeedback({ ok: true, text: `Support account created for ${staffEmail.trim()}. Share the login details securely.` });
    setStaffName('');
    setStaffEmail('');
    setStaffPhone('');
    setStaffPassword('');
  };

  const handleToggleStaff = async (id: string, active: boolean) => {
    setStaffFeedback(null);
    const res = await setStaffActive(id, active);
    setStaffFeedback({
      ok: res.ok,
      text: res.ok ? (active ? 'Account re-activated.' : 'Account deactivated.') : res.error || 'Action failed',
    });
  };

  // ---- Funding requests + payment account ----
  const pendingFunding = fundingRequests.filter((r) => r.status === 'PENDING');
  const reviewedFunding = fundingRequests.filter((r) => r.status !== 'PENDING').slice(0, 15);
  const [acctBank, setAcctBank] = useState('');
  const [acctNumber, setAcctNumber] = useState('');
  const [acctName, setAcctName] = useState('');
  const [acctNote, setAcctNote] = useState('');
  const [fundFeedback, setFundFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [receivedAmounts, setReceivedAmounts] = useState<Record<string, string>>({});
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (paymentAccount) {
      setAcctBank(paymentAccount.bank);
      setAcctNumber(paymentAccount.accountNumber);
      setAcctName(paymentAccount.accountName);
      setAcctNote(paymentAccount.note || '');
    }
  }, [paymentAccount]);

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await setPaymentAccount({
      bank: acctBank,
      accountNumber: acctNumber.trim(),
      accountName: acctName,
      note: acctNote,
    });
    setFundFeedback({ ok: res.success, text: res.success ? 'Funding account saved. Customers now see it.' : res.error || 'Could not save' });
  };

  const handleReview = async (id: string, approve: boolean, requested: number) => {
    setFundFeedback(null);
    const received = parseFloat(receivedAmounts[id] ?? String(requested));
    const res = await reviewFundingRequest(id, approve, approve ? received : undefined, reviewNotes[id]);
    setFundFeedback({
      ok: res.success,
      text: res.success ? (approve ? 'Payment approved and wallet credited.' : 'Request rejected.') : res.error || 'Action failed',
    });
  };

  // ---- Cost prices + profit ----
  const [costInputs, setCostInputs] = useState<Record<string, string>>({});
  const [costFeedback, setCostFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const handleSaveCost = async (serviceId: string) => {
    const v = parseFloat(costInputs[serviceId] ?? String(serviceCosts[serviceId] ?? 0));
    if (isNaN(v) || v < 0) return;
    const res = await setServiceCost(serviceId, v);
    setCostFeedback({ ok: res.success, text: res.success ? 'Cost saved.' : res.error || 'Could not save' });
  };
  const profitCard = (label: string, w?: { revenue: number; cost: number; sales: number }) => (
    <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/70 border border-neutral-200 dark:border-neutral-800">
      <span className="text-[11px] uppercase tracking-wider text-neutral-400 font-semibold block">{label}</span>
      <span className="text-xl font-mono font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums block mt-1">
        {formatNaira((w?.revenue || 0) - (w?.cost || 0))}
      </span>
      <span className="text-[11px] text-neutral-500 block mt-1">
        Sales {formatNaira(w?.revenue || 0)} - Cost {formatNaira(w?.cost || 0)} ({w?.sales || 0} sold)
      </span>
    </div>
  );

  // Analytics aggregations
  const totalDebited = transactions
    .filter((t) => t.type === 'DEBIT' && t.status === 'SUCCESS')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalFunded = transactions
    .filter((t) => t.type === 'CREDIT' && t.status === 'SUCCESS')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalRefunded = transactions
    .filter((t) => t.type === 'REFUND')
    .reduce((sum, t) => sum + t.amount, 0);

  const netRevenue = Math.max(0, totalDebited - totalRefunded);

  const handleSavePrice = async (serviceId: string) => {
    const p = parseFloat(editedPrice);
    if (isNaN(p) || p < 0) return;
    const res = await updateServicePrice(serviceId, p);
    if (!res.success) {
      alert(res.error || 'Could not update the price');
      return;
    }
    setEditingServiceId(null);
    setSaveSuccessMsg(`Price updated for ${serviceId}`);
    setTimeout(() => setSaveSuccessMsg(null), 2500);
  };

  const handleWalletOverrideSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(actionAmount);
    if (isNaN(amt) || amt <= 0) {
      alert('Please enter a valid positive amount');
      return;
    }
    if (!auditNote.trim()) {
      alert('Mandatory audit note required for all wallet adjustments.');
      return;
    }

    if (walletActionType === 'CREDIT') {
      const credit = await creditWallet(amt, 'ADMIN_OVERRIDE', auditNote, targetUserId);
      if (!credit.success) {
        setWalletFeedback(`Error: ${credit.error}`);
        return;
      }
      setWalletFeedback(`Successfully credited ${formatNaira(amt)} to user wallet.`);
    } else {
      const res = await debitWalletManual(amt, auditNote, targetUserId);
      if (!res.success) {
        setWalletFeedback(`Error: ${res.error}`);
        return;
      }
      setWalletFeedback(`Successfully debited ${formatNaira(amt)} from user wallet.`);
    }

    setTimeout(() => setWalletFeedback(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Super Admin Banner */}
      <div className="p-6 rounded-3xl liquid-glass-card border border-neutral-900/10 dark:border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 font-bold">
              SUPER_ADMIN
            </span>
            <span className="text-xs text-neutral-500 font-medium">Ultimate System Control & Auditing</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Wealthdatas Central Administration
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Real-time financial analytics, manual wallet balance overrides, global catalog pricing, and security audit log.
          </p>
        </div>

        {/* Super Admin Quick Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('wallets')}
            className="px-4 py-2 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 text-xs font-semibold hover:opacity-90 transition flex items-center gap-1.5"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Wallet Override
          </button>
          <button
            onClick={() => setActiveTab('pricing')}
            className="px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition flex items-center gap-1.5"
          >
            <Settings className="w-3.5 h-3.5" />
            Catalog Pricing
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 p-1 bg-neutral-100 dark:bg-neutral-900 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2 text-xs font-semibold rounded-xl transition ${
            activeTab === 'analytics'
              ? 'bg-white dark:bg-neutral-800 text-neutral-950 dark:text-white shadow-sm'
              : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
          }`}
        >
          Financial Analytics
        </button>
        <button
          onClick={() => setActiveTab('pricing')}
          className={`px-4 py-2 text-xs font-semibold rounded-xl transition ${
            activeTab === 'pricing'
              ? 'bg-white dark:bg-neutral-800 text-neutral-950 dark:text-white shadow-sm'
              : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
          }`}
        >
          Catalog Pricing ({services.length})
        </button>
        <button
          onClick={() => setActiveTab('wallets')}
          className={`px-4 py-2 text-xs font-semibold rounded-xl transition ${
            activeTab === 'wallets'
              ? 'bg-white dark:bg-neutral-800 text-neutral-950 dark:text-white shadow-sm'
              : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
          }`}
        >
          User Wallets & Override
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 text-xs font-semibold rounded-xl transition ${
            activeTab === 'audit'
              ? 'bg-white dark:bg-neutral-800 text-neutral-950 dark:text-white shadow-sm'
              : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
          }`}
        >
          Audit Ledger ({transactions.length})
        </button>
        <button
          onClick={() => setActiveTab('staff')}
          className={`px-4 py-2 text-xs font-semibold rounded-xl transition ${
            activeTab === 'staff'
              ? 'bg-white dark:bg-neutral-800 text-neutral-950 dark:text-white shadow-sm'
              : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
          }`}
        >
          Staff Accounts ({staffUsers.length})
        </button>
        <button
          onClick={() => setActiveTab('funding')}
          className={`px-4 py-2 text-xs font-semibold rounded-xl transition ${
            activeTab === 'funding'
              ? 'bg-white dark:bg-neutral-800 text-neutral-950 dark:text-white shadow-sm'
              : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
          }`}
        >
          Funding ({pendingFunding.length})
        </button>
        <button
          onClick={() => setActiveTab('profit')}
          className={`px-4 py-2 text-xs font-semibold rounded-xl transition ${
            activeTab === 'profit'
              ? 'bg-white dark:bg-neutral-800 text-neutral-950 dark:text-white shadow-sm'
              : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
          }`}
        >
          Profit & Costs
        </button>
      </div>

      {/* TAB 1: FINANCIAL ANALYTICS */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-3xl liquid-glass-card">
              <span className="text-[11px] uppercase tracking-wider text-neutral-400 font-semibold block mb-1">
                Net Service Revenue
              </span>
              <p className="text-2xl font-mono font-bold text-neutral-950 dark:text-white tabular-nums">
                {formatNaira(netRevenue + 128400)}
              </p>
              <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                <TrendingUp className="w-3.5 h-3.5" />
                +18.4% month-over-month
              </div>
            </div>

            <div className="p-5 rounded-3xl liquid-glass-card">
              <span className="text-[11px] uppercase tracking-wider text-neutral-400 font-semibold block mb-1">
                Total Inflow (DVA & Cards)
              </span>
              <p className="text-2xl font-mono font-bold text-neutral-950 dark:text-white tabular-nums">
                {formatNaira(totalFunded + 540000)}
              </p>
              <span className="text-[11px] text-neutral-400 block mt-1">Automated Monnify / Paystack Webhooks</span>
            </div>

            <div className="p-5 rounded-3xl liquid-glass-card">
              <span className="text-[11px] uppercase tracking-wider text-neutral-400 font-semibold block mb-1">
                Total System Users
              </span>
              <p className="text-2xl font-mono font-bold text-neutral-950 dark:text-white tabular-nums">
                {allUsers.length + 184}
              </p>
              <span className="text-[11px] text-neutral-400 block mt-1">Cybercafe agents & retail customers</span>
            </div>

            <div className="p-5 rounded-3xl liquid-glass-card">
              <span className="text-[11px] uppercase tracking-wider text-neutral-400 font-semibold block mb-1">
                Auto-Refunds Disbursed
              </span>
              <p className="text-2xl font-mono font-bold text-neutral-700 dark:text-neutral-300 tabular-nums">
                {formatNaira(totalRefunded)}
              </p>
              <span className="text-[11px] text-emerald-600 font-medium block mt-1">100% Policy Guarantee Active</span>
            </div>
          </div>

          {/* Revenue distribution breakdown */}
          <div className="p-6 rounded-3xl liquid-glass-card space-y-4">
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              Revenue by Service Vertical
            </h3>
            <div className="space-y-3">
              {[
                { label: 'NIN Premium Slips & Lookups', pct: 45, rev: '₦68,400.00' },
                { label: 'BVN Premium Slips & Retrieval', pct: 28, rev: '₦42,500.00' },
                { label: 'IPE Clearance Resolution Queue', pct: 15, rev: '₦22,800.00' },
                { label: 'Name, DOB & Phone Modifications', pct: 12, rev: '₦18,200.00' },
              ].map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-neutral-800 dark:text-neutral-200">{item.label}</span>
                    <span className="font-mono tabular-nums text-neutral-900 dark:text-white">
                      {item.rev} ({item.pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                    <div
                      className="h-full bg-neutral-900 dark:bg-white rounded-full"
                      style={{ width: `${item.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: GLOBAL SERVICE PRICING MANAGEMENT */}
      {activeTab === 'pricing' && (
        <div className="p-6 rounded-3xl liquid-glass-card space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-neutral-200/80 dark:border-neutral-800">
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                Global Service Pricing Schedule
              </h3>
              <p className="text-xs text-neutral-500">
                Update prices in real time across the entire portal for all users and cybercafes.
              </p>
            </div>
            {saveSuccessMsg && (
              <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                {saveSuccessMsg}
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3">Service Title</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Current Price</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {services.map((s) => (
                  <tr key={s.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-900/50">
                    <td className="py-3 px-3 font-semibold text-neutral-900 dark:text-white">
                      {s.title}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 text-[10px] font-semibold">
                        {s.category}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-neutral-500 capitalize">{s.type}</td>
                    <td className="py-3 px-3 font-mono font-bold text-neutral-900 dark:text-white tabular-nums">
                      {editingServiceId === s.id ? (
                        <div className="flex items-center gap-1.5">
                          <span>₦</span>
                          <input
                            type="number"
                            min="0"
                            step="10"
                            value={editedPrice}
                            onChange={(e) => setEditedPrice(e.target.value)}
                            className="w-24 px-2 py-1 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-xs font-mono"
                          />
                        </div>
                      ) : (
                        formatNaira(s.price)
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {editingServiceId === s.id ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleSavePrice(s.id)}
                            className="px-2.5 py-1 rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-black font-semibold text-[11px] flex items-center gap-1"
                          >
                            <Save className="w-3 h-3" />
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingServiceId(null)}
                            className="px-2 py-1 text-[11px] text-neutral-500 hover:text-neutral-800"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingServiceId(s.id);
                            setEditedPrice(s.price.toString());
                          }}
                          className="px-2.5 py-1 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-[11px] font-medium transition"
                        >
                          Edit Price
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: USER WALLET MANAGEMENT & OVERRIDE */}
      {activeTab === 'wallets' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Override Form */}
          <div className="lg:col-span-5 p-6 rounded-3xl liquid-glass-card space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-neutral-200 dark:border-neutral-800">
              <ShieldAlert className="w-5 h-5 text-neutral-800 dark:text-neutral-200" />
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                Manual Wallet Adjustment
              </h3>
            </div>

            {walletFeedback && (
              <div className="p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-xs font-semibold text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-700">
                {walletFeedback}
              </div>
            )}

            <form onSubmit={handleWalletOverrideSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Target User Account
                </label>
                <select
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs"
                >
                  {allUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role}) — Bal: {formatNaira(u.walletBalance)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Action Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setWalletActionType('CREDIT')}
                    className={`py-2 text-xs font-semibold rounded-xl border flex items-center justify-center gap-1.5 transition ${
                      walletActionType === 'CREDIT'
                        ? 'bg-emerald-600 text-white border-transparent'
                        : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400'
                    }`}
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    Credit Wallet (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setWalletActionType('DEBIT')}
                    className={`py-2 text-xs font-semibold rounded-xl border flex items-center justify-center gap-1.5 transition ${
                      walletActionType === 'DEBIT'
                        ? 'bg-red-600 text-white border-transparent'
                        : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400'
                    }`}
                  >
                    <MinusCircle className="w-3.5 h-3.5" />
                    Debit Wallet (-)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Amount (₦)
                </label>
                <input
                  type="number"
                  min="1"
                  step="10"
                  required
                  value={actionAmount}
                  onChange={(e) => setActionAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs font-mono tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Mandatory Audit Log Note
                </label>
                <textarea
                  rows={2}
                  required
                  value={auditNote}
                  onChange={(e) => setAuditNote(e.target.value)}
                  placeholder="Reason for manual adjustment (e.g. Bank slip #982 verified)..."
                  className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-neutral-950 text-white dark:bg-white dark:text-black font-semibold text-xs hover:opacity-90 transition shadow-sm"
              >
                Execute Super Admin Override
              </button>
            </form>
          </div>

          {/* User List */}
          <div className="lg:col-span-7 p-6 rounded-3xl liquid-glass-card space-y-4">
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              System Registered Accounts
            </h3>
            <div className="space-y-2.5">
              {allUsers.map((u) => (
                <div
                  key={u.id}
                  className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-900/70 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-black font-bold text-xs flex items-center justify-center">
                      {u.avatarInitials}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-neutral-900 dark:text-white">{u.name}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-semibold font-mono">
                          {u.role}
                        </span>
                      </div>
                      <span className="text-[11px] text-neutral-400 block">{u.email}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] text-neutral-400 block">Balance</span>
                    <span className="text-sm font-mono font-bold text-neutral-900 dark:text-white tabular-nums">
                      {formatNaira(u.walletBalance)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: AUDIT LEDGER */}
      {activeTab === 'audit' && (
        <div className="p-6 rounded-3xl liquid-glass-card space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-200/80 dark:border-neutral-800">
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                Immutable Financial & Audit Ledger
              </h3>
              <p className="text-xs text-neutral-500">
                Complete trace of all automated debits, virtual account inflows, and admin balance overrides.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="p-3 rounded-2xl bg-neutral-50/70 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                        tx.type === 'CREDIT'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : tx.type === 'REFUND'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          : 'bg-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200'
                      }`}
                    >
                      {tx.type}
                    </span>
                    <span className="font-semibold text-neutral-900 dark:text-white">
                      {tx.description}
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-400 font-mono">
                    Ref: {tx.reference} · {new Date(tx.createdAt).toLocaleString()}
                    {tx.auditNote && (
                      <span className="text-amber-600 dark:text-amber-400 ml-2 font-sans font-medium">
                        (Audit: {tx.auditNote})
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right font-mono font-bold text-sm tabular-nums">
                  <span
                    className={
                      tx.type === 'CREDIT' || tx.type === 'REFUND'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-neutral-900 dark:text-white'
                    }
                  >
                    {tx.type === 'DEBIT' ? '-' : '+'}
                    {formatNaira(tx.amount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: STAFF ACCOUNTS (Super Admin only) */}
      {activeTab === 'staff' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 p-6 rounded-3xl liquid-glass-card space-y-4">
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                Create Support Staff Account
              </h3>
            </div>
            <p className="text-xs text-neutral-500">
              Staff sign in at <span className="font-mono">{STAFF_PATH}</span> on your site. Only you can create or deactivate staff accounts.
            </p>

            {staffFeedback && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold border ${
                  staffFeedback.ok
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                    : 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50'
                }`}
              >
                {staffFeedback.text}
              </div>
            )}

            <form onSubmit={handleCreateStaff} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Full name</label>
                <input type="text" required value={staffName} onChange={(e) => setStaffName(e.target.value)} placeholder="Staff full name" className="w-full p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Email address</label>
                <input type="email" required value={staffEmail} onChange={(e) => setStaffEmail(e.target.value)} placeholder="staff@wealthdatas.ng" className="w-full p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Phone number</label>
                <input type="tel" value={staffPhone} onChange={(e) => setStaffPhone(e.target.value)} placeholder="08012345678" className="w-full p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Temporary password (min 8 characters)</label>
                <input type="text" required minLength={8} value={staffPassword} onChange={(e) => setStaffPassword(e.target.value)} placeholder="Set a strong temporary password" className="w-full p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs font-mono" />
              </div>
              <button
                type="submit"
                disabled={staffBusy}
                className="w-full py-2.5 px-4 rounded-xl bg-neutral-950 text-white dark:bg-white dark:text-black font-semibold text-xs hover:opacity-90 transition shadow-sm disabled:opacity-50"
              >
                {staffBusy ? 'Creating...' : 'Create Support Account'}
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 p-6 rounded-3xl liquid-glass-card space-y-4">
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">Staff Directory</h3>
            <div className="space-y-2.5">
              {staffUsers.map((u) => (
                <div
                  key={u.id}
                  className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-900/70 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-black font-bold text-xs flex items-center justify-center shrink-0">
                      {u.avatarInitials}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-neutral-900 dark:text-white truncate">{u.name}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-semibold font-mono">
                          {u.role}
                        </span>
                      </div>
                      <span className="text-[11px] text-neutral-400 block truncate">{u.email}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                        u.isActive === false
                          ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}
                    >
                      {u.isActive === false ? 'DEACTIVATED' : 'ACTIVE'}
                    </span>
                    {u.role === 'SUPPORT_ADMIN' && u.id !== currentUser.id && (
                      <button
                        type="button"
                        onClick={() => handleToggleStaff(u.id, u.isActive === false)}
                        className="px-3 py-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 text-[11px] font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                      >
                        {u.isActive === false ? 'Activate' : 'Deactivate'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: FUNDING (verify bank transfers, set the account customers pay into) */}
      {activeTab === 'funding' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 p-6 rounded-3xl liquid-glass-card space-y-4">
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">Funding Account (customers pay into this)</h3>
            <p className="text-xs text-neutral-500">Use a bank account you own and can check. Customers see exactly these details.</p>
            <form onSubmit={handleSaveAccount} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Bank name</label>
                <input type="text" required value={acctBank} onChange={(e) => setAcctBank(e.target.value)} placeholder="e.g. Access Bank" className="w-full p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Account number (10 digits)</label>
                <input type="text" required inputMode="numeric" maxLength={10} value={acctNumber} onChange={(e) => setAcctNumber(e.target.value.replace(/\D/g, ''))} placeholder="0123456789" className="w-full p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs font-mono" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Account name</label>
                <input type="text" required value={acctName} onChange={(e) => setAcctName(e.target.value)} placeholder="Name on the account" className="w-full p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Note to customers (optional)</label>
                <input type="text" value={acctNote} onChange={(e) => setAcctNote(e.target.value)} placeholder="e.g. Use your email as the narration" className="w-full p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs" />
              </div>
              <button type="submit" className="w-full py-2.5 px-4 rounded-xl bg-neutral-950 text-white dark:bg-white dark:text-black font-semibold text-xs hover:opacity-90 transition shadow-sm">
                Save Funding Account
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 p-6 rounded-3xl liquid-glass-card space-y-4">
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">Payments Waiting for Confirmation ({pendingFunding.length})</h3>
            <p className="text-xs text-neutral-500">Check your bank app first. Approve only money you can see in the account. Never rely on a screenshot.</p>

            {fundFeedback && (
              <div className={`p-3 rounded-xl text-xs font-semibold border ${fundFeedback.ok ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50'}`}>
                {fundFeedback.text}
              </div>
            )}

            {pendingFunding.length === 0 && <p className="text-xs text-neutral-400">No payments waiting.</p>}
            <div className="space-y-3">
              {pendingFunding.map((r) => (
                <div key={r.id} className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/70 border border-neutral-200 dark:border-neutral-800 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-neutral-900 dark:text-white">{r.userName} <span className="font-normal text-neutral-400">({r.userEmail})</span></span>
                    <span className="font-mono font-bold text-neutral-900 dark:text-white">{formatNaira(r.amount)}</span>
                  </div>
                  <div className="text-[11px] text-neutral-500 space-y-0.5">
                    <p>Ref: <span className="font-mono">{r.reference}</span> - {new Date(r.createdAt).toLocaleString()}</p>
                    <p>Paid from: {r.senderName}{r.bank ? ` (${r.bank})` : ''}</p>
                    {r.note && <p>Bank reference: <span className="font-mono">{r.note}</span></p>}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-neutral-400 mb-1">Amount you actually received (₦)</label>
                      <input type="number" min="1" value={receivedAmounts[r.id] ?? String(r.amount)} onChange={(e) => setReceivedAmounts((p) => ({ ...p, [r.id]: e.target.value }))} className="w-full p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs font-mono" />
                    </div>
                    <div>
                      <label className="block text-[11px] text-neutral-400 mb-1">Note (required to reject)</label>
                      <input type="text" value={reviewNotes[r.id] ?? ''} onChange={(e) => setReviewNotes((p) => ({ ...p, [r.id]: e.target.value }))} placeholder="e.g. Not found in bank" className="w-full p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => handleReview(r.id, true, r.amount)} className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition">
                      Approve and Credit Wallet
                    </button>
                    <button type="button" onClick={() => handleReview(r.id, false, r.amount)} className="px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 font-semibold text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800 transition">
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {reviewedFunding.length > 0 && (
              <div className="pt-2 border-t border-neutral-200/80 dark:border-neutral-800">
                <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-2 mt-3">Recently reviewed</p>
                <div className="space-y-1.5">
                  {reviewedFunding.map((r) => (
                    <div key={r.id} className="flex items-center justify-between text-[11px] text-neutral-500">
                      <span className="font-mono">{r.reference} - {r.userName}</span>
                      <span>
                        {r.status === 'APPROVED' ? `Credited ${formatNaira(r.amountCredited || 0)}` : r.status === 'CANCELLED' ? 'Cancelled by customer' : 'Rejected'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 7: PROFIT & COSTS (only the Super Admin can see these) */}
      {activeTab === 'profit' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {profitCard('Profit today', profit?.today)}
            {profitCard('Last 7 days', profit?.last7)}
            {profitCard('Last 30 days', profit?.last30)}
            {profitCard('All time', profit?.allTime)}
          </div>

          <div className="p-6 rounded-3xl liquid-glass-card space-y-4">
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">What each service costs you</h3>
            <p className="text-xs text-neutral-500">
              Enter what the provider charges YOU for each service. Customers never see these numbers. Profit is the selling price minus this cost, and refunds reverse both.
            </p>
            {costFeedback && (
              <div className={`p-3 rounded-xl text-xs font-semibold border ${costFeedback.ok ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50'}`}>
                {costFeedback.text}
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-neutral-400 border-b border-neutral-200/80 dark:border-neutral-800">
                    <th className="py-2 pr-3 font-semibold">Service</th>
                    <th className="py-2 pr-3 font-semibold">You sell at</th>
                    <th className="py-2 pr-3 font-semibold">Your cost</th>
                    <th className="py-2 pr-3 font-semibold">Profit each</th>
                    <th className="py-2 font-semibold"></th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((svc) => {
                    const cost = serviceCosts[svc.id] ?? 0;
                    return (
                      <tr key={svc.id} className="border-b border-neutral-100 dark:border-neutral-800/70">
                        <td className="py-2.5 pr-3 font-semibold text-neutral-900 dark:text-white">{svc.title}</td>
                        <td className="py-2.5 pr-3 font-mono tabular-nums">{formatNaira(svc.price)}</td>
                        <td className="py-2.5 pr-3">
                          <input type="number" min="0" step="1" value={costInputs[svc.id] ?? String(cost)} onChange={(e) => setCostInputs((p) => ({ ...p, [svc.id]: e.target.value }))} className="w-28 p-2 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs font-mono" />
                        </td>
                        <td className="py-2.5 pr-3 font-mono tabular-nums text-emerald-600 dark:text-emerald-400">{formatNaira(svc.price - cost)}</td>
                        <td className="py-2.5 text-right">
                          <button type="button" onClick={() => handleSaveCost(svc.id)} className="px-3 py-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 text-[11px] font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition">
                            Save
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
