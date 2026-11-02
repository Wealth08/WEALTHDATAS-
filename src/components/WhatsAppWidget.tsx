import React, { useState } from 'react';
import { MessageCircle, X, Send, PhoneCall, Check } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const WhatsAppWidget: React.FC = () => {
  const { currentUser } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSent(true);
    setTimeout(() => {
      setMessage('');
      setSent(false);
      setIsOpen(false);
    }, 2000);
  };

  return (
    <>
      {/* Floating Button matching Image 1 */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          type="button"
          aria-label="Contact Customer Support on WhatsApp"
          onClick={() => setIsOpen(!isOpen)}
          className="w-13 h-13 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-white shadow-xl shadow-emerald-600/30 flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
        >
          {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-7 h-7 fill-white text-white" />}
        </button>
      </div>

      {/* Floating Chat Modal */}
      {isOpen && (
        <div className="fixed bottom-22 right-6 z-50 w-80 sm:w-96 rounded-3xl liquid-glass-card shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden animate-in slide-in-from-bottom-6 duration-200">
          {/* Header */}
          <div className="p-4 bg-[#075E54] text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-xs">
                WD
              </div>
              <div>
                <h4 className="text-xs font-bold leading-tight">Wealthdatas Live Desk</h4>
                <p className="text-[10px] text-emerald-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Typically replies within 2 minutes
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Chat Body */}
          <div className="p-4 bg-neutral-50 dark:bg-neutral-900/90 text-xs space-y-3 min-h-[160px]">
            <div className="p-3 rounded-2xl rounded-tl-sm bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 shadow-sm max-w-[85%] border border-neutral-200/60 dark:border-neutral-700/60">
              <p className="font-semibold text-[11px] text-emerald-600 dark:text-emerald-400 mb-0.5">
                Support Agent (Chukwuma)
              </p>
              Hello {currentUser.name}! How can we assist you with your NIN, BVN, or IPE Clearance today?
            </div>

            {sent && (
              <div className="p-3 rounded-2xl rounded-tr-sm bg-[#DCF8C6] dark:bg-emerald-950 text-neutral-900 dark:text-emerald-100 ml-auto max-w-[85%] text-right font-medium">
                Message transmitted to WhatsApp Live Desk! An agent is connecting...
              </div>
            )}
          </div>

          {/* Input Form */}
          <form onSubmit={handleSend} className="p-3 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 flex gap-2">
            <input
              type="text"
              placeholder="Type message here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-xs focus:outline-none focus:ring-1 focus:ring-[#25D366]"
            />
            <button
              type="submit"
              className="p-2.5 rounded-xl bg-[#25D366] text-white hover:bg-[#20bd5a] transition"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
