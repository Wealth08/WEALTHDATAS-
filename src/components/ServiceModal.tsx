import React, { useState } from 'react';
import { X, Search, FileText, CheckCircle2, AlertTriangle, Download, ArrowRight, Loader2, Upload, Eye } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ServiceItem, VerificationResult } from '../types';
import { formatNaira, validateNIN, validateBVN, validatePhone } from '../utils/rules';
import { generatePremiumSlipPDF } from '../utils/pdfGenerator';

interface ServiceModalProps {
  service: ServiceItem | null;
  onClose: () => void;
}

export const ServiceModal: React.FC<ServiceModalProps> = ({ service, onClose }) => {
  const { currentUser, debitWalletForService, addTicket, addVerificationResult, setIsAddFundsOpen } = useApp();

  // Instant query state
  const [queryInput, setQueryInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [result, setResult] = useState<VerificationResult | null>(null);

  // Async ticket state
  const [asyncFullName, setAsyncFullName] = useState(currentUser.name);
  const [asyncIdNumber, setAsyncIdNumber] = useState('');
  const [asyncModificationDetail, setAsyncModificationDetail] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [isSubmittedTicket, setIsSubmittedTicket] = useState(false);
  const [submittedTicketNumber, setSubmittedTicketNumber] = useState('');

  if (!service) return null;

  const isInstant = service.type === 'instant';

  // Handle instant search execution
  const handleInstantSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Input validation based on service type
    const isPhoneSearch = service.id.includes('phone');
    const isBVN = service.category === 'BVN';

    if (isPhoneSearch) {
      const v = validatePhone(queryInput);
      if (!v.valid) {
        setErrorMsg(v.error || 'Invalid phone number');
        return;
      }
    } else if (isBVN) {
      const v = validateBVN(queryInput);
      if (!v.valid) {
        setErrorMsg(v.error || 'Invalid BVN');
        return;
      }
    } else {
      const v = validateNIN(queryInput);
      if (!v.valid) {
        setErrorMsg(v.error || 'Invalid NIN');
        return;
      }
    }

    // Check balance & debit wallet
    const debit = debitWalletForService(
      service,
      `${service.title} lookup for query #${queryInput}`
    );

    if (!debit.success) {
      setErrorMsg(debit.error || 'Insufficient funds');
      return;
    }

    setIsProcessing(true);

    // Simulate official NIMC/NIBSS API query roundtrip
    setTimeout(() => {
      const cleanNum = queryInput.replace(/\s+/g, '');
      const mockResult: VerificationResult = {
        serviceId: service.id,
        trackingId: `WD-NIG-${Math.floor(100000000 + Math.random() * 900000000)}`,
        queryParam: cleanNum,
        timestamp: new Date().toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
        data: {
          nin: isBVN ? undefined : cleanNum.length === 11 ? cleanNum : '54920193821',
          bvn: isBVN ? cleanNum : '22481920491',
          firstName: 'Chukwuma',
          middleName: 'Emeka',
          lastName: 'Okonkwo',
          dob: '1992-08-14',
          gender: 'Male',
          phone: isPhoneSearch ? cleanNum : '08034567890',
          address: 'Plot 14, Commercial Avenue, Sabo, Yaba',
          lga: 'Lagos Mainland',
          stateOfOrigin: 'Anambra',
          residenceState: 'Lagos',
          trackingNumber: `NIMC-APP-${Math.floor(1000000 + Math.random() * 9000000)}`,
        },
      };

      setResult(mockResult);
      addVerificationResult(mockResult);
      setIsProcessing(false);
    }, 1400);
  };

  // Handle async ticket submission
  const handleAsyncSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!asyncIdNumber.trim()) {
      setErrorMsg('Please provide your NIN or BVN reference');
      return;
    }

    if (service.requiresDocumentUpload && uploadedFiles.length === 0) {
      setErrorMsg('Please upload at least one supporting document (Affidavit, ID, or Gazette)');
      return;
    }

    // Debit wallet for async service
    const debit = debitWalletForService(
      service,
      `${service.title} ticket submission for ref #${asyncIdNumber}`
    );

    if (!debit.success) {
      setErrorMsg(debit.error || 'Insufficient funds');
      return;
    }

    setIsProcessing(true);

    setTimeout(() => {
      const ticket = addTicket({
        userId: currentUser.id,
        userName: asyncFullName,
        userEmail: currentUser.email,
        userPhone: currentUser.phone,
        serviceId: service.id,
        serviceTitle: service.title,
        type: 'SERVICE_REQUEST',
        status: 'OPEN',
        priority: 'HIGH',
        subject: `${service.title} for ${asyncFullName}`,
        description: asyncModificationDetail || `Request for ${service.title}. Ref ID: ${asyncIdNumber}`,
        attachedDocs: uploadedFiles.map((f) => ({
          name: f,
          type: 'application/pdf',
        })),
      });

      setSubmittedTicketNumber(ticket.ticketNumber);
      setIsSubmittedTicket(true);
      setIsProcessing(false);
    }, 1000);
  };

  const handleDownloadPDF = () => {
    if (!result) return;
    const isBVN = service.category === 'BVN';
    const doc = generatePremiumSlipPDF(result, isBVN ? 'BVN' : 'NIN');
    doc.save(`Wealthdatas_${isBVN ? 'BVN' : 'NIN'}_Premium_Slip_${result.queryParam}.pdf`);
  };

  const handleSimulateFileUpload = () => {
    const docSamples = [
      'Court_Affidavit_Declaration.pdf',
      'National_Newspaper_Publication.jpg',
      'NIMC_IPE_Original_Slip.pdf',
      'Birth_Certificate_Attestation.pdf',
    ];
    const picked = docSamples[uploadedFiles.length % docSamples.length];
    setUploadedFiles((prev) => [...prev, picked]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl liquid-glass-card shadow-2xl p-6 md:p-8">
        {/* Header */}
        <div className="flex items-start justify-between pb-5 border-b border-neutral-200/80 dark:border-neutral-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-semibold">
                {service.badge}
              </span>
              <span className="text-xs text-neutral-500 font-medium">{service.turnaround}</span>
            </div>
            <h3 className="text-xl font-bold text-neutral-900 dark:text-white tracking-tight">
              {service.title}
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              {service.description}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pricing notice badge */}
        <div className="my-5 p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/80 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-neutral-500 block">Service Processing Fee</span>
            <span className="text-xl font-mono font-bold text-neutral-950 dark:text-white tabular-nums">
              {formatNaira(service.price)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-xs text-neutral-500 block">Your Current Balance</span>
            <span
              className={`text-sm font-mono font-bold tabular-nums ${
                currentUser.walletBalance >= service.price
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-500'
              }`}
            >
              {formatNaira(currentUser.walletBalance)}
            </span>
            {currentUser.walletBalance < service.price && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  setIsAddFundsOpen(true);
                }}
                className="text-[11px] text-neutral-900 dark:text-white underline font-semibold block mt-0.5"
              >
                + Fund Wallet
              </button>
            )}
          </div>
        </div>

        {errorMsg && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ---------------- INSTANT SERVICE FLOW ---------------- */}
        {isInstant && !result && (
          <form onSubmit={handleInstantSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                {service.id.includes('phone')
                  ? 'Enter Registered Mobile Phone Number'
                  : service.category === 'BVN'
                  ? 'Enter 11-Digit Bank Verification Number (BVN)'
                  : 'Enter 11-Digit National Identification Number (NIN)'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder={
                    service.id.includes('phone')
                      ? 'e.g. 08012345678'
                      : service.category === 'BVN'
                      ? 'e.g. 22334455667'
                      : 'e.g. 12345678901'
                  }
                  value={queryInput}
                  onChange={(e) => setQueryInput(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-sm font-mono tracking-wider tabular-nums focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition"
                />
              </div>
              <p className="mt-1.5 text-[11px] text-neutral-500">
                Official API connection directly queries NIMC / NIBSS central databases. Fee of{' '}
                {formatNaira(service.price)} will be debited upon query.
              </p>
            </div>

            <button
              type="submit"
              disabled={isProcessing}
              className="w-full py-3.5 px-4 rounded-xl bg-neutral-950 text-white dark:bg-white dark:text-black font-semibold text-sm hover:opacity-90 active:scale-[0.99] transition shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connecting to Central Database...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Verify & Generate Slip ({formatNaira(service.price)})
                </>
              )}
            </button>
          </form>
        )}

        {/* INSTANT RESULT SLIP DISPLAY */}
        {isInstant && result && (
          <div className="space-y-5 animate-in fade-in duration-300">
            <div className="p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Record Successfully Retrieved & Verified</span>
              </div>
              <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400">
                Ref: {result.trackingId}
              </span>
            </div>

            {/* Slip Preview Card */}
            <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
                <div>
                  <span className="text-[11px] text-neutral-400 uppercase tracking-wider block">
                    {service.category} Number
                  </span>
                  <span className="text-xl font-mono font-bold tracking-wider text-neutral-950 dark:text-white">
                    {result.data.nin || result.data.bvn}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-neutral-400 block">Status</span>
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    VERIFIED ACTIVE
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-neutral-400 block text-[11px]">Full Name</span>
                  <span className="font-semibold text-neutral-900 dark:text-white">
                    {result.data.lastName} {result.data.firstName} {result.data.middleName}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-400 block text-[11px]">Date of Birth</span>
                  <span className="font-semibold text-neutral-900 dark:text-white">
                    {result.data.dob} ({result.data.gender})
                  </span>
                </div>
                <div>
                  <span className="text-neutral-400 block text-[11px]">Residential Address</span>
                  <span className="font-medium text-neutral-800 dark:text-neutral-300">
                    {result.data.address}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-400 block text-[11px]">State / LGA of Origin</span>
                  <span className="font-medium text-neutral-800 dark:text-neutral-300">
                    {result.data.stateOfOrigin} State ({result.data.lga} LGA)
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={handleDownloadPDF}
                className="flex-1 py-3 px-4 rounded-xl bg-neutral-950 text-white dark:bg-white dark:text-black font-semibold text-sm hover:opacity-90 active:scale-[0.99] transition shadow-md flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download Premium Slip (PDF)
              </button>
              <button
                type="button"
                onClick={() => {
                  setResult(null);
                  setQueryInput('');
                }}
                className="py-3 px-5 rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
              >
                Perform Another Search
              </button>
            </div>
          </div>
        )}

        {/* ---------------- ASYNC SERVICE FLOW (MODIFICATIONS & IPE CLEARANCE) ---------------- */}
        {!isInstant && !isSubmittedTicket && (
          <form onSubmit={handleAsyncSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Applicant Full Legal Name
              </label>
              <input
                type="text"
                required
                value={asyncFullName}
                onChange={(e) => setAsyncFullName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                {service.category === 'BVN' ? 'BVN Number (11 Digits)' : 'NIN Number (11 Digits)'}
              </label>
              <input
                type="text"
                required
                placeholder="11 digits"
                value={asyncIdNumber}
                onChange={(e) => setAsyncIdNumber(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-sm font-mono tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Adjustment Details / Reason for Request
              </label>
              <textarea
                rows={3}
                required
                placeholder="State the requested correction (e.g. Correct surname from 'Okoko' to 'Okonkwo', or NIMC biometric error collision clearance code)."
                value={asyncModificationDetail}
                onChange={(e) => setAsyncModificationDetail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-sm resize-none"
              />
            </div>

            {/* Document Upload Area */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Required Proof Documents (Court Affidavit, Gazette, or Birth Certificate)
              </label>

              <div className="p-4 rounded-2xl border-2 border-dashed border-neutral-300 dark:border-neutral-700 text-center bg-neutral-50/50 dark:bg-neutral-900/50">
                <Upload className="w-6 h-6 text-neutral-400 mx-auto mb-2" />
                <p className="text-xs text-neutral-600 dark:text-neutral-400">
                  Upload PDF, PNG, or JPG proofs (Max 5MB per file)
                </p>
                <button
                  type="button"
                  onClick={handleSimulateFileUpload}
                  className="mt-2.5 px-3 py-1.5 rounded-lg bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-xs font-medium text-neutral-900 dark:text-white transition"
                >
                  + Add Document Attachment
                </button>
              </div>

              {uploadedFiles.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {uploadedFiles.map((fn, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-xs flex items-center justify-between"
                    >
                      <span className="flex items-center gap-1.5 text-neutral-800 dark:text-neutral-200 font-medium">
                        <FileText className="w-3.5 h-3.5 text-neutral-500" />
                        {fn}
                      </span>
                      <span className="text-[10px] text-emerald-600 font-semibold">Attached</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isProcessing}
              className="w-full py-3.5 px-4 rounded-xl bg-neutral-950 text-white dark:bg-white dark:text-black font-semibold text-sm hover:opacity-90 active:scale-[0.99] transition shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Routing to Support Admin Desk...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  Submit Request & Debit Wallet ({formatNaira(service.price)})
                </>
              )}
            </button>
          </form>
        )}

        {/* ASYNC CONFIRMATION DISPLAY */}
        {!isInstant && isSubmittedTicket && (
          <div className="p-6 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-neutral-950 dark:text-white">
                Ticket Created: {submittedTicketNumber}
              </h4>
              <p className="text-xs text-neutral-500 mt-1 max-w-md mx-auto">
                Your request has entered the Support Queue. A Support Admin will review your
                documents and process the clearance within 24 to 48 hours. If rejected for any
                reason, your {formatNaira(service.price)} will be automatically refunded.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-6 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-black text-xs font-semibold hover:opacity-90 transition"
            >
              Done & Return to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
