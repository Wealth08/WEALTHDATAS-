import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_SERVICES,
  formatNaira,
  validateNIN,
  validateBVN,
  validatePhone,
  canAfford,
  processWalletDebit,
  processWalletCredit,
  processAutoRefund,
  generateVirtualAccount,
} from './rules';

test('exact pricing schedule adheres to Wealthdatas catalog', () => {
  const getPrice = (id: string) => DEFAULT_SERVICES.find((s) => s.id === id)?.price;

  assert.equal(getPrice('nin-premium-slip'), 420.0);
  assert.equal(getPrice('nin-by-phone'), 420.0);
  assert.equal(getPrice('nin-by-demographic'), 420.0);
  assert.equal(getPrice('bvn-premium-slip'), 420.0);
  assert.equal(getPrice('bvn-retrieval'), 1430.0);
  assert.equal(getPrice('ipe-clearance'), 990.0);
  assert.equal(getPrice('nin-validation'), 1420.0);
  assert.equal(getPrice('nin-name-mod'), 990.0);
  assert.equal(getPrice('nin-phone-mod'), 620.0);
  assert.equal(getPrice('nin-address-mod'), 480.0);
  assert.equal(getPrice('bvn-name-mod'), 470.0);
  assert.equal(getPrice('bvn-phone-mod'), 480.0);
  assert.equal(getPrice('bvn-address-mod'), 470.0);
  assert.equal(getPrice('bvn-dob-mod'), 480.0);
  assert.equal(DEFAULT_SERVICES.length, 14);
});

test('currency formatting formats Nigerian Naira with tabular precision', () => {
  assert.equal(formatNaira(420), '₦420.00');
  assert.equal(formatNaira(1430.5), '₦1,430.50');
  assert.equal(formatNaira(0), '₦0.00');
});

test('NIN validation requires exactly 11 numeric digits', () => {
  assert.equal(validateNIN('12345678901').valid, true);
  assert.equal(validateNIN(' 12345678901 ').valid, true);
  assert.equal(validateNIN('1234567890').valid, false);
  assert.equal(validateNIN('123456789012').valid, false);
  assert.equal(validateNIN('1234567890a').valid, false);
  assert.equal(validateNIN('').valid, false);
});

test('BVN validation requires exactly 11 numeric digits', () => {
  assert.equal(validateBVN('22334455667').valid, true);
  assert.equal(validateBVN('2233445566').valid, false);
});

test('Nigerian phone number validation recognizes valid formats', () => {
  assert.equal(validatePhone('08012345678').valid, true);
  assert.equal(validatePhone('+2348012345678').valid, true);
  assert.equal(validatePhone('09087654321').valid, true);
  assert.equal(validatePhone('12345').valid, false);
});

test('wallet debit succeeds when balance is sufficient and fails when insufficient', () => {
  const resultOk = processWalletDebit(1000, 420, 'NIN Premium Slip', 'usr_1');
  assert.equal(resultOk.success, true);
  assert.equal(resultOk.newBalance, 580);
  assert.equal(resultOk.transaction?.type, 'DEBIT');

  const resultFail = processWalletDebit(200, 420, 'NIN Premium Slip', 'usr_1');
  assert.equal(resultFail.success, false);
  assert.equal(resultFail.newBalance, 200);
  assert.match(resultFail.error || '', /Insufficient balance/);
});

test('wallet credit increments balance and records audit notes for admin override', () => {
  const credit = processWalletCredit(
    500,
    1500,
    'Manual Admin Topup',
    'usr_1',
    'ADMIN_OVERRIDE',
    'Customer bank transfer verified',
    'admin_super'
  );
  assert.equal(credit.success, true);
  assert.equal(credit.newBalance, 2000);
  assert.equal(credit.transaction.auditNote, 'Customer bank transfer verified');
  assert.equal(credit.transaction.channel, 'ADMIN_OVERRIDE');
});

test('auto refund policy credits back debited amount on ticket rejection', () => {
  const refund = processAutoRefund(
    100,
    990,
    'IPE Clearance rejected: Document unreadable',
    'usr_1',
    'WD-SRV-98765'
  );
  assert.equal(refund.success, true);
  assert.equal(refund.newBalance, 1090);
  assert.equal(refund.transaction.type, 'REFUND');
  assert.match(refund.transaction.description, /Auto-Refund/);
});

test('virtual account generation produces valid 10-digit account numbers', () => {
  const account = generateVirtualAccount('usr_123', 'Nwoke Nnanna');
  assert.equal(account.accountNumber.length, 10);
  assert.equal(account.accountName, 'WEALTHDATAS / NWOKE NNANNA');
  assert.match(account.bankName, /Wema Bank/);
});
