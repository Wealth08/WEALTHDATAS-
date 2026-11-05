import React, { createContext, useContext, useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { UserProfile, ServiceItem, Transaction, SupportTicket, VerificationResult } from '../types';
import { DEFAULT_SERVICES } from '../utils/rules';

/* ------------------------------------------------------------------ */
/* Row types + mappers (database snake_case -> your existing types)    */
/* ------------------------------------------------------------------ */

// Placeholder used only while signed out. The dashboard is never rendered with it.
const GUEST_USER: UserProfile = {
  id: 'guest',
  name: 'Guest',
  email: '',
  phone: '',
  role: 'USER',
  avatarInitials: 'G',
  tier: 'SMART',
  walletBalance: 0,
  virtualAccount: { bankName: '', accountNumber: '', accountName: '' },
  createdAt: new Date(0).toISOString(),
};

type ProfileRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: UserProfile['role'];
  tier: UserProfile['tier'];
  wallet_balance: number | string;
  va_bank_name: string;
  va_account_number: string | null;
  va_account_name: string | null;
  is_active: boolean;
  created_at: string;
};

const initialsOf = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'WD';

const rowToProfile = (r: ProfileRow): UserProfile => ({
  id: r.id,
  name: r.name,
  email: r.email,
  phone: r.phone || '',
  role: r.role,
  avatarInitials: initialsOf(r.name),
  tier: r.tier,
  walletBalance: Number(r.wallet_balance),
  virtualAccount: {
    bankName: r.va_bank_name,
    accountNumber: r.va_account_number || '',
    accountName: r.va_account_name || '',
  },
  createdAt: r.created_at,
  isActive: r.is_active,
});

const rowToService = (r: any): ServiceItem => ({
  id: r.id,
  title: r.title,
  category: r.category,
  type: r.type,
  price: Number(r.price),
  description: r.description,
  badge: r.badge,
  turnaround: r.turnaround,
  requiresDocumentUpload: r.requires_document_upload || undefined,
});

const rowToTransaction = (r: any): Transaction => ({
  id: r.id,
  userId: r.user_id,
  amount: Number(r.amount),
  type: r.type,
  status: r.status,
  description: r.description,
  reference: r.reference,
  channel: r.channel || undefined,
  createdAt: r.created_at,
  auditNote: r.audit_note || undefined,
  adminId: r.admin_id || undefined,
});

const rowToTicket = (r: any): SupportTicket => ({
  id: r.id,
  ticketNumber: r.ticket_number,
  userId: r.user_id,
  userName: r.user_name,
  userEmail: r.user_email,
  userPhone: r.user_phone || '',
  serviceId: r.service_id || undefined,
  serviceTitle: r.service_title,
  type: r.type,
  status: r.status,
  priority: r.priority,
  subject: r.subject,
  description: r.description,
  attachedDocs: Array.isArray(r.attached_docs) ? r.attached_docs : [],
  resolutionNotes: r.resolution_notes || undefined,
  processedBy: r.processed_by || undefined,
  processedAt: r.processed_at || undefined,
  resultSlipUrl: r.result_slip_url || undefined,
  refunded: r.refunded,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const isStaffRole = (role: UserProfile['role']) => role === 'SUPPORT_ADMIN' || role === 'SUPER_ADMIN';

async function fetchProfile(userId: string): Promise<UserProfile | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (data) return rowToProfile(data as ProfileRow);
    if (error) break;
    await new Promise((r) => setTimeout(r, 400));
  }
  return null;
}

async function functionErrorMessage(error: any): Promise<string> {
  try {
    const body = await error?.context?.json?.();
    if (body?.error) return String(body.error);
  } catch {
    // ignore
  }
  return error?.message || 'Request failed';
}

// Calls a database function and turns its { success, error } answer into a simple result
async function rpc(name: string, args: Record<string, unknown>): Promise<{ success: boolean; error?: string; data?: any }> {
  const { data, error } = await supabase.rpc(name, args);
  if (error) return { success: false, error: error.message };
  if (data && data.success === false) return { success: false, error: data.error || 'Request failed' };
  return { success: true, data };
}

export type AuthResult = { ok: boolean; error?: string; needsConfirmation?: boolean };
type ActionResult = { success: boolean; error?: string };

interface NewStaffInput {
  name: string;
  email: string;
  phone: string;
  password: string;
}

/* ------------------------------------------------------------------ */
/* Context type                                                        */
/* ------------------------------------------------------------------ */

interface AppContextType {
  currentUser: UserProfile;
  isAuthenticated: boolean;
  authLoading: boolean;
  signUp: (input: { name: string; email: string; phone: string; password: string }) => Promise<AuthResult>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  staffSignIn: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  createStaffAccount: (input: NewStaffInput) => Promise<AuthResult>;
  setStaffActive: (userId: string, active: boolean) => Promise<AuthResult>;
  refreshUsers: () => Promise<void>;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  services: ServiceItem[];
  updateServicePrice: (serviceId: string, newPrice: number) => Promise<ActionResult>;
  transactions: Transaction[];
  tickets: SupportTicket[];
  addTicket: (ticket: Omit<SupportTicket, 'id' | 'ticketNumber' | 'createdAt' | 'updatedAt'>) => Promise<{ ticketNumber: string; error?: string } | null>;
  submitServiceTicket: (input: {
    service: ServiceItem;
    fullName: string;
    idNumber: string;
    detail: string;
    docs: string[];
  }) => Promise<ActionResult & { ticketNumber?: string }>;
  updateTicketStatus: (ticketId: string, status: SupportTicket['status'], notes?: string, slipUrl?: string) => Promise<ActionResult>;
  debitWalletForService: (service: ServiceItem, description: string) => Promise<ActionResult>;
  runService: (input: {
    service: ServiceItem;
    params: Record<string, string>;
  }) => Promise<ActionResult & { kind?: 'instant' | 'async'; result?: VerificationResult; ticketNumber?: string }>;
  creditWallet: (amount: number, channel?: Transaction['channel'], note?: string, targetUserId?: string) => Promise<ActionResult>;
  debitWalletManual: (amount: number, note: string, targetUserId: string) => Promise<ActionResult>;
  allUsers: UserProfile[];
  recentVerifications: VerificationResult[];
  addVerificationResult: (result: VerificationResult) => void;
  isAddFundsOpen: boolean;
  setIsAddFundsOpen: (open: boolean) => void;
  activeServiceForModal: ServiceItem | null;
  setActiveServiceForModal: (s: ServiceItem | null) => void;
}

const AppContext = createContext<AppContextType | null>(null);

/* ------------------------------------------------------------------ */
/* Provider                                                            */
/* ------------------------------------------------------------------ */

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // ---- Auth state (source of truth is Supabase, never localStorage) ----
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const busyRef = useRef(false);
  const profileRef = useRef<UserProfile | null>(null);
  profileRef.current = profile;

  // ---- Data (all loaded from Supabase; row-level security decides what each person can see) ----
  const [dbUsers, setDbUsers] = useState<UserProfile[]>([]);
  const [services, setServices] = useState<ServiceItem[]>(DEFAULT_SERVICES);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [recentVerifications, setRecentVerifications] = useState<VerificationResult[]>([]);
  const [isAddFundsOpen, setIsAddFundsOpen] = useState(false);
  const [activeServiceForModal, setActiveServiceForModal] = useState<ServiceItem | null>(null);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('wealthdatas_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return 'light';
  });

  // Old builds kept the user, role, wallet, tickets and prices in localStorage. Remove all of it.
  useEffect(() => {
    [
      'wealthdatas_user',
      'wealthdatas_wallets',
      'wealthdatas_services',
      'wealthdatas_transactions',
      'wealthdatas_tickets',
    ].forEach((k) => localStorage.removeItem(k));
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('wealthdatas_theme', theme);
  }, [theme]);

  const clearData = () => {
    setDbUsers([]);
    setServices(DEFAULT_SERVICES);
    setTransactions([]);
    setTickets([]);
    setRecentVerifications([]);
  };

  // ---- Session listener ----
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) setAuthLoading(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => subscription.unsubscribe();
  }, []);

  const userId = session?.user.id ?? null;

  // Load the profile (and therefore the ROLE) from the database whenever the session user changes
  useEffect(() => {
    if (busyRef.current) return; // an explicit sign-in is validating the role itself
    if (!userId) {
      setProfile(null);
      clearData();
      setAuthLoading(false);
      return;
    }
    let cancelled = false;
    setAuthLoading(true);
    fetchProfile(userId).then(async (p) => {
      if (cancelled) return;
      if (!p || p.isActive === false) {
        await supabase.auth.signOut();
        if (!cancelled) setProfile(null);
      } else {
        setProfile(p);
      }
      if (!cancelled) setAuthLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const isStaff = !!profile && isStaffRole(profile.role);

  // Reloads balance, prices, ledger, tickets (and all users for staff)
  const refreshData = useCallback(async () => {
    const me = profileRef.current;
    if (!me) return;
    const staff = isStaffRole(me.role);

    const [svc, tx, tk, own, users] = await Promise.all([
      supabase.from('services').select('*').order('sort_order'),
      supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(500),
      supabase.from('tickets').select('*').order('created_at', { ascending: false }).limit(500),
      supabase.from('profiles').select('*').eq('id', me.id).maybeSingle(),
      staff
        ? supabase.from('profiles').select('*').order('created_at', { ascending: false })
        : Promise.resolve(null),
    ]);

    if (!own.error) {
      const row = own.data as ProfileRow | null;
      if (!row || row.is_active === false) {
        // account was deactivated or removed while signed in
        await supabase.auth.signOut();
        setProfile(null);
        clearData();
        return;
      }
      setProfile(rowToProfile(row));
    }
    if (svc.data && svc.data.length > 0) setServices(svc.data.map(rowToService));
    if (tx.data) setTransactions(tx.data.map(rowToTransaction));
    if (tk.data) setTickets(tk.data.map(rowToTicket));
    if (users && users.data) setDbUsers((users.data as ProfileRow[]).map(rowToProfile));
  }, []);

  // Load on login, then keep fresh (every 20 seconds and whenever the tab regains focus)
  useEffect(() => {
    if (!profile?.id) return;
    refreshData();
    const timer = setInterval(refreshData, 20000);
    const onFocus = () => refreshData();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [profile?.id, refreshData]);

  // Provider-linked tickets (BVN retrieval, IPE, personalization): ask the server to check the provider every 3 minutes
  const hasOpenProviderTicket = useMemo(
    () =>
      tickets.some(
        (t) =>
          (t.status === 'OPEN' || t.status === 'IN_PROGRESS') &&
          !!t.serviceId &&
          ['bvn-retrieval', 'ipe-clearance', 'nin-personalization'].includes(t.serviceId)
      ),
    [tickets]
  );
  useEffect(() => {
    if (!profile?.id || !hasOpenProviderTicket) return;
    let stopped = false;
    const run = async () => {
      const { data } = await supabase.functions.invoke('sync-tickets', { body: {} });
      if (!stopped && data?.updated > 0) refreshData();
    };
    const first = setTimeout(run, 5000);
    const timer = setInterval(run, 180000);
    return () => {
      stopped = true;
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [profile?.id, hasOpenProviderTicket, refreshData]);

  // ---- Auth actions ----
  const signUp: AppContextType['signUp'] = async ({ name, email, phone, password }) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      // The database trigger ALWAYS creates a USER profile with 0.00 balance, whatever is sent here.
      options: { data: { name: name.trim(), phone: phone.trim() } },
    });
    if (error) return { ok: false, error: error.message };
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      return { ok: false, error: 'An account with this email already exists. Please sign in.' };
    }
    if (!data.session) return { ok: true, needsConfirmation: true };
    return { ok: true };
  };

  const signInWithPortal = async (
    email: string,
    password: string,
    portal: 'customer' | 'staff'
  ): Promise<AuthResult> => {
    busyRef.current = true;
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error || !data.user) {
        const msg = error?.message || 'Sign in failed';
        return { ok: false, error: msg === 'Invalid login credentials' ? 'Incorrect email or password.' : msg };
      }

      const p = await fetchProfile(data.user.id);
      const reject = async (message: string): Promise<AuthResult> => {
        await supabase.auth.signOut();
        return { ok: false, error: message };
      };

      if (!p || p.isActive === false) {
        return reject('This account is disabled or has no profile. Please contact support.');
      }
      if (portal === 'staff' && !isStaffRole(p.role)) {
        return reject('Incorrect email or password.');
      }
      if (portal === 'customer' && isStaffRole(p.role)) {
        return reject('Staff accounts must sign in through the staff portal.');
      }

      setSession(data.session);
      setProfile(p);
      setAuthLoading(false);
      return { ok: true };
    } finally {
      busyRef.current = false;
    }
  };

  const signIn: AppContextType['signIn'] = (email, password) => signInWithPortal(email, password, 'customer');
  const staffSignIn: AppContextType['staffSignIn'] = (email, password) =>
    signInWithPortal(email, password, 'staff');

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    clearData();
  };

  // ---- Staff management (server-side Edge Function, Super Admin only) ----
  const callStaffFunction = async (body: Record<string, unknown>): Promise<AuthResult> => {
    const { data, error } = await supabase.functions.invoke('manage-staff', { body });
    if (error) return { ok: false, error: await functionErrorMessage(error) };
    if (data?.error) return { ok: false, error: String(data.error) };
    await refreshData();
    return { ok: true };
  };

  const createStaffAccount: AppContextType['createStaffAccount'] = (input) =>
    callStaffFunction({ action: 'create', ...input });

  const setStaffActive: AppContextType['setStaffActive'] = (targetId, active) =>
    callStaffFunction({ action: 'set_active', userId: targetId, active });

  // ---- Derived values ----
  const currentUser: UserProfile = profile ?? GUEST_USER;

  const allUsers: UserProfile[] = useMemo(() => {
    if (!profile) return [];
    return isStaff && dbUsers.length > 0 ? dbUsers : [profile];
  }, [profile, isStaff, dbUsers]);

  const toggleTheme = () => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));

  // ---- Money + tickets: every one of these runs a server-side database function ----
  const updateServicePrice: AppContextType['updateServicePrice'] = async (serviceId, newPrice) => {
    const res = await rpc('admin_set_service_price', { p_service_id: serviceId, p_price: Math.max(0, newPrice) });
    await refreshData();
    return { success: res.success, error: res.error };
  };

  const debitWalletForService: AppContextType['debitWalletForService'] = async (service, description) => {
    const res = await rpc('debit_wallet_for_service', { p_service_id: service.id, p_description: description });
    await refreshData();
    return { success: res.success, error: res.error };
  };

  // Runs a service through the provider (server-side): charge -> provider -> refund automatically on failure
  const runService: AppContextType['runService'] = async ({ service, params }) => {
    const { data, error } = await supabase.functions.invoke('run-service', {
      body: { serviceId: service.id, params },
    });
    if (error) {
      await refreshData();
      return { success: false, error: await functionErrorMessage(error) };
    }
    await refreshData();
    if (!data?.ok) return { success: false, error: data?.error || 'Request failed' };

    if (data.kind === 'instant') {
      const r = data.record;
      const result: VerificationResult = {
        serviceId: service.id,
        trackingId: r.data.trackingNumber || `WD-${Date.now()}`,
        queryParam: r.queryParam,
        pdfBase64: data.pdfBase64 || undefined,
        timestamp: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
        data: r.data,
      };
      setRecentVerifications((prev) => [result, ...prev]);
      return { success: true, kind: 'instant', result };
    }
    return { success: true, kind: 'async', ticketNumber: data.ticketNumber };
  };

  const submitServiceTicket: AppContextType['submitServiceTicket'] = async ({
    service,
    fullName,
    idNumber,
    detail,
    docs,
  }) => {
    const res = await rpc('submit_service_ticket', {
      p_service_id: service.id,
      p_full_name: fullName,
      p_id_number: idNumber,
      p_detail: detail,
      p_docs: docs.map((name) => ({ name, type: 'application/pdf' })),
    });
    await refreshData();
    return { success: res.success, error: res.error, ticketNumber: res.data?.ticket_number };
  };

  // Wallets are only ever credited by (a) a Super Admin after verifying a payment, or
  // (b) the payment-gateway webhook. A customer can never credit their own wallet.
  const creditWallet: AppContextType['creditWallet'] = async (amount, channel = 'VIRTUAL_ACCOUNT', note, targetUserId) => {
    if (currentUser.role !== 'SUPER_ADMIN') {
      return {
        success: false,
        error:
          'Online payment is not connected yet. Transfer to your account number and your wallet is credited as soon as the payment is verified.',
      };
    }
    const res = await rpc('admin_credit_wallet', {
      p_user_id: targetUserId || currentUser.id,
      p_amount: amount,
      p_note: note || `Funding via ${channel}`,
    });
    await refreshData();
    return { success: res.success, error: res.error };
  };

  const debitWalletManual: AppContextType['debitWalletManual'] = async (amount, note, targetUserId) => {
    const res = await rpc('admin_debit_wallet', { p_user_id: targetUserId, p_amount: amount, p_note: note });
    await refreshData();
    return { success: res.success, error: res.error };
  };

  const addTicket: AppContextType['addTicket'] = async (ticketData) => {
    const res = await rpc('create_support_ticket', {
      p_type: ticketData.type,
      p_priority: ticketData.priority,
      p_subject: ticketData.subject,
      p_description: ticketData.description,
      p_service_title: ticketData.serviceTitle,
    });
    if (!res.success) return { ticketNumber: '', error: res.error };
    await refreshData();
    return { ticketNumber: res.data?.ticket_number || '' };
  };

  const updateTicketStatus: AppContextType['updateTicketStatus'] = async (ticketId, status, notes, slipUrl) => {
    const res = await rpc('staff_update_ticket', {
      p_ticket_id: ticketId,
      p_status: status,
      p_notes: notes ?? null,
      p_slip_url: slipUrl ?? null,
    });
    await refreshData();
    return { success: res.success, error: res.error };
  };

  const addVerificationResult = (result: VerificationResult) => {
    setRecentVerifications((prev) => [result, ...prev]);
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!profile,
        authLoading,
        signUp,
        signIn,
        staffSignIn,
        signOut,
        createStaffAccount,
        setStaffActive,
        refreshUsers: refreshData,
        theme,
        toggleTheme,
        services,
        updateServicePrice,
        transactions,
        tickets,
        addTicket,
        submitServiceTicket,
        updateTicketStatus,
        debitWalletForService,
        runService,
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
