import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole, ServiceItem, Transaction, SupportTicket, VerificationResult } from '../types';
import { DEFAULT_SERVICES, processWalletDebit, processWalletCredit, processAutoRefund } from '../utils/rules';

export const DEMO_USERS: Record<UserRole, UserProfile> = {
  USER: {
    id: 'usr_nnanna',
    name: 'Nwoke Nnanna',
    email: 'fubarawealth06@gmail.com',
    phone: '08034567890',
    role: 'USER',
    avatarInitials: 'NN',
    tier: 'SMART',
    walletBalance: 188.0,
    virtualAccount: {
      bankName: 'Wema Bank (Monnify / Paystack DVA)',
      accountNumber: '9012384729',
      accountName: 'WEALTHDATAS / NWOKE NNANNA',
    },
    createdAt: '2025-01-15T09:20:00Z',
  },
  SUPPORT_ADMIN: {
    id: 'adm_support_1',
    name: 'Amina Bello',
    email: 'amina.bello@wealthdatas.ng',
    phone: '08123456789',
    role: 'SUPPORT_ADMIN',
    avatarInitials: 'AB',
    tier: 'ENTERPRISE',
    walletBalance: 250000.0,
    virtualAccount: {
      bankName: 'Providus Bank',
      accountNumber: '9920192831',
      accountName: 'WEALTHDATAS / SUPPORT OPS',
    },
    createdAt: '2024-11-01T10:00:00Z',
  },
  SUPER_ADMIN: {
    id: 'adm_super_fubara',
    name: 'Dr. Fubara Wealth',
    email: 'fubara.ceo@wealthdatas.ng',
    phone: '08098765432',
    role: 'SUPER_ADMIN',
    avatarInitials: 'FW',
    tier: 'ENTERPRISE',
    walletBalance: 4850000.0,
    virtualAccount: {
      bankName: 'Sterling Bank (Treasury DVA)',
      accountNumber: '8023419284',
      accountName: 'WEALTHDATAS CORPORATE TREASURY',
    },
    createdAt: '2024-01-01T08:00:00Z',
  },
};

const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx_init_1',
    userId: 'usr_nnanna',
    amount: 1000.0,
    type: 'CREDIT',
    status: 'SUCCESS',
    description: 'Bank Transfer Topup via Wema DVA #9012384729',
    channel: 'VIRTUAL_ACCOUNT',
    reference: 'WD-FND-88392012',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'tx_init_2',
    userId: 'usr_nnanna',
    amount: 420.0,
    type: 'DEBIT',
    status: 'SUCCESS',
    description: 'NIN Premium Slip generation #12938471029',
    reference: 'WD-SRV-4729183',
    createdAt: new Date(Date.now() - 86400000 * 1.5).toISOString(),
  },
  {
    id: 'tx_init_3',
    userId: 'usr_nnanna',
    amount: 420.0,
    type: 'DEBIT',
    status: 'SUCCESS',
    description: 'BVN Premium Slip lookup #22339918234',
    reference: 'WD-SRV-9928172',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'tx_init_4',
    userId: 'usr_nnanna',
    amount: 28.0,
    type: 'CREDIT',
    status: 'SUCCESS',
    description: 'Promotional Cashback / Agent Loyalty Rebate',
    channel: 'SYSTEM_REFUND',
    reference: 'WD-FND-1029384',
    createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
  },
];

const INITIAL_TICKETS: SupportTicket[] = [
  {
    id: 'tkt_1',
    ticketNumber: 'TKT-2026-081',
    userId: 'usr_nnanna',
    userName: 'Nwoke Nnanna',
    userEmail: 'fubarawealth06@gmail.com',
    userPhone: '08034567890',
    serviceId: 'ipe-clearance',
    serviceTitle: 'IPE Clearance',
    type: 'SERVICE_REQUEST',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    subject: 'IPE Clearance request for collision error code E-04',
    description: 'Biometrics collision on NIMC enrollment machine at Alausa centre. IPE clearance requested.',
    attachedDocs: [
      { name: 'NIMC_IPE_Slip.pdf', type: 'application/pdf' },
      { name: 'Sworn_Affidavit.pdf', type: 'application/pdf' },
    ],
    createdAt: new Date(Date.now() - 86400000 * 1.2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    id: 'tkt_2',
    ticketNumber: 'TKT-2026-074',
    userId: 'usr_chinedu',
    userName: 'Chinedu Eze',
    userEmail: 'chinedu.eze@gmail.com',
    userPhone: '08139281920',
    serviceId: 'nin-name-mod',
    serviceTitle: 'NIN Name Modification',
    type: 'SERVICE_REQUEST',
    status: 'OPEN',
    priority: 'MEDIUM',
    subject: 'Middle name addition on NIMC portal',
    description: 'Need to add middle name "Obinna" to align with International Passport.',
    attachedDocs: [{ name: 'Newspaper_Publication.jpg', type: 'image/jpeg' }],
    createdAt: new Date(Date.now() - 86400000 * 0.8).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 0.8).toISOString(),
  },
  {
    id: 'tkt_3',
    ticketNumber: 'TKT-2026-062',
    userId: 'usr_nnanna',
    userName: 'Nwoke Nnanna',
    userEmail: 'fubarawealth06@gmail.com',
    userPhone: '08034567890',
    serviceId: 'bvn-dob-mod',
    serviceTitle: 'BVN DOB Modification',
    type: 'SERVICE_REQUEST',
    status: 'RESOLVED',
    priority: 'HIGH',
    subject: 'BVN DOB adjustment to 14/08/1992',
    description: 'Bank teller entered 1993 instead of 1992. Attached birth certificate & NPC attestation.',
    resolutionNotes: 'Approved and synced with NIBSS central BVN directory. Certificate updated.',
    processedBy: 'Amina Bello (Support)',
    processedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
];

interface AppContextType {
  currentUser: UserProfile;
  setCurrentUser: (user: UserProfile) => void;
  switchRole: (role: UserRole) => void;
  isAuthenticated: boolean;
  setIsAuthenticated: (auth: boolean) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  services: ServiceItem[];
  updateServicePrice: (serviceId: string, newPrice: number) => void;
  transactions: Transaction[];
  tickets: SupportTicket[];
  addTicket: (ticket: Omit<SupportTicket, 'id' | 'ticketNumber' | 'createdAt' | 'updatedAt'>) => SupportTicket;
  updateTicketStatus: (ticketId: string, status: SupportTicket['status'], notes?: string, slipUrl?: string) => void;
  debitWalletForService: (service: ServiceItem, description: string) => { success: boolean; error?: string };
  creditWallet: (amount: number, channel?: Transaction['channel'], note?: string, targetUserId?: string) => void;
  debitWalletManual: (amount: number, note: string, targetUserId: string) => { success: boolean; error?: string };
  allUsers: UserProfile[];
  recentVerifications: VerificationResult[];
  addVerificationResult: (result: VerificationResult) => void;
  isAddFundsOpen: boolean;
  setIsAddFundsOpen: (open: boolean) => void;
  activeServiceForModal: ServiceItem | null;
  setActiveServiceForModal: (s: ServiceItem | null) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('wealthdatas_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return DEMO_USERS.USER;
  });

  const [allUsers, setAllUsers] = useState<UserProfile[]>([
    DEMO_USERS.USER,
    DEMO_USERS.SUPPORT_ADMIN,
    DEMO_USERS.SUPER_ADMIN,
    {
      id: 'usr_chinedu',
      name: 'Chinedu Eze',
      email: 'chinedu.eze@gmail.com',
      phone: '08139281920',
      role: 'USER',
      avatarInitials: 'CE',
      tier: 'SMART',
      walletBalance: 4200.0,
      virtualAccount: {
        bankName: 'Wema Bank (Monnify / Paystack DVA)',
        accountNumber: '9088219382',
        accountName: 'WEALTHDATAS / CHINEDU EZE',
      },
      createdAt: '2025-02-10T12:00:00Z',
    },
  ]);

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('wealthdatas_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return 'light';
  });

  const [services, setServices] = useState<ServiceItem[]>(() => {
    const saved = localStorage.getItem('wealthdatas_services');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return DEFAULT_SERVICES;
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('wealthdatas_transactions');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return INITIAL_TRANSACTIONS;
  });

  const [tickets, setTickets] = useState<SupportTicket[]>(() => {
    const saved = localStorage.getItem('wealthdatas_tickets');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return INITIAL_TICKETS;
  });

  const [recentVerifications, setRecentVerifications] = useState<VerificationResult[]>([]);
  const [isAddFundsOpen, setIsAddFundsOpen] = useState(false);
  const [activeServiceForModal, setActiveServiceForModal] = useState<ServiceItem | null>(null);

  // Apply theme class to <html>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('wealthdatas_theme', theme);
  }, [theme]);

  // Sync state to localStorage
  useEffect(() => {
    localStorage.setItem('wealthdatas_user', JSON.stringify(currentUser));
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('wealthdatas_services', JSON.stringify(services));
  }, [services]);

  useEffect(() => {
    localStorage.setItem('wealthdatas_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('wealthdatas_tickets', JSON.stringify(tickets));
  }, [tickets]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const switchRole = (role: UserRole) => {
    const target = DEMO_USERS[role];
    setCurrentUser(target);
    setIsAuthenticated(true);
  };

  const updateServicePrice = (serviceId: string, newPrice: number) => {
    setServices((prev) =>
      prev.map((s) => (s.id === serviceId ? { ...s, price: Math.max(0, newPrice) } : s))
    );
  };

  const debitWalletForService = (service: ServiceItem, description: string) => {
    const result = processWalletDebit(
      currentUser.walletBalance,
      service.price,
      description,
      currentUser.id
    );

    if (!result.success || !result.transaction) {
      return { success: false, error: result.error };
    }

    // Update currentUser balance
    setCurrentUser((prev) => ({
      ...prev,
      walletBalance: result.newBalance,
    }));

    // Update in allUsers list
    setAllUsers((prev) =>
      prev.map((u) => (u.id === currentUser.id ? { ...u, walletBalance: result.newBalance } : u))
    );

    // Add transaction to ledger
    setTransactions((prev) => [result.transaction!, ...prev]);

    return { success: true };
  };

  const creditWallet = (
    amount: number,
    channel: Transaction['channel'] = 'VIRTUAL_ACCOUNT',
    note?: string,
    targetUserId?: string
  ) => {
    const uid = targetUserId || currentUser.id;
    const targetUser = allUsers.find((u) => u.id === uid) || currentUser;

    const result = processWalletCredit(
      targetUser.walletBalance,
      amount,
      channel === 'ADMIN_OVERRIDE'
        ? `Manual Wallet Credit by Admin (${currentUser.name})`
        : `Wallet Funding via ${channel.replace('_', ' ')}`,
      uid,
      channel,
      note,
      currentUser.id
    );

    if (uid === currentUser.id) {
      setCurrentUser((prev) => ({
        ...prev,
        walletBalance: result.newBalance,
      }));
    }

    setAllUsers((prev) =>
      prev.map((u) => (u.id === uid ? { ...u, walletBalance: result.newBalance } : u))
    );

    setTransactions((prev) => [result.transaction, ...prev]);
  };

  const debitWalletManual = (amount: number, note: string, targetUserId: string) => {
    const targetUser = allUsers.find((u) => u.id === targetUserId);
    if (!targetUser) return { success: false, error: 'User not found' };

    const result = processWalletDebit(
      targetUser.walletBalance,
      amount,
      `Manual Wallet Debit by Admin: ${note}`,
      targetUserId
    );

    if (!result.success || !result.transaction) {
      return { success: false, error: result.error };
    }

    result.transaction.auditNote = note;
    result.transaction.adminId = currentUser.id;

    if (targetUserId === currentUser.id) {
      setCurrentUser((prev) => ({
        ...prev,
        walletBalance: result.newBalance,
      }));
    }

    setAllUsers((prev) =>
      prev.map((u) => (u.id === targetUserId ? { ...u, walletBalance: result.newBalance } : u))
    );

    setTransactions((prev) => [result.transaction!, ...prev]);

    return { success: true };
  };

  const addTicket = (ticketData: Omit<SupportTicket, 'id' | 'ticketNumber' | 'createdAt' | 'updatedAt'>) => {
    const id = `tkt_${Date.now()}`;
    const count = tickets.length + 1;
    const ticketNumber = `TKT-2026-${String(count).padStart(3, '0')}`;
    const newTicket: SupportTicket = {
      ...ticketData,
      id,
      ticketNumber,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setTickets((prev) => [newTicket, ...prev]);
    return newTicket;
  };

  const updateTicketStatus = (
    ticketId: string,
    status: SupportTicket['status'],
    notes?: string,
    slipUrl?: string
  ) => {
    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket) return;

    // Check if rejected, trigger auto-refund
    if (status === 'REJECTED' && !ticket.refunded && ticket.serviceId) {
      const srv = services.find((s) => s.id === ticket.serviceId);
      if (srv) {
        const targetUser = allUsers.find((u) => u.id === ticket.userId);
        if (targetUser) {
          const refundResult = processAutoRefund(
            targetUser.walletBalance,
            srv.price,
            `Rejected Ticket ${ticket.ticketNumber} (${ticket.serviceTitle}): ${notes || 'Service could not be completed'}`,
            ticket.userId
          );

          if (ticket.userId === currentUser.id) {
            setCurrentUser((prev) => ({ ...prev, walletBalance: refundResult.newBalance }));
          }

          setAllUsers((prev) =>
            prev.map((u) => (u.id === ticket.userId ? { ...u, walletBalance: refundResult.newBalance } : u))
          );

          setTransactions((prev) => [refundResult.transaction, ...prev]);
        }
      }
    }

    setTickets((prev) =>
      prev.map((t) =>
        t.id === ticketId
          ? {
              ...t,
              status,
              resolutionNotes: notes || t.resolutionNotes,
              resultSlipUrl: slipUrl || t.resultSlipUrl,
              processedBy: `${currentUser.name} (${currentUser.role})`,
              processedAt: new Date().toISOString(),
              refunded: status === 'REJECTED' ? true : t.refunded,
              updatedAt: new Date().toISOString(),
            }
          : t
      )
    );
  };

  const addVerificationResult = (result: VerificationResult) => {
    setRecentVerifications((prev) => [result, ...prev]);
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        switchRole,
        isAuthenticated,
        setIsAuthenticated,
        theme,
        toggleTheme,
        services,
        updateServicePrice,
        transactions,
        tickets,
        addTicket,
        updateTicketStatus,
        debitWalletForService,
        creditWallet,
        debitWalletManual,
        allUsers,
        recentVerifications,
        addVerificationResult,
        isAddFundsOpen,
        setIsAddFundsOpen,
        activeServiceForModal,
        setActiveServiceForModal,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
