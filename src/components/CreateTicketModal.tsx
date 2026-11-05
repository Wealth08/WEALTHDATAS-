import React, { useState } from 'react';
import { X, MessageSquare, Send, CheckCircle2 } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateTicketModal: React.FC<CreateTicketModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, addTicket } = useApp();
  const [subject, setSubject] = useState('');
  const [type, setType] = useState<'SUPPORT_INQUIRY' | 'FUNDING_ISSUE' | 'SERVICE_REQUEST'>('SUPPORT_INQUIRY');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [description, setDescription] = useState('');
  const [submittedNum, setSubmittedNum] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim() || busy) return;
    setErrorMsg('');
    setBusy(true);

    const t = await addTicket({
      userId: currentUser.id,
      userName: currentUser.name,
      userEmail: currentUser.email,
      userPhone: currentUser.phone,
      serviceTitle: type === 'FUNDING_ISSUE' ? 'Wallet Funding Dispute' : 'General Customer Support',
      type,
      status: 'OPEN',
      priority,
      subject: subject.trim(),
      description: description.trim(),
    });

    setBusy(false);
    if (!t || t.error) {
      setErrorMsg(t?.error || 'Could not submit your ticket. Please try again.');
      return;
    }
    setSubmittedNum(t.ticketNumber);
    setSubject('');
    setDescription('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl liquid-glass-card shadow-2xl p-6 md:p-8">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-200/80 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-neutral-800 dark:text-neutral-200" />
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
              Create Support Inquiry
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submittedNum ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-neutral-900 dark:text-white">
                Ticket #{submittedNum} Logged
              </h4>
              <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
                A customer support representative has been assigned and will attend to your inquiry shortly.
              </p>
            </div>
            <button
              onClick={() => {
                setSubmittedNum(null);
                onClose();
              }}
              className="py-2.5 px-6 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-black text-xs font-semibold"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {errorMsg && (
              <div className="p-3 text-xs rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50">
                {errorMsg}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Inquiry Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs"
                >
                  <option value="SUPPORT_INQUIRY">General Inquiry</option>
                  <option value="FUNDING_ISSUE">Funding / DVA Issue</option>
                  <option value="SERVICE_REQUEST">Service Assistance</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Priority Level
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Subject
              </label>
              <input
                type="text"
                required
                placeholder="Brief summary of your question or issue"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Message & Transaction Ref
              </label>
              <textarea
                rows={4}
                required
                placeholder="Include reference IDs, NIN/BVN details, or payment timestamps..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full py-3 px-4 rounded-xl bg-neutral-950 text-white dark:bg-white dark:text-black font-semibold text-xs hover:opacity-90 active:scale-[0.99] transition shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              Submit Ticket to Support Team
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
