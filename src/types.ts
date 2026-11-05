export type UserRole = 'USER' | 'SUPPORT_ADMIN' | 'SUPER_ADMIN';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  avatarInitials: string;
  tier: 'SMART' | 'PREMIUM' | 'ENTERPRISE';
  walletBalance: number;
  virtualAccount: {
    bankName: string;
    accountNumber: string;
    accountName: string;
  };
  createdAt: string;
  isActive?: boolean;
}

export type ServiceType = 'instant' | 'async';

export interface ServiceItem {
  id: string;
  title: string;
  category: 'NIN' | 'BVN' | 'CLEARANCE' | 'VALIDATION' | 'MODIFICATION';
  type: ServiceType;
  price: number;
  description: string;
  badge: string;
  turnaround: string;
  requiresDocumentUpload?: boolean;
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  type: 'DEBIT' | 'CREDIT' | 'REFUND';
  status: 'SUCCESS' | 'PENDING' | 'FAILED';
  description: string;
  reference: string;
  channel?: 'VIRTUAL_ACCOUNT' | 'CARD' | 'USSD' | 'ADMIN_OVERRIDE' | 'SYSTEM_REFUND';
  createdAt: string;
  auditNote?: string;
  adminId?: string;
}

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED' | 'CLOSED';

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  serviceId?: string;
  serviceTitle: string;
  type: 'SERVICE_REQUEST' | 'SUPPORT_INQUIRY' | 'FUNDING_ISSUE';
  status: TicketStatus;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  subject: string;
  description: string;
  attachedDocs?: Array<{ name: string; url?: string; type: string }>;
  resolutionNotes?: string;
  processedBy?: string;
  processedAt?: string;
  resultSlipUrl?: string;
  refunded?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VerificationResult {
  serviceId: string;
  trackingId: string;
  queryParam: string;
  pdfBase64?: string;
  timestamp: string;
  data: {
    nin?: string;
    bvn?: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    dob: string;
    gender: 'Male' | 'Female';
    phone: string;
    address: string;
    lga: string;
    stateOfOrigin: string;
    residenceState: string;
    trackingNumber: string;
    photoUrl?: string;
  };
}
