import React from 'react';
import { ArrowRight, ShieldCheck, Zap, FileText, CheckCircle2, ChevronDown } from 'lucide-react';
import { ThreeCanvas } from './ThreeCanvas';
import { DEFAULT_SERVICES, formatNaira } from '../utils/rules';

interface LandingHeroProps {
  onEnterDashboard: () => void;
  onOpenAuth: () => void;
}

export const LandingHero: React.FC<LandingHeroProps> = ({ onEnterDashboard, onOpenAuth }) => {
  return (
    <div className="relative min-h-screen bg-white dark:bg-black text-neutral-900 dark:text-neutral-100 flex flex-col justify-between overflow-hidden">
      {/* Top Navbar */}
      <header className="relative z-20 flex items-center justify-between gap-3 px-4 sm:px-6 md:px-12 py-3 sm:py-6 border-b border-neutral-100 dark:border-neutral-900 bg-white/90 backdrop-blur">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-xl sm:rounded-2xl bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 flex items-center justify-center font-bold text-sm shadow-md">
            W
          </div>
          <span className="text-base sm:text-lg font-extrabold tracking-tight text-neutral-950 dark:text-white truncate">
            Wealthdatas
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={onOpenAuth}
            className="whitespace-nowrap px-5 py-2 rounded-full bg-neutral-950 text-white text-xs font-semibold shadow-sm active:scale-95 transition sm:bg-transparent sm:text-neutral-600 sm:shadow-none sm:px-4 sm:hover:text-neutral-950"
          >
            Sign In
          </button>
          <button
            onClick={onEnterDashboard}
            className="hidden sm:flex whitespace-nowrap px-5 py-2.5 rounded-full bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 text-xs font-semibold hover:opacity-90 active:scale-95 transition shadow-sm items-center gap-1.5"
          >
            Launch Portal
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main Hero Container inspired by Image 2 */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center py-12 md:py-20">
        {/* Interactive 3D Canvas element floating in center */}
        <div className="w-64 h-64 sm:w-80 sm:h-80 relative mb-6">
          <ThreeCanvas />
        </div>

        {/* Minimalist Monumental Title */}
        <h1 className="text-5xl sm:text-7xl md:text-8xl font-extrabold tracking-tighter text-neutral-950 dark:text-white max-w-4xl leading-[1.05]">
          Wealthdatas
        </h1>

        <p className="mt-4 text-base sm:text-lg text-neutral-500 dark:text-neutral-400 max-w-xl font-medium tracking-tight">
          Nigeria's premier identity & verification infrastructure. Instant NIMC NIN slips, NIBSS BVN retrieval, IPE clearance queues, and automated dedicated virtual accounts.
        </p>

        {/* Primary Action Button inspired by Image 2's high-contrast pill button */}
        <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
          <button
            type="button"
            onClick={onEnterDashboard}
            className="w-48 py-3.5 px-6 rounded-full bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 font-bold text-sm hover:opacity-90 active:scale-95 transition shadow-xl flex items-center justify-center gap-2"
          >
            Enter Portal
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onOpenAuth}
            className="w-48 py-3.5 px-6 rounded-full liquid-glass border border-neutral-300 dark:border-neutral-800 text-neutral-900 dark:text-white font-semibold text-sm hover:bg-neutral-100 dark:hover:bg-neutral-900 transition"
          >
            Sign In / Register
          </button>
        </div>

        {/* Live Features Bar */}
        <div className="mt-14 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl w-full">
          {[
            { title: 'NIN Premium Slips', price: '₦420.00', tag: 'Instant 2s' },
            { title: 'BVN Premium Slips', price: '₦420.00', tag: 'Official NIBSS' },
            { title: 'IPE Clearance', price: '₦990.00', tag: '24-48h Queue' },
            { title: 'BVN Retrieval', price: '₦1,430.00', tag: 'Central Bank' },
          ].map((item, i) => (
            <div
              key={i}
              onClick={onEnterDashboard}
              className="p-4 rounded-2xl liquid-glass border border-neutral-200/70 dark:border-neutral-800 text-left cursor-pointer hover:border-neutral-400 dark:hover:border-neutral-600 transition"
            >
              <span className="text-[10px] uppercase font-mono text-neutral-400 block font-semibold">
                {item.tag}
              </span>
              <p className="text-xs font-bold text-neutral-900 dark:text-white mt-0.5">
                {item.title}
              </p>
              <p className="text-xs font-mono font-extrabold text-neutral-950 dark:text-white mt-1">
                {item.price}
              </p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-6 border-t border-neutral-100 dark:border-neutral-900 text-center text-xs text-neutral-400">
        <p>© 2026 Wealthdatas Identity Services Ltd. Federal Republic of Nigeria.</p>
      </footer>
    </div>
  );
};
