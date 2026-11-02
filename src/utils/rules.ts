import { ServiceItem, Transaction, UserProfile } from '../types';

export const DEFAULT_SERVICES: ServiceItem[] = [
  {
    id: 'nin-premium-slip',
    title: 'NIN Premium Slip',
    category: 'NIN',
    type: 'instant',
    price: 420.0,
    description: 'Instant verifiable NIMC national identity premium slip with secure QR code.',
    badge: 'NIMC Official',
    turnaround: 'Instant (1-3s)',
  },
  {
    id: 'nin-by-phone',
    title: 'NIN by Phone',
    category: 'NIN',
    type: 'instant',
    price: 420.0,
    description: 'Instant demographic and NIN lookup linked to mobile phone number.',
    badge: 'Lookup',
    turnaround: 'Instant',
  },
  {
    id: 'nin-by-demographic',
    title: 'NIN by Demographic',
    category: 'NIN',
    type: 'instant',
    price: 420.0,
    description: 'Search NIN using first name, surname, and date of birth.',
    badge: 'Search',
    turnaround: 'Instant',
  },
  {
    id: 'bvn-premium-slip',
    title: 'BVN Premium Slip',
    category: 'BVN',
    type: 'instant',
    price: 420.0,
    description: 'High-resolution official Bank Verification Number slip with biometric details.',
    badge: 'NIBSS Official',
    turnaround: 'Instant',
  },
  {
    id: 'bvn-retrieval',
    title: 'BVN Retrieval',
    category: 'BVN',
    type: 'instant',
    price: 1430.0,
    description: 'Direct NIBSS lookup to recover lost or forgotten BVN record.',
    badge: 'NIBSS Retrieval',
    turnaround: 'Instant',
  },
  {
    id: 'ipe-clearance',
    title: 'IPE Clearance',
    category: 'CLEARANCE',
    type: 'async',
    price: 990.0,
    description: 'NIMC biometric data collision clearance & IPE exception resolution queue.',
    badge: 'Support Queue',
    turnaround: '24 - 48 Hours',
    requiresDocumentUpload: true,
  },
  {
    id: 'nin-validation',
    title: 'NIN Validation',
    category: 'VALIDATION',
    type: 'instant',
    price: 1420.0,
    description: 'Live NIMC database validation and status confirmation for inactive records.',
    badge: 'NIMC Portal',
    turnaround: 'Instant API',
  },
  {
    id: 'nin-name-mod',
    title: 'NIN Name Modification',
    category: 'MODIFICATION',
    type: 'async',
    price: 990.0,
    description: 'Legal name correction, marital change, or spelling correction on NIMC database.',
    badge: 'Async Processing',
    turnaround: '24 - 72 Hours',
    requiresDocumentUpload: true,
  },
  {
    id: 'nin-phone-mod',
    title: 'NIN Phone Modification',
    category: 'MODIFICATION',
    type: 'async',
    price: 620.0,
    description: 'Link new primary mobile telephone number to existing NIN profile.',
    badge: 'Async Processing',
    turnaround: '24 - 48 Hours',
    requiresDocumentUpload: true,
  },
  {
    id: 'nin-address-mod',
    title: 'NIN Address Modification',
    category: 'MODIFICATION',
    type: 'async',
    price: 480.0,
    description: 'Residential state, LGA, and home street address adjustment on NIMC database.',
    badge: 'Async Processing',
    turnaround: '24 - 48 Hours',
    requiresDocumentUpload: true,
  },
  {
    id: 'bvn-name-mod',
    title: 'BVN Name Modification',
    category: 'MODIFICATION',
    type: 'async',
    price: 470.0,
    description: 'Bank Verification Number customer name amendment and bank syncing.',
    badge: 'Async Processing',
    turnaround: '24 - 48 Hours',
    requiresDocumentUpload: true,
  },
  {
    id: 'bvn-phone-mod',
    title: 'BVN Phone Modification',
    category: 'MODIFICATION',
    type: 'async',
    price: 480.0,
    description: 'Update phone number registered with NIBSS BVN database.',
    badge: 'Async Processing',
    turnaround: '24 - 48 Hours',
    requiresDocumentUpload: true,
  },
  {
    id: 'bvn-address-mod',
    title: 'BVN Address Modification',
    category: 'MODIFICATION',
    type: 'async',
    price: 470.0,
    description: 'Residential and mailing address adjustment on central BVN ledger.',
    badge: 'Async Processing',
    turnaround: '24 - 48 Hours',
    requiresDocumentUpload: true,
  },
  {
    id: 'bvn-dob-mod',
    title: 'BVN DOB Modification',
    category: 'MODIFICATION',
    type: 'async',
    price: 480.0,
    description: 'Date of birth correction backed by sworn affidavit & birth certificate.',
    badge: 'Async Processing',
    turnaround: '24 - 48 Hours',
    requiresDocumentUpload: true,
  },
];

/**
 * Currency formatter for Nigerian Naira (₦)
 */
export function formatNaira(amount: number): string {
  const numeric = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  return `₦${numeric.toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Validate 11-digit NIN
 */
export function validateNIN(nin: string): { valid: boolean; error?: string } {
  const clean = nin.replace(/\s+/g, '');
  if (!clean) {
    return { valid: false, error: 'Please enter an 11-digit NIN' };
  }
  if (!/^\d{11}$/.test(clean)) {
    return { valid: false, error: 'NIN must be exactly 11 numeric digits' };
  }
  return { valid: true };
}

/**
 * Validate 11-digit BVN
 */
export function validateBVN(bvn: string): { valid: boolean; error?: string } {
  const clean = bvn.replace(/\s+/g, '');
  if (!clean) {
    return { valid: false, error: 'Please enter an 11-digit BVN' };
  }
  if (!/^\d{11}$/.test(clean)) {
    return { valid: false, error: 'BVN must be exactly 11 numeric digits' };
  }
  return { valid: true };
}

/**
 * Validate Nigerian Phone Number
 */
export function validatePhone(phone: string): { valid: boolean; error?: string } {
  const clean = phone.replace(/[\s\-()]/g, '');
  if (!clean) {
    return { valid: false, error: 'Please enter a valid phone number' };
  }
  // Nigerian phone: 080..., 070..., 090..., 081..., or +23480..., +23470...
  const ngRegex = /^(?:(?:\+?234)|0)[789][01]\d{8}$/;
  if (!ngRegex.test(clean)) {
    return {
      valid: false,
      error: 'Enter a valid 11-digit Nigerian mobile number (e.g., 08012345678)',
    };
  }
  return { valid: true };
}

/**
 * Check if wallet balance is sufficient
 */
export function canAfford(balance: number, fee: number): boolean {
  return balance >= fee;
}

/**
 * Process a wallet debit transaction
 */
export function processWalletDebit(
  currentBalance: number,
  fee: number,
  description: string,
  userId: string,
  refId?: string
): { success: boolean; newBalance: number; transaction?: Transaction; error?: string } {
  if (!canAfford(currentBalance, fee)) {
    return {
      success: false,
      newBalance: currentBalance,
      error: `Insufficient balance. Required: ${formatNaira(fee)}, Current: ${formatNaira(currentBalance)}. Please fund your wallet.`,
    };
  }

  const newBalance = Math.round((currentBalance - fee) * 100) / 100;
  const transaction: Transaction = {
    id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    userId,
    amount: fee,
    type: 'DEBIT',
    status: 'SUCCESS',
    description,
    reference: refId || `WD-SRV-${Math.floor(100000000 + Math.random() * 900000000)}`,
    createdAt: new Date().toISOString(),
  };

  return { success: true, newBalance, transaction };
}

/**
 * Process a wallet credit transaction
 */
export function processWalletCredit(
  currentBalance: number,
  amount: number,
  description: string,
  userId: string,
  channel: Transaction['channel'] = 'VIRTUAL_ACCOUNT',
  adminNote?: string,
  adminId?: string
): { success: boolean; newBalance: number; transaction: Transaction } {
  const newBalance = Math.round((currentBalance + amount) * 100) / 100;
  const transaction: Transaction = {
    id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    userId,
    amount,
    type: 'CREDIT',
    status: 'SUCCESS',
    description,
    channel,
    reference: `WD-FND-${Math.floor(100000000 + Math.random() * 900000000)}`,
    createdAt: new Date().toISOString(),
    auditNote: adminNote,
    adminId,
  };

  return { success: true, newBalance, transaction };
}

/**
 * Automatic refund policy: if manual ticket is rejected or instant API fails
 */
export function processAutoRefund(
  currentBalance: number,
  amount: number,
  reason: string,
  userId: string,
  originalRef?: string
): { success: boolean; newBalance: number; transaction: Transaction } {
  const newBalance = Math.round((currentBalance + amount) * 100) / 100;
  const transaction: Transaction = {
    id: `ref_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    userId,
    amount,
    type: 'REFUND',
    status: 'SUCCESS',
    description: `Auto-Refund: ${reason}`,
    channel: 'SYSTEM_REFUND',
    reference: originalRef ? `WD-REF-${originalRef}` : `WD-REF-${Math.floor(100000000 + Math.random() * 900000000)}`,
    createdAt: new Date().toISOString(),
  };

  return { success: true, newBalance, transaction };
}

/**
 * Deterministic Virtual Account Number generation for Monnify / Paystack DVA
 */
export function generateVirtualAccount(userId: string, name: string): UserProfile['virtualAccount'] {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) % 10000000000;
  }
  const cleanNum = Math.abs(hash).toString().padStart(10, '0');
  const accountNumber = `90${cleanNum.slice(2)}`;

  return {
    bankName: 'Wema Bank (Monnify / Paystack DVA)',
    accountNumber,
    accountName: `WEALTHDATAS / ${name.toUpperCase()}`,
  };
}
