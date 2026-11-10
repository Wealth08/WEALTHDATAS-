import React, { useState, useEffect } from 'react';
import { Shield, User, Mail, Phone, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { validatePhone } from '../utils/rules';

interface AuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
  defaultTab?: 'signin' | 'signup';
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, defaultTab }) => {
  const { signUp, signIn, resendConfirmation } = useApp();
  const [tab, setTab] = useState<'signin' | 'signup'>('signup');
  const [showPassword, setShowPassword] = useState(false);

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [awaiting, setAwaiting] = useState<string | null>(null); // email waiting to be confirmed
  const [cooldown, setCooldown] = useState(0);

  // Open on the tab the app asks for (for example Sign in right after a confirmed email)
  useEffect(() => {
    if (isOpen && defaultTab) setTab(defaultTab);
  }, [isOpen, defaultTab]);

  // 60 second wait between "resend" clicks
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleResend = async () => {
    if (!awaiting || cooldown > 0) return;
    setErrorMsg('');
    setInfoMsg('');
    setLoading(true);
    const r = await resendConfirmation(awaiting);
    setLoading(false);
    if (r.ok) {
      setInfoMsg('Sent again. Check your inbox and your spam folder.');
      setCooldown(60);
    } else {
      setErrorMsg(r.error || 'Could not resend the email. Please wait a minute and try again.');
    }
  };

  if (!isOpen) return null;

  // Password strength calculation
  const getPasswordStrength = () => {
    if (!password) return 0;
    let strength = 0;
    if (password.length >= 6) strength += 25;
    if (password.length >= 8) strength += 25;
    if (/[0-9]/.test(password)) strength += 25;
    if (/[^A-Za-z0-9]/.test(password)) strength += 25;
    return strength;
  };

  const strength = getPasswordStrength();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    if (tab === 'signup') {
      if (!fullName.trim()) {
        setErrorMsg('Please enter your full name');
        return;
      }
      if (!email.includes('@')) {
        setErrorMsg('Please enter a valid email address');
        return;
      }
      if (!validatePhone(phone).valid) {
        setErrorMsg('Enter a valid 11-digit Nigerian mobile number (e.g., 08012345678)');
        return;
      }
      if (password.length < 6) {
        setErrorMsg('Password must be at least 6 characters');
        return;
      }

      setLoading(true);
      const res = await signUp({ name: fullName, email, phone, password });
      setLoading(false);

      if (!res.ok) {
        setErrorMsg(res.error || 'Could not create account');
        return;
      }
      if (res.needsConfirmation) {
        setAwaiting(email.trim());
        setCooldown(60);
        setPassword('');
        return;
      }
      if (onClose) onClose();
    } else {
      if (!email.trim() || !password) {
        setErrorMsg('Please enter email and password');
        return;
      }
      setLoading(true);
      const res = await signIn(email, password);
      setLoading(false);

      if (!res.ok) {
        if (res.needsConfirmation) {
          setAwaiting(email.trim());
          setInfoMsg('Your email is not confirmed yet. Open the link we sent you.');
          return;
        }
        setErrorMsg(res.error || 'Could not sign in');
        return;
      }
      if (onClose) onClose();
    }
  };

  if (awaiting) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
        <div className="relative w-full max-w-md overflow-hidden rounded-3xl liquid-glass-card shadow-2xl p-6 md:p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <Mail className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-neutral-900 tracking-tight">Check your email</h3>
            <p className="text-xs text-neutral-500 mt-2 max-w-xs mx-auto leading-relaxed">
              We sent a confirmation link to{' '}
              <span className="font-semibold text-neutral-900">{awaiting}</span>. Open your email and tap the
              link to activate your account. If you cannot see it, check your spam folder.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 text-xs rounded-xl bg-red-50 text-red-600 border border-red-200">{errorMsg}</div>
          )}
          {infoMsg && (
            <div className="p-3 text-xs rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
              {infoMsg}
            </div>
          )}

          <button
            type="button"
            disabled={loading || cooldown > 0}
            onClick={handleResend}
            className="w-full py-3 px-4 rounded-xl bg-neutral-950 text-white font-semibold text-sm hover:opacity-90 active:scale-[0.99] transition shadow-md disabled:opacity-50"
          >
            {loading ? 'Sending...' : cooldown > 0 ? `Resend email in ${cooldown}s` : 'Resend confirmation email'}
          </button>
          <button
            type="button"
            onClick={() => {
              setAwaiting(null);
              setErrorMsg('');
              setInfoMsg('');
              setTab('signin');
            }}
            className="w-full py-2.5 px-4 rounded-xl border border-neutral-200 text-neutral-800 text-xs font-semibold hover:bg-neutral-100 transition"
          >
            I have confirmed my email - Sign in
          </button>
          <button
            type="button"
            onClick={() => {
              setAwaiting(null);
              setErrorMsg('');
              setInfoMsg('');
              setEmail('');
              setTab('signup');
            }}
            className="text-xs text-neutral-500 underline hover:text-neutral-800"
          >
            Used the wrong email? Start again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl liquid-glass-card shadow-2xl p-6 md:p-8">
        {/* Header Tabs: matches Image 3 */}
        <div className="flex items-center justify-between pb-6 border-b border-neutral-200/80 dark:border-neutral-800">
          <div className="flex items-center gap-1.5 p-1 bg-neutral-100 dark:bg-neutral-900 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setTab('signin');
                setErrorMsg('');
                setInfoMsg('');
              }}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                tab === 'signin'
                  ? 'bg-white dark:bg-neutral-800 text-neutral-950 dark:text-white shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('signup');
                setErrorMsg('');
                setInfoMsg('');
              }}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                tab === 'signup'
                  ? 'bg-white dark:bg-neutral-800 text-neutral-950 dark:text-white shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
              }`}
            >
              Create account
            </button>
          </div>

          <div className="w-9 h-9 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-700 dark:text-neutral-300">
            <Shield className="w-5 h-5 text-neutral-800 dark:text-neutral-200" />
          </div>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 text-xs rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50">
            {errorMsg}
          </div>
        )}

        {infoMsg && (
          <div className="mt-4 p-3 text-xs rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            {infoMsg}
          </div>
        )}

        {/* Form Inputs matching Image 3 */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {tab === 'signup' && (
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Full name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required={tab === 'signup'}
                  placeholder="First and last name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/80 border border-neutral-200 dark:border-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Email address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/80 border border-neutral-200 dark:border-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition"
              />
            </div>
          </div>

          {tab === 'signup' && (
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Phone number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="tel"
                  required={tab === 'signup'}
                  placeholder="08012345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/80 border border-neutral-200 dark:border-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Create a secure password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/80 border border-neutral-200 dark:border-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Password strength bar: matching Image 3 */}
            {tab === 'signup' && (
              <div className="mt-2.5">
                <div className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      strength <= 25
                        ? 'bg-neutral-400 w-1/4'
                        : strength <= 50
                        ? 'bg-amber-500 w-2/4'
                        : strength <= 75
                        ? 'bg-emerald-500 w-3/4'
                        : 'bg-emerald-600 w-full'
                    }`}
                  />
                </div>
                <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                  {strength === 0
                    ? 'Add a secure password'
                    : strength < 50
                    ? 'Weak password'
                    : strength < 75
                    ? 'Moderate password'
                    : 'Strong password'}
                </p>
              </div>
            )}
          </div>

          {/* Action Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-neutral-950 text-white dark:bg-white dark:text-black font-semibold text-sm hover:opacity-90 active:scale-[0.99] transition shadow-md flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
          >
            {loading ? 'Please wait...' : tab === 'signup' ? 'Create Account' : 'Sign In'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
