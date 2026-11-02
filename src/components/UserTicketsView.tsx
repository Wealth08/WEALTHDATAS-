import React from 'react';
import { LifeBuoy, Plus, CheckCircle2, Clock, XCircle, AlertCircle, FileText, Download } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SupportTicket } from '../types';

interface UserTicketsViewProps {
  onOpenNewTicket: () => void;
}

export const UserTicketsView: React.FC<UserTicketsViewProps> = ({ onOpenNewTicket }) => {
  const { tickets, currentUser } = useApp();

  // Filter tickets created by currentUser or show all user tickets
  const userTickets = tickets.filter(
    (t) => t.userId === currentUser.id || currentUser.role !== 'USER'
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200/80 dark:border-neutral-800">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Support & Manual Service Tickets
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Track progress of your submitted IPE Clearances, Name/DOB Modifications, and inquiries.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenNewTicket}
          className="px-4 py-2.5 rounded-xl bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 text-xs font-semibold hover:opacity-90 transition shadow-sm flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          Create Support Inquiry
        </button>
      </div>

      {userTickets.length === 0 ? (
        <div className="p-12 rounded-3xl liquid-glass-card text-center space-y-3">
          <LifeBuoy className="w-10 h-10 text-neutral-400 mx-auto" />
          <h4 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
            No Active Tickets Found
          </h4>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            You currently have no open support requests. When you request asynchronous services
            like IPE clearance or modifications, track them here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {userTickets.map((t) => (
            <div
              key={t.id}
              className="p-5 rounded-3xl liquid-glass-card border border-neutral-200 dark:border-neutral-800 space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-neutral-900 dark:text-white">
                    {t.ticketNumber}
                  </span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                    {t.serviceTitle}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1 ${
                      t.status === 'RESOLVED'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : t.status === 'IN_PROGRESS'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : t.status === 'REJECTED'
                        ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                    }`}
                  >
                    {t.status === 'RESOLVED' && <CheckCircle2 className="w-3.5 h-3.5" />}
                    {t.status === 'IN_PROGRESS' && <Clock className="w-3.5 h-3.5" />}
                    {t.status === 'REJECTED' && <XCircle className="w-3.5 h-3.5" />}
                    {t.status === 'OPEN' && <AlertCircle className="w-3.5 h-3.5" />}
                    {t.status.replace('_', ' ')}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                  {t.subject}
                </h4>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
                  {t.description}
                </p>
              </div>

              {/* Resolution or Auto-Refund notice */}
              {t.resolutionNotes && (
                <div className="p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800/80 text-xs text-neutral-800 dark:text-neutral-200 border-l-2 border-neutral-900 dark:border-white">
                  <span className="font-semibold block text-[11px] text-neutral-500 mb-0.5">
                    Resolution Note by {t.processedBy || 'Support Team'}:
                  </span>
                  {t.resolutionNotes}
                </div>
              )}

              {t.status === 'REJECTED' && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-xs text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/50">
                  <strong>Auto-Refund Disbursed:</strong> The fee debited for this service has been credited back to your wallet balance.
                </div>
              )}

              <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-2 border-t border-neutral-100 dark:border-neutral-800/80">
                <span>Logged on: {new Date(t.createdAt).toLocaleDateString()}</span>
                <span>Priority: {t.priority}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
