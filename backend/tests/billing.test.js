const billing = require('../services/billingService');
const { amountInWords, renderInvoicePdf } = require('../services/invoicePdfService');

describe('billing: GST split (prices are GST-inclusive)', () => {
  const seller = billing.sanitizeProfile({ legalName: 'Test Co', state: 'Gujarat', gstin: '24ABCDE1234F1Z5', gstRate: 18 });

  test('no GSTIN → non-GST invoice, total unchanged', () => {
    const t = billing.computeTax(2999, billing.sanitizeProfile({ legalName: 'X' }), 'Gujarat');
    expect(t.registered).toBe(false);
    expect(t.taxable).toBe(2999);
    expect(t.cgst + t.sgst + t.igst).toBe(0);
  });

  test('same state → CGST + SGST that add back to the total', () => {
    const t = billing.computeTax(2999, seller, 'Gujarat');
    expect(t.intra).toBe(true);
    expect(t.igst).toBe(0);
    expect(t.taxable).toBe(2541.53);
    expect(billing.round2(t.taxable + t.cgst + t.sgst)).toBe(2999);
  });

  test('other state → IGST only', () => {
    const t = billing.computeTax(99990, seller, 'Maharashtra');
    expect(t.intra).toBe(false);
    expect(t.cgst).toBe(0);
    expect(t.igst).toBe(15252.71);
    expect(billing.round2(t.taxable + t.igst)).toBe(99990);
  });

  test('unknown buyer state → place of supply is the seller state', () => {
    const t = billing.computeTax(1499, seller, '');
    expect(t.intra).toBe(true);
    expect(t.placeOfSupply).toBe('Gujarat');
  });
});

describe('billing: profile validation', () => {
  test('rejects a malformed GSTIN', () => {
    const errors = billing.validateProfile(billing.sanitizeProfile({ legalName: 'A', gstin: 'NOTAGSTIN' }));
    expect(errors.join(' ')).toMatch(/GSTIN/);
  });

  test('rejects a GSTIN whose state code does not match the state', () => {
    const errors = billing.validateProfile(billing.sanitizeProfile({ legalName: 'A', gstin: '24ABCDE1234F1Z5', state: 'Maharashtra' }));
    expect(errors.join(' ')).toMatch(/state code 24/);
  });

  test('accepts a valid profile and clamps the GST rate', () => {
    const p = billing.sanitizeProfile({ legalName: 'A', gstin: '24abcde1234f1z5', state: 'Gujarat', gstRate: 99 });
    expect(p.gstin).toBe('24ABCDE1234F1Z5');
    expect(p.gstRate).toBe(18);
    expect(billing.validateProfile(p)).toEqual([]);
  });
});

describe('billing: invoice numbering and words', () => {
  test('Indian financial year label', () => {
    expect(billing.financialYear(new Date('2026-04-01'))).toBe('26-27');
    expect(billing.financialYear(new Date('2027-03-31'))).toBe('26-27');
    expect(billing.financialYear(new Date('2027-04-01'))).toBe('27-28');
  });

  test('amount in words uses lakh/crore', () => {
    expect(amountInWords(2999)).toBe('Indian Rupees Two Thousand Nine Hundred Ninety Nine Only');
    expect(amountInWords(2399.2)).toBe('Indian Rupees Two Thousand Three Hundred Ninety Nine and Twenty Paise Only');
    expect(amountInWords(125000)).toBe('Indian Rupees One Lakh Twenty Five Thousand Only');
    expect(amountInWords(10000000)).toBe('Indian Rupees One Crore Only');
  });

  test('renders a PDF for an old invoice without snapshots', async () => {
    const pdf = await renderInvoicePdf({
      invoiceNumber: 'INV-1001',
      items: [{ description: 'Growth plan', quantity: 1, unitPrice: 2999, amount: 2999 }],
      subtotal: 2999, totalAmount: 2999, status: 'paid', paymentStatus: 'completed',
      customerName: 'Old Merchant', customerEmail: 'old@example.com', createdAt: new Date('2026-06-01'),
      seller: billing.sanitizeProfile({ legalName: 'Kwickbot' })
    });
    expect(pdf.slice(0, 5).toString()).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(2000);
  });
});

describe('billing: mandatory buyer billing details validation', () => {
  test('strict mode rejects missing address, city, state, and pincode', () => {
    const res = billing.validateBuyerBillingDetails({ legalName: 'Acme Pvt Ltd' }, { strict: true });
    expect(res.errors.length).toBeGreaterThanOrEqual(4);
    expect(res.missingFields).toEqual(expect.arrayContaining(['addressLine', 'city', 'state', 'pincode']));
  });

  test('strict mode accepts a complete buyer billing profile with valid GSTIN', () => {
    const res = billing.validateBuyerBillingDetails({
      legalName: 'Acme Pvt Ltd',
      gstin: '24ABCDE1234F1Z5',
      addressLine: '201 SG Highway',
      city: 'Ahmedabad',
      state: 'Gujarat',
      pincode: '380015'
    }, { strict: true });
    expect(res.errors).toEqual([]);
    expect(res.missingFields).toEqual([]);
  });

  test('strict mode rejects GSTIN state code mismatch', () => {
    const res = billing.validateBuyerBillingDetails({
      legalName: 'Acme Pvt Ltd',
      gstin: '24ABCDE1234F1Z5',
      addressLine: '101 MG Road',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001'
    }, { strict: true });
    expect(res.errors.join(' ')).toMatch(/state code 24/i);
  });

  test('non-strict mode allows optional address/city/state/pincode', () => {
    const res = billing.validateBuyerBillingDetails({ legalName: 'Acme Pvt Ltd' }, { strict: false });
    expect(res.errors).toEqual([]);
  });
});
