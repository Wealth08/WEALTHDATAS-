import React from 'react';
import { Menu, Globe } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface TopBarProps {
  currentViewTitle: string;
  onOpenMobileMenu: () => void;
  onOpenAuthModal: () => void;
  onToggleLanding: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentViewTitle,
  onOpenMobileMenu,
  onOpenAuthModal,
  onToggleLanding,
}) => {
  const { currentUser } = useApp();

  return (
    <header className="sticky top-0 z-30 h-16 px-4 md:px-8 liquid-glass border-b border-neutral-200/80 dark:border-neutral-800 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-xl text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          aria-label="Open mobile navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-base font-bold text-neutral-900 dark:text-white tracking-tight leading-none">
            {currentViewTitle}
          </h1>
          <span className="text-[11px] text-neutral-400 font-medium">Fast & Reliable Services</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Toggle to view 3D Landing Page */}
        <button
          type="button"
          onClick={onToggleLanding}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
        >
          <Globe className="w-3.5 h-3.5 text-neutral-400" />
          <span>3D Landing View</span>
        </button>

        {/* User initials pill / login button matching Image 1 top right */}
        <button
          type="button"
          onClick={onOpenAuthModal}
          className="flex items-center gap-2 p-1 pl-2.5 rounded-2xl bg-neutral-100 dark:bg-neutral-900 hover:bg-neutral-200/80 dark:hover:bg-neutral-800 transition border border-neutral-200 dark:border-neutral-800"
        >
          <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 hidden md:inline">
            {currentUser.name}
          </span>
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-600 to-orange-500 text-white font-extrabold text-xs flex items-center justify-center shadow-sm">
            {currentUser.avatarInitials}
          </div>
        </button>
      </div>
    </header>
  );
};
