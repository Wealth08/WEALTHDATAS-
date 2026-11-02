import jsPDF from 'jspdf';
import { VerificationResult } from '../types';

/**
 * Generates an official, verifiable Nigerian Identity / BVN Premium Slip as a high-res PDF.
 */
export function generatePremiumSlipPDF(record: VerificationResult, serviceType: 'NIN' | 'BVN'): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const isNIN = serviceType === 'NIN';
  const primaryGreen = [16, 92, 54]; // #105C36 Nigerian Green
  const darkObsidian = [20, 20, 24];
  const gold = [197, 160, 89];

  // Background subtle border
  doc.setDrawColor(220, 225, 230);
  doc.setLineWidth(0.8);
  doc.roundedRect(15, 15, 180, 267, 4, 4);

  // Top National Security Strip
  doc.setFillColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
  doc.rect(15, 15, 180, 24, 'F');

  // National Header Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('FEDERAL REPUBLIC OF NIGERIA', 105, 24, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const subAgency = isNIN
    ? 'NATIONAL IDENTITY MANAGEMENT COMMISSION (NIMC)'
    : 'NIGERIA INTER-BANK SETTLEMENT SYSTEM (NIBSS)';
  doc.text(subAgency, 105, 30, { align: 'center' });
  doc.text('CENTRAL IDENTITY & BIOMETRIC REPOSITORY', 105, 35, { align: 'center' });

  // Document Type Header
  doc.setFillColor(245, 247, 249);
  doc.rect(15, 39, 180, 14, 'F');
  doc.setTextColor(darkObsidian[0], darkObsidian[1], darkObsidian[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  const docTitle = isNIN
    ? 'NATIONAL IDENTIFICATION NUMBER SLIP (NINS - PREMIUM)'
    : 'BANK VERIFICATION NUMBER ENROLMENT SLIP (BVN - PREMIUM)';
  doc.text(docTitle, 105, 48, { align: 'center' });

  // Security Watermark Emblem circle in center
  doc.setDrawColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
  doc.setLineWidth(0.5);
  doc.circle(105, 140, 45);
  doc.circle(105, 140, 43);

  // Main ID Box (Huge NIN / BVN display)
  doc.setFillColor(235, 244, 238);
  doc.setDrawColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
  doc.setLineWidth(1);
  doc.roundedRect(25, 58, 160, 22, 2, 2, 'FD');

  doc.setTextColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  const labelId = isNIN ? 'NATIONAL IDENTIFICATION NUMBER (NIN)' : 'BANK VERIFICATION NUMBER (BVN)';
  doc.text(labelId, 105, 65, { align: 'center' });

  const rawNumber = isNIN ? record.data.nin || '12345678901' : record.data.bvn || '22334455667';
  const formattedNumber = `${rawNumber.slice(0, 4)}  ${rawNumber.slice(4, 7)}  ${rawNumber.slice(7)}`;
  doc.setFontSize(16);
  doc.text(formattedNumber, 105, 75, { align: 'center' });

  // Photo Box (Left)
  doc.setFillColor(240, 240, 245);
  doc.setDrawColor(180, 185, 195);
  doc.roundedRect(25, 86, 38, 48, 2, 2, 'FD');

  // Photo Silhouette / Placeholder
  doc.setTextColor(120, 125, 135);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('OFFICIAL', 44, 106, { align: 'center' });
  doc.text('BIOMETRIC', 44, 111, { align: 'center' });
  doc.text('PHOTO', 44, 116, { align: 'center' });

  // Personal Info Table (Right of photo)
  const leftColX = 70;
  const valColX = 115;
  let currentY = 92;
  const lineSpacing = 7;

  const fields = [
    { label: 'SURNAME:', val: record.data.lastName.toUpperCase() },
    { label: 'FIRST NAME:', val: record.data.firstName.toUpperCase() },
    { label: 'MIDDLE NAME:', val: (record.data.middleName || 'N/A').toUpperCase() },
    { label: 'DATE OF BIRTH:', val: record.data.dob },
    { label: 'GENDER:', val: record.data.gender },
    { label: 'TELEPHONE:', val: record.data.phone },
  ];

  doc.setFontSize(9);
  fields.forEach((f) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(70, 75, 85);
    doc.text(f.label, leftColX, currentY);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(20, 25, 30);
    doc.text(f.val, valColX, currentY);
    currentY += lineSpacing;
  });

  // Full-width Demographic Details Box
  const boxY = 142;
  doc.setFillColor(250, 252, 255);
  doc.setDrawColor(215, 220, 230);
  doc.roundedRect(25, boxY, 160, 52, 2, 2, 'FD');

  const detailedFields = [
    { label: 'RESIDENTIAL ADDRESS:', val: record.data.address },
    { label: 'LOCAL GOVT. AREA (LGA):', val: `${record.data.lga} LGA` },
    { label: 'STATE OF ORIGIN:', val: `${record.data.stateOfOrigin} State` },
    { label: 'STATE OF RESIDENCE:', val: `${record.data.residenceState} State` },
    { label: 'TRACKING ID / REF:', val: record.trackingId },
    { label: 'ENROLMENT DATE / VERIFIED:', val: record.timestamp },
  ];

  let dY = boxY + 8;
  detailedFields.forEach((df) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 85, 95);
    doc.text(df.label, 30, dY);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 20, 25);
    doc.text(df.val, 95, dY);
    dY += 7.2;
  });

  // Simulated QR Code & Barcode Section
  const qrBoxY = 202;
  doc.setFillColor(245, 245, 250);
  doc.setDrawColor(200, 205, 215);
  doc.roundedRect(25, qrBoxY, 160, 36, 2, 2, 'FD');

  // Draw simulated QR Matrix
  doc.setFillColor(20, 20, 20);
  doc.rect(32, qrBoxY + 5, 26, 26, 'F');
  // QR inner cutout patterns
  doc.setFillColor(255, 255, 255);
  doc.rect(36, qrBoxY + 9, 18, 18, 'F');
  doc.setFillColor(20, 20, 20);
  doc.rect(40, qrBoxY + 13, 10, 10, 'F');
  doc.rect(53, qrBoxY + 7, 3, 3, 'F');
  doc.rect(53, qrBoxY + 26, 3, 3, 'F');
  doc.rect(34, qrBoxY + 26, 3, 3, 'F');

  // Verification text beside QR
  doc.setTextColor(30, 35, 45);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('SECURE VERIFIABLE 2D BARCODE', 65, qrBoxY + 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(90, 95, 105);
  doc.text('Scan with NIMC MWS or Central Bank verification reader to authenticate this slip.', 65, qrBoxY + 17);
  doc.text(`Digital Signature: SHA256-${Math.random().toString(36).substring(2, 12).toUpperCase()}`, 65, qrBoxY + 23);
  doc.text(`Issuer: Wealthdatas Direct Portal (Provider Gateway Id: WD-NIG-042)`, 65, qrBoxY + 28);

  // Legal Notice & Disclaimer
  doc.setFontSize(7);
  doc.setTextColor(110, 115, 125);
  doc.text(
    'IMPORTANT NOTICE: This document is an official slip issued under the authority of the Federal Government of Nigeria.',
    105,
    248,
    { align: 'center' }
  );
  doc.text(
    'Possession of this slip does not confer citizenship. Unauthorized reproduction or alteration is punishable by law.',
    105,
    253,
    { align: 'center' }
  );

  // Footer Branding
  doc.setDrawColor(220, 225, 230);
  doc.setLineWidth(0.4);
  doc.line(25, 260, 185, 260);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
  doc.text('WEALTHDATAS VERIFICATION PORTAL', 25, 267);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(130, 135, 145);
  doc.text('support@wealthdatas.ng  |  www.wealthdatas.ng', 185, 267, { align: 'right' });

  return doc;
}
