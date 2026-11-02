import React from 'react';
import { 
  LayoutDashboard, 
  CreditCard, 
  Phone, 
  Building2, 
  Fingerprint, 
  Zap, 
  CheckCheck, 
  FileBadge, 
  LifeBuoy, 
  Plus, 
  ShieldCheck, 
  Sliders, 
  X,
  LogOut
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatNaira } from '../utils/rules';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  isOpenMobile,
  onCloseMobile,
}) => {
  const { currentUser, setIsAddFundsOpen, switchRole } = useApp();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'nin_phone', label: 'NIN_Phone Verification', icon: CreditCard },
    { id: 'phone_multiple', label: 'Phone Multiple', icon: Phone },
    { id: 'cac_services', label: 'CAC Services', icon: Building2 },
    { id: 'bvn_verification', label: 'BVN Verification', icon: Fingerprint },
    { id: 'ipe_clearance', label: 'IPE Clearance', icon: Zap },
    { id: 'validation', label: 'Validation', icon: CheckCheck },
    { id: 'personalization', label: 'Personalization & Slips', icon: FileBadge },
    { id: 'tickets', label: 'Support Inquiries', icon: LifeBuoy },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar Panel matching Image 1 */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 liquid-glass-sidebar flex flex-col justify-between transition-transform duration-300 lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full overflow-y-auto p-4 space-y-5">
          {/* Brand Header matching Image 1 */}
          <div className="flex items-center justify-between px-2 pt-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 flex items-center justify-center shadow-sm">
                <Fingerprint className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold tracking-tight text-neutral-950 dark:text-white leading-none">
                  Wealthdatas
                </h2>
                <span className="text-[11px] text-neutral-400 font-medium">Identity Hub</span>
              </div>
            </div>

            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Profile Card inside Sidebar matching Image 1 */}
          <div className="p-3.5 rounded-2xl bg-neutral-100/80 dark:bg-neutral-900/80 border border-neutral-200/80 dark:border-neutral-800 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-orange-500 text-white font-extrabold text-xs flex items-center justify-center shadow-sm shrink-0">
                {currentUser.avatarInitials}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                  {currentUser.name}
                </p>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400 block">
                  {currentUser.tier}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-neutral-200/60 dark:border-neutral-800 flex items-center justify-between text-xs">
              <span className="text-neutral-400">Balance</span>
              <span className="font-mono font-extrabold text-blue-600 dark:text-blue-400 tabular-nums">
                {formatNaira(currentUser.walletBalance)}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsAddFundsOpen(true)}
              className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Funds
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider px-2.5 block mb-1">
              General Services
            </span>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    onCloseMobile();
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition text-left ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 font-semibold'
                      : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900 hover:text-neutral-950 dark:hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-neutral-400'}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}

            {/* RBAC Admin links */}
            {(currentUser.role === 'SUPPORT_ADMIN' || currentUser.role === 'SUPER_ADMIN') && (
              <>
                <div className="pt-3">
                  <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider px-2.5 block mb-1">
                    Staff Portal
                  </span>
                  <button
                    onClick={() => {
                      onNavigate('support_desk');
                      onCloseMobile();
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition text-left ${
                      currentView === 'support_desk'
                        ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 font-semibold'
                        : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4 text-amber-500" />
                    <span className="truncate">Support Desk Queue</span>
                  </button>
                </div>
              </>
            )}

            {currentUser.role === 'SUPER_ADMIN' && (
              <button
                onClick={() => {
                  onNavigate('super_admin');
                  onCloseMobile();
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition text-left ${
                  currentView === 'super_admin'
                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 font-semibold'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900'
                }`}
              >
                <Sliders className="w-4 h-4 text-neutral-500" />
                <span className="truncate">Super Admin Console</span>
              </button>
            )}
          </nav>
        </div>

        {/* Quick Persona Switcher in Sidebar Footer for convenient testing */}
        <div className="p-4 border-t border-neutral-200/80 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-900/30">
          <div className="flex items-center justify-between text-[10px] text-neutral-400 font-semibold uppercase tracking-wider mb-2">
            <span>Fast Role Switch</span>
            <span className="font-mono text-neutral-500">{currentUser.role}</span>
          </div>
          <div className="grid grid-cols-3 gap-1 text-[11px]">
            <button
              onClick={() => switchRole('USER')}
              className={`py-1 rounded-lg border text-center font-medium transition ${
                currentUser.role === 'USER'
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-black border-transparent'
                  : 'border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              User
            </button>
            <button
              onClick={() => switchRole('SUPPORT_ADMIN')}
              className={`py-1 rounded-lg border text-center font-medium transition ${
                currentUser.role === 'SUPPORT_ADMIN'
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-black border-transparent'
                  : 'border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              Support
            </button>
            <button
              onClick={() => switchRole('SUPER_ADMIN')}
              className={`py-1 rounded-lg border text-center font-medium transition ${
                currentUser.role === 'SUPER_ADMIN'
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-black border-transparent'
                  : 'border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              Super
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
