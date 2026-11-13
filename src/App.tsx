import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { CustomerDashboard } from './components/CustomerDashboard';
import { SupportAdminDashboard } from './components/SupportAdminDashboard';
import { SuperAdminDashboard } from './components/SuperAdminDashboard';
import { UserTicketsView } from './components/UserTicketsView';
import { LandingHero } from './components/LandingHero';
import { AddFundsModal } from './components/AddFundsModal';
import { ServiceModal } from './components/ServiceModal';
import { AuthModal } from './components/AuthModal';
import { CreateTicketModal } from './components/CreateTicketModal';
import { WhatsAppWidget } from './components/WhatsAppWidget';
import { StaffLogin } from './components/StaffLogin';
import { EmailConfirmed } from './components/EmailConfirmed';
import { supabase } from './lib/supabase';
import { isStaffPath } from './utils/staffPath';
import { ServiceItem } from './types';

function MainAppContent() {
  const { 
    currentUser, 
    isAddFundsOpen, 
    setIsAddFundsOpen, 
    activeServiceForModal, 
    setActiveServiceForModal,
    services,
    isAuthenticated,
    authLoading,
    signOut
  } = useApp();

  const isStaff = currentUser.role === 'SUPPORT_ADMIN' || currentUser.role === 'SUPER_ADMIN';
  const isSuper = currentUser.role === 'SUPER_ADMIN';

  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [showLanding, setShowLanding] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isCreateTicketOpen, setIsCreateTicketOpen] = useState<boolean>(false);
  const [path, setPath] = useState<string>(window.location.pathname);
  const [preferSignIn, setPreferSignIn] = useState<boolean>(false);

  // The email link brings people back here with the result in the address (after the # sign)
  type Notice = { status: 'verifying' | 'success' | 'error'; message?: string };
  const [confirmNotice, setConfirmNotice] = useState<Notice | null>(() => {
    // New style link: https://your-site/auth/confirm?token_hash=...&type=signup  (we verify it ourselves)
    if (
      window.location.pathname.replace(/\/+$/, '') === '/auth/confirm' &&
      /token_hash=/.test(window.location.search)
    ) {
      return { status: 'verifying' };
    }
    const h = window.location.hash;
    if (/error_code=|error=/.test(h)) {
      const desc = new URLSearchParams(h.replace(/^#/, '')).get('error_description');
      return { status: 'error', message: desc ? desc.replace(/\+/g, ' ') : undefined };
    }
    if (/access_token=/.test(h) && /type=signup/.test(h)) return { status: 'success' };
    return null;
  });

  // Verify the email link, then make them log in (we do not keep them signed in from the email link)
  useEffect(() => {
    if (confirmNotice?.status !== 'verifying') return;
    const params = new URLSearchParams(window.location.search);
    const tokenHash = params.get('token_hash') || '';
    const type = (params.get('type') || 'signup') as 'signup' | 'email' | 'invite' | 'magiclink' | 'recovery' | 'email_change';
    supabase.auth.verifyOtp({ token_hash: tokenHash, type }).then(async ({ error }) => {
      if (error) {
        setConfirmNotice({
          status: 'error',
          message: 'This link has expired or was already used. Sign in and choose "Resend confirmation email" to get a new one.',
        });
        return;
      }
      await supabase.auth.signOut();
      setConfirmNotice({ status: 'success' });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Older style link (token after the # sign): sign them out so they log in themselves
  useEffect(() => {
    if (confirmNotice?.status === 'success' && isAuthenticated) signOut();
  }, [confirmNotice?.status, isAuthenticated]);

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Start on the dashboard whenever a different account signs in
  useEffect(() => {
    setCurrentView('dashboard');
  }, [currentUser.id]);

  const isStaffLoginPath = isStaffPath(path);

  // Map view IDs to page titles and filters
  let viewTitle = 'Dashboard';
  let categoryFilter = 'ALL';

  if (currentView === 'nin_phone') {
    viewTitle = 'NIN & Phone Verification';
    categoryFilter = 'NIN';
  } else if (currentView === 'phone_multiple') {
    viewTitle = 'Phone Multiple Verification';
    categoryFilter = 'NIN';
  } else if (currentView === 'cac_services') {
    viewTitle = 'Corporate Affairs Commission (CAC) Services';
  } else if (currentView === 'bvn_verification') {
    viewTitle = 'BVN Verification & Retrieval';
    categoryFilter = 'BVN';
  } else if (currentView === 'ipe_clearance') {
    viewTitle = 'IPE Clearance Processing Queue';
    categoryFilter = 'CLEARANCE';
  } else if (currentView === 'validation') {
    viewTitle = 'NIMC & NIBSS Validation';
    categoryFilter = 'VALIDATION';
  } else if (currentView === 'personalization') {
    viewTitle = 'Personalization & Verifiable Slips';
  } else if (currentView === 'tickets') {
    viewTitle = 'Support Inquiries & Tickets';
  } else if (currentView === 'support_desk') {
    viewTitle = 'Support Desk Processing Queue';
  } else if (currentView === 'super_admin') {
    viewTitle = 'Super Admin Control Center';
  }

  // Handle direct navigation to service if clicked from specialized sidebar item
  const handleNavigate = (view: string) => {
    setCurrentView(view);
    if (view === 'nin_phone') {
      const s = services.find((srv) => srv.id === 'nin-by-phone');
      if (s) setActiveServiceForModal(s);
    } else if (view === 'bvn_verification') {
      const s = services.find((srv) => srv.id === 'bvn-premium-slip');
      if (s) setActiveServiceForModal(s);
    } else if (view === 'ipe_clearance') {
      const s = services.find((srv) => srv.id === 'ipe-clearance');
      if (s) setActiveServiceForModal(s);
    }
  };

  if (authLoading && !confirmNotice) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#050505] text-neutral-500 flex items-center justify-center text-xs font-medium">
        Loading...
      </div>
    );
  }

  if (confirmNotice) {
    return (
      <EmailConfirmed
        status={confirmNotice.status}
        message={confirmNotice.message}
        onContinue={async () => {
          if (isAuthenticated) await signOut();
          window.history.replaceState(null, '', '/'); // clear the long address
          setPath('/');
          setConfirmNotice(null);
          setPreferSignIn(true);
          setIsAuthModalOpen(true);
        }}
      />
    );
  }

  // Secure staff entrance: https://your-site/staff-login
  if (isStaffLoginPath) {
    if (isAuthenticated && isStaff) {
      window.history.replaceState(null, '', '/');
    } else {
      return (
        <StaffLogin
          onSuccess={() => {
            window.history.replaceState(null, '', '/');
            setPath('/');
          }}
        />
      );
    }
  }

  if (showLanding || !isAuthenticated) {
    return (
      <>
        <LandingHero
          onEnterDashboard={() => (isAuthenticated ? setShowLanding(false) : setIsAuthModalOpen(true))}
          onOpenAuth={() => setIsAuthModalOpen(true)}
        />
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          defaultTab={preferSignIn ? 'signin' : undefined}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#050505] text-neutral-900 dark:text-neutral-100 flex">
      {/* Sidebar matching Image 1 */}
      <Sidebar
        currentView={currentView}
        onNavigate={handleNavigate}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        <TopBar
          currentViewTitle={viewTitle}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          onToggleLanding={() => setShowLanding(true)}
        />

        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          {currentView === 'support_desk' && isStaff && <SupportAdminDashboard />}
          {currentView === 'super_admin' && isSuper && <SuperAdminDashboard />}
          {currentView === 'tickets' && (
            <UserTicketsView onOpenNewTicket={() => setIsCreateTicketOpen(true)} />
          )}
          {(!(currentView === 'support_desk' && isStaff) &&
            !(currentView === 'super_admin' && isSuper) &&
            currentView !== 'tickets') && (
              <CustomerDashboard
                activeCategoryFilter={categoryFilter}
                onSelectService={(s) => setActiveServiceForModal(s)}
                onOpenAddFunds={() => setIsAddFundsOpen(true)}
              />
            )}
        </main>
      </div>

      {/* Modals & Overlays */}
      <AddFundsModal
        isOpen={isAddFundsOpen}
        onClose={() => setIsAddFundsOpen(false)}
      />

      <ServiceModal
        service={activeServiceForModal}
        onClose={() => setActiveServiceForModal(null)}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      <CreateTicketModal
        isOpen={isCreateTicketOpen}
        onClose={() => setIsCreateTicketOpen(false)}
      />

      {/* Floating WhatsApp Widget matching Image 1 */}
      <WhatsAppWidget />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainAppContent />
    </AppProvider>
  );
}
