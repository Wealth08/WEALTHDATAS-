import React, { useState } from 'react';
import { 
  Inbox, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  AlertCircle, 
  FileText, 
  User, 
  Phone, 
  Mail, 
  ArrowRight, 
  Search,
  Filter,
  Check,
  RotateCcw
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SupportTicket, TicketStatus } from '../types';
import { formatNaira } from '../utils/rules';

export const SupportAdminDashboard: React.FC = () => {
  const { tickets, updateTicketStatus, currentUser } = useApp();
  const [statusFilter, setStatusFilter] = useState<'ALL' | TicketStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const filteredTickets = tickets.filter((t) => {
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    const matchesSearch =
      t.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.serviceTitle.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const counts = {
    all: tickets.length,
    open: tickets.filter((t) => t.status === 'OPEN').length,
    inProgress: tickets.filter((t) => t.status === 'IN_PROGRESS').length,
    resolved: tickets.filter((t) => t.status === 'RESOLVED').length,
    rejected: tickets.filter((t) => t.status === 'REJECTED').length,
  };

  const handleProcessAction = (status: TicketStatus) => {
    if (!selectedTicket) return;

    updateTicketStatus(
      selectedTicket.id,
      status,
      resolutionNote.trim() || undefined,
      status === 'RESOLVED' ? `https://wealthdatas.ng/slips/approved_${selectedTicket.ticketNumber}.pdf` : undefined
    );

    const msg =
      status === 'RESOLVED'
        ? `Ticket ${selectedTicket.ticketNumber} marked as Resolved.`
        : status === 'REJECTED'
        ? `Ticket ${selectedTicket.ticketNumber} Rejected. User has been automatically refunded.`
        : `Ticket ${selectedTicket.ticketNumber} status updated to ${status}.`;

    setActionSuccess(msg);
    setSelectedTicket(null);
    setResolutionNote('');
    setTimeout(() => setActionSuccess(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-200/80 dark:border-neutral-800">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Support & Ticket Processing Desk
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Manual service processing queue (IPE clearance, NIN/BVN modifications) and user inquiries.
          </p>
        </div>

        {/* Quick KPI stats */}
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 rounded-2xl liquid-glass-card text-center">
            <span className="text-[10px] uppercase text-neutral-400 font-semibold block">Pending</span>
            <span className="text-base font-bold font-mono text-amber-500 tabular-nums">
              {counts.open + counts.inProgress}
            </span>
          </div>
          <div className="px-3.5 py-2 rounded-2xl liquid-glass-card text-center">
            <span className="text-[10px] uppercase text-neutral-400 font-semibold block">Resolved</span>
            <span className="text-base font-bold font-mono text-emerald-500 tabular-nums">
              {counts.resolved}
            </span>
          </div>
          <div className="px-3.5 py-2 rounded-2xl liquid-glass-card text-center">
            <span className="text-[10px] uppercase text-neutral-400 font-semibold block">Auto-Refunded</span>
            <span className="text-base font-bold font-mono text-neutral-700 dark:text-neutral-300 tabular-nums">
              {counts.rejected}
            </span>
          </div>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          {actionSuccess}
        </div>
      )}

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-neutral-100 dark:bg-neutral-900 rounded-xl overflow-x-auto w-full sm:w-auto">
          {(['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition ${
                statusFilter === s
                  ? 'bg-white dark:bg-neutral-800 text-neutral-950 dark:text-white shadow-sm font-semibold'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              {s === 'ALL'
                ? `All (${counts.all})`
                : s === 'OPEN'
                ? `Open (${counts.open})`
                : s === 'IN_PROGRESS'
                ? `In Progress (${counts.inProgress})`
                : s === 'RESOLVED'
                ? `Resolved (${counts.resolved})`
                : `Rejected (${counts.rejected})`}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search tickets, names, IDs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs"
          />
        </div>
      </div>

      {/* Tickets List & Detail Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Ticket Cards Queue */}
        <div className="lg:col-span-7 space-y-3">
          {filteredTickets.length === 0 ? (
            <div className="p-8 rounded-3xl liquid-glass-card text-center">
              <Inbox className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                No tickets in this view
              </p>
              <p className="text-xs text-neutral-500 mt-0.5">
                All requests matching this filter have been processed.
              </p>
            </div>
          ) : (
            filteredTickets.map((t) => (
              <div
                key={t.id}
                onClick={() => {
                  setSelectedTicket(t);
                  setResolutionNote(t.resolutionNotes || '');
                }}
                className={`p-4 rounded-2xl liquid-glass-card cursor-pointer transition border hover:border-neutral-400 dark:hover:border-neutral-600 ${
                  selectedTicket?.id === t.id
                    ? 'ring-2 ring-neutral-900 dark:ring-white border-transparent'
                    : ''
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-neutral-900 dark:text-white">
                      {t.ticketNumber}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                      {t.serviceTitle}
                    </span>
                  </div>

                  {/* Status Indicator */}
                  <span
                    className={`text-[11px] font-semibold flex items-center gap-1 ${
                      t.status === 'RESOLVED'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : t.status === 'IN_PROGRESS'
                        ? 'text-amber-500'
                        : t.status === 'REJECTED'
                        ? 'text-red-500'
                        : 'text-blue-500'
                    }`}
                  >
                    {t.status === 'RESOLVED' && <CheckCircle2 className="w-3.5 h-3.5" />}
                    {t.status === 'IN_PROGRESS' && <Clock className="w-3.5 h-3.5" />}
                    {t.status === 'REJECTED' && <XCircle className="w-3.5 h-3.5" />}
                    {t.status === 'OPEN' && <AlertCircle className="w-3.5 h-3.5" />}
                    {t.status.replace('_', ' ')}
                  </span>
                </div>

                <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 line-clamp-1">
                  {t.subject}
                </p>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-2 mt-0.5">
                  {t.description}
                </p>

                <div className="flex items-center justify-between text-[11px] text-neutral-400 dark:text-neutral-500 pt-3 mt-3 border-t border-neutral-100 dark:border-neutral-800/80">
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {t.userName}
                  </span>
                  <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right: Selected Ticket Review & Processing Desk */}
        <div className="lg:col-span-5">
          {selectedTicket ? (
            <div className="p-6 rounded-3xl liquid-glass-card space-y-5 sticky top-24">
              <div className="flex items-center justify-between pb-4 border-b border-neutral-200/80 dark:border-neutral-800">
                <div>
                  <span className="text-[11px] font-mono font-bold text-neutral-400">
                    {selectedTicket.ticketNumber}
                  </span>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                    {selectedTicket.serviceTitle}
                  </h3>
                </div>
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                    selectedTicket.status === 'RESOLVED'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : selectedTicket.status === 'IN_PROGRESS'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      : selectedTicket.status === 'REJECTED'
                      ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                  }`}
                >
                  {selectedTicket.status}
                </span>
              </div>

              {/* User details */}
              <div className="space-y-1.5 text-xs text-neutral-600 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-900/60 p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-neutral-400" />
                  <span className="font-semibold text-neutral-900 dark:text-white">
                    {selectedTicket.userName}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-neutral-400" />
                  <span>{selectedTicket.userEmail}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-neutral-400" />
                  <span>{selectedTicket.userPhone}</span>
                </div>
              </div>

              {/* Request description */}
              <div>
                <label className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider block mb-1">
                  Customer Request Details
                </label>
                <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 text-xs text-neutral-800 dark:text-neutral-200">
                  {selectedTicket.description}
                </div>
              </div>

              {/* Attached documents */}
              {selectedTicket.attachedDocs && selectedTicket.attachedDocs.length > 0 && (
                <div>
                  <label className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider block mb-1.5">
                    Attached Supporting Documents
                  </label>
                  <div className="space-y-1.5">
                    {selectedTicket.attachedDocs.map((doc, i) => (
                      <div
                        key={i}
                        className="p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-between text-xs"
                      >
                        <span className="flex items-center gap-2 text-neutral-900 dark:text-white font-medium">
                          <FileText className="w-4 h-4 text-neutral-400" />
                          {doc.name}
                        </span>
                        <span className="text-[10px] text-neutral-500 font-mono">Verified PDF</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Resolution Notes Input */}
              <div>
                <label className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider block mb-1.5">
                  Resolution / Audit Notes
                </label>
                <textarea
                  rows={2}
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder="Enter clearance details, NIMC batch confirmation, or rejection reason..."
                  className="w-full p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-neutral-200/80 dark:border-neutral-800 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleProcessAction('IN_PROGRESS')}
                    className="py-2.5 px-3 rounded-xl bg-amber-500 text-white font-semibold text-xs hover:bg-amber-600 transition"
                  >
                    Set In-Progress
                  </button>
                  <button
                    type="button"
                    onClick={() => handleProcessAction('RESOLVED')}
                    className="py-2.5 px-3 rounded-xl bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700 transition"
                  >
                    Approve & Resolve
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleProcessAction('REJECTED')}
                  className="w-full py-2.5 px-3 rounded-xl border border-red-300 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reject Request (Auto-Refunds Fee to Wallet)
                </button>
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-3xl liquid-glass-card text-center text-neutral-400">
              <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-xs">Select any ticket from the queue on the left to review details and take action.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
