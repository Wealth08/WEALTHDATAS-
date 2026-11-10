import React from 'react';
import { CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

interface EmailConfirmedProps {
  status: 'success' | 'error';
  message?: string;
  signedIn: boolean;
  onContinue: () => void;
}

export const EmailConfirmed: React.FC<EmailConfirmedProps> = ({ status, message, signedIn, onContinue }) => {
  const ok = status === 'success';
  return (
    <div className="min-h-screen bg-white text-neutral-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl liquid-glass-card shadow-2xl p-8 text-center space-y-4">
        <div
          className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto ${
            ok ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
          }`}
        >
          {ok ? <CheckCircle2 className="w-8 h-8" /> : <AlertCircle className="w-8 h-8" />}
        </div>
        <div>
          <h3 className="text-xl font-bold tracking-tight text-neutral-900">
            {ok ? 'Email confirmed' : 'This link could not be used'}
          </h3>
          <p className="text-xs text-neutral-500 mt-2 max-w-xs mx-auto leading-relaxed">
            {ok
              ? signedIn
                ? 'Your email is verified and your account is ready. Welcome to Wealthdatas.'
                : 'Your email is verified and your account is ready. Please sign in to continue.'
              : message ||
                'The link has expired or was already used. Sign in and choose "Resend confirmation email" to get a new one.'}
          </p>
        </div>
        <button
          type="button"
          onClick={onContinue}
          className="w-full py-3 px-4 rounded-xl bg-neutral-950 text-white font-semibold text-sm hover:opacity-90 active:scale-[0.99] transition shadow-md flex items-center justify-center gap-2"
        >
          {ok && signedIn ? 'Go to my dashboard' : 'Sign in'}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
