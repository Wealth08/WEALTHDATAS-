import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';

interface EmailConfirmedProps {
  status: 'verifying' | 'success' | 'error';
  message?: string;
  onContinue: () => void;
}

export const EmailConfirmed: React.FC<EmailConfirmedProps> = ({ status, message, onContinue }) => {
  const [seconds, setSeconds] = useState(6);
  const fired = useRef(false);

  // After "Email verified", send them to the sign-in page by themselves
  useEffect(() => {
    if (status !== 'success') return;
    setSeconds(6);
    const t = setInterval(() => setSeconds((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [status]);

  useEffect(() => {
    if (status === 'success' && seconds <= 0 && !fired.current) {
      fired.current = true;
      onContinue();
    }
  }, [status, seconds, onContinue]);

  const go = () => {
    if (fired.current) return;
    fired.current = true;
    onContinue();
  };

  return (
    <div className="min-h-screen bg-white text-neutral-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl liquid-glass-card shadow-2xl p-8 text-center space-y-4">
        {status === 'verifying' && (
          <>
            <div className="w-14 h-14 rounded-full bg-neutral-100 text-neutral-600 flex items-center justify-center mx-auto">
              <Loader2 className="w-7 h-7 animate-spin" />
            </div>
            <h3 className="text-xl font-bold tracking-tight text-neutral-900">Verifying your email...</h3>
            <p className="text-xs text-neutral-500 max-w-xs mx-auto leading-relaxed">
              Please wait a moment. This only takes a second.
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold tracking-tight text-neutral-900">Email verified</h3>
              <p className="text-xs text-neutral-500 mt-2 max-w-xs mx-auto leading-relaxed">
                Your email is confirmed and your account is ready. Please log in to continue.
              </p>
            </div>
            <button
              type="button"
              onClick={go}
              className="w-full py-3 px-4 rounded-xl bg-neutral-950 text-white font-semibold text-sm hover:opacity-90 active:scale-[0.99] transition shadow-md flex items-center justify-center gap-2"
            >
              Proceed to Login
              <ArrowRight className="w-4 h-4" />
            </button>
            <p className="text-[11px] text-neutral-400">
              Taking you to the sign-in page in {Math.max(seconds, 0)}s
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold tracking-tight text-neutral-900">This link could not be used</h3>
              <p className="text-xs text-neutral-500 mt-2 max-w-xs mx-auto leading-relaxed">
                {message ||
                  'The link has expired or was already used. Sign in and choose "Resend confirmation email" to get a new one.'}
              </p>
            </div>
            <button
              type="button"
              onClick={go}
              className="w-full py-3 px-4 rounded-xl bg-neutral-950 text-white font-semibold text-sm hover:opacity-90 active:scale-[0.99] transition shadow-md flex items-center justify-center gap-2"
            >
              Go to Login
              <ArrowRight className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};
