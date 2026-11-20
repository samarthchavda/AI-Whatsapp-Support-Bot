jest.mock('../models/GlobalSettings', () => ({
  findOne: jest.fn(() => ({ lean: () => Promise.resolve({ value: { legalName: 'Test Co', state: 'Gujarat', gstin: '24ABCDE1234F1Z5', gstRate: 18 } }) }))
}));
jest.mock('../models/Counter', () => ({
  findOneAndUpdate: jest.fn(() => Promise.resolve({ seq: 7 }))
}));
jest.mock('../models/Invoice', () => {
  return jest.fn().mockImplementation(function Invoice(doc) {
    Object.assign(this, doc);
    this.save = jest.fn(() => Promise.resolve(this));
  });
});

const Counter = require('../models/Counter');
const { createInvoiceForPayment, round2 } = require('../services/billingService');

describe('createInvoiceForPayment', () => {
  const admin = {
    _id: 'admin1', name: 'Priya', email: 'p@example.com', phone: '9876543210', businessName: 'Priya Fashions',
    billingDetails: { legalName: 'Priya Fashions Pvt Ltd', gstin: '27AAACP1234Q1Z5', state: 'Maharashtra', city: 'Mumbai' },
    subscriptionStartDate: new Date('2026-11-20'), subscriptionEndDate: new Date('2026-12-20')
  };
  const plan = { name: 'growth', displayName: 'Growth' };

  test('uses the amount actually charged, records the coupon discount and splits IGST', async () => {
    const inv = await createInvoiceForPayment({
      admin, plan, cycle: 'monthly', listPrice: 2999,
      order: { id: 'order_1', amount: 239920, currency: 'INR', notes: { couponCode: 'FESTIVE20' } },
      payment: { id: 'pay_1', amount: 239920, method: 'upi' }
    });

    expect(inv.invoiceNumber).toMatch(/^KB\/\d{2}-\d{2}\/0007$/);
    expect(Counter.findOneAndUpdate).toHaveBeenCalled();
    expect(inv.subtotal).toBe(2999);
    expect(inv.totalAmount).toBe(2399.2);
    expect(inv.discountAmount).toBe(599.8);
    expect(inv.couponCode).toBe('FESTIVE20');
    expect(inv.tax.intra).toBe(false);
    expect(round2(inv.tax.taxable + inv.tax.igst)).toBe(2399.2);
    expect(inv.buyer.name).toBe('Priya Fashions Pvt Ltd');
    expect(inv.buyer.gstin).toBe('27AAACP1234Q1Z5');
    expect(inv.seller.legalName).toBe('Test Co');
    expect(inv.razorpayPaymentId).toBe('pay_1');
    expect(inv.status).toBe('paid');
  });
});
