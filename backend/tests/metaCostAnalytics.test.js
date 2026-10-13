jest.mock('axios', () => ({ get: jest.fn() }));
jest.mock('../models/Admin', () => ({ findById: jest.fn() }));
jest.mock('../models/Conversation', () => ({ aggregate: jest.fn() }));

const axios = require('axios');
const Admin = require('../models/Admin');
const Conversation = require('../models/Conversation');
const whatsappCloudAPI = require('../services/whatsappCloudAPI');
const whatsappController = require('../controllers/merchant/whatsappController');
const { getPoints, summarize } = require('../services/metaCostAnalytics');

describe('Meta WhatsApp cost analytics', () => {
  afterEach(() => jest.restoreAllMocks());
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.META_INR_RATE_CARD_JSON;
    Admin.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({
      _id: 'merchant-a', whatsappConnected: true, whatsappAccessToken: 'merchant-token',
      whatsappBusinessAccountId: '123456', whatsappPhoneNumberId: 'phone-a', currency: 'INR'
    }) });
    Conversation.aggregate.mockResolvedValue([{ count: 2 }]);
  });

  test('reads Meta category and free-tier rows without charging free messages', () => {
    const points = getPoints({ pricing_analytics: { data: [{ data_points: [
      { start: 1791763200, pricing_category: 'MARKETING', pricing_type: 'REGULAR', country: 'IN', phone_number: '111', volume: 10, cost: 8.5 },
      { start: 1791763200, pricing_category: 'SERVICE', pricing_type: 'FREE_CUSTOMER_SERVICE', country: 'IN', phone_number: '111', volume: 5, cost: 0 },
      { start: 1791763200, pricing_category: 'SERVICE', pricing_type: 'REGULAR', country: 'IN', phone_number: '111', volume: 2, cost: 0.23 }
    ] }] } });
    const data = summarize(points, { period: 'this_month', currency: 'INR' });
    expect(data.source).toBe('meta_analytics');
    expect(data.totalEstimatedCost).toBe(8.73);
    expect(data.categories.service).toMatchObject({ totalCount: 7, freeTierUsed: 5, billableCount: 2, cost: 0.23 });
    expect(data.dailyBreakdown).toHaveLength(1);
  });

  test('does not invent cost when Meta omits COST and no verified card is configured', () => {
    const data = summarize([{ start: 1791763200, pricing_category: 'MARKETING', pricing_type: 'REGULAR', country: 'IN', volume: 10 }], { period: 'today', currency: 'INR' });
    expect(data.source).toBe('unavailable');
    expect(data.totalEstimatedCost).toBeNull();
  });

  test('uses an explicitly configured dated INR rate card only as an estimate', () => {
    const rates = { effectiveDate: '2026-10-01', marketing: 0.8, utility: 0.1, authentication: 0.1, service: 0.1 };
    const data = summarize([{ start: 1791763200, pricing_category: 'MARKETING', pricing_type: 'REGULAR', country: 'IN', volume: 10 }], { period: 'today', currency: 'INR', inrRates: rates });
    expect(data).toMatchObject({ source: 'rate_card_estimate', totalEstimatedCost: 8 });
    expect(data.categories.marketing.rate).toBe(0.8);
  });

  test('queries the merchant WABA, reports Meta currency and treats local messages as diagnostic only', async () => {
    axios.get.mockResolvedValue({ data: { currency: 'INR', pricing_analytics: { data: [{ data_points: [
      { start: 1791763200, pricing_category: 'UTILITY', pricing_type: 'REGULAR', country: 'IN', volume: 3, cost: 0.345 }
    ] }] } } });
    const data = await whatsappCloudAPI.getEstimatedCosts('merchant-a', 'this_month');
    expect(axios.get).toHaveBeenCalledTimes(1);
    expect(axios.get.mock.calls[0][0]).toBe('https://graph.facebook.com/v25.0/123456');
    expect(axios.get.mock.calls[0][1].headers.Authorization).toBe('Bearer merchant-token');
    expect(axios.get.mock.calls[0][1].params.fields).toContain('pricing_analytics.start(');
    expect(data).toMatchObject({ currency: 'INR', currencySource: 'meta', source: 'meta_analytics', totalEstimatedCost: 0.35, localDeliveredMessages: 2 });
    expect(Conversation.aggregate.mock.calls[0][0][0].$match.admin).toBe('merchant-a');
  });

  test('does not call Meta for an unconnected merchant', async () => {
    Admin.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ _id: 'merchant-b', whatsappConnected: false }) });
    const data = await whatsappCloudAPI.getEstimatedCosts('merchant-b');
    expect(data.source).toBe('not_connected');
    expect(axios.get).not.toHaveBeenCalled();
  });

  test('rejects a pagination URL outside Meta rather than requesting it', async () => {
    axios.get.mockResolvedValueOnce({ data: { currency: 'INR', pricing_analytics: { data: [], paging: { next: 'https://example.invalid/private' } } } });
    const data = await whatsappCloudAPI.getEstimatedCosts('merchant-a');
    expect(data.source).toBe('unavailable');
    expect(axios.get).toHaveBeenCalledTimes(1);
  });

  test('does not display zero spend when Meta omits the analytics field', async () => {
    axios.get.mockResolvedValueOnce({ data: { currency: 'INR' } });
    const data = await whatsappCloudAPI.getEstimatedCosts('merchant-a');
    expect(data.source).toBe('unavailable');
    expect(data.totalEstimatedCost).toBeNull();
  });

  test('does not relabel Meta cost using the merchant profile currency', async () => {
    axios.get.mockResolvedValueOnce({ data: { pricing_analytics: { data: [{ data_points: [
      { start: 1791763200, pricing_category: 'MARKETING', pricing_type: 'REGULAR', volume: 2, cost: 1.2 }
    ] }] } } });
    const data = await whatsappCloudAPI.getEstimatedCosts('merchant-a');
    expect(data.currency).toBeNull();
    expect(data.totalEstimatedCost).toBeNull();
    expect(data.source).toBe('unavailable');
  });

  test('cost route validates periods and uses the authenticated merchant only', async () => {
    const result = { period: 'today', source: 'meta_analytics', totalEstimatedCost: 2 };
    const service = jest.spyOn(whatsappCloudAPI, 'getEstimatedCosts').mockResolvedValue(result);
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await whatsappController.getCostAnalytics({ query: { period: 'all_time' }, admin: { _id: 'merchant-a' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(service).not.toHaveBeenCalled();
    await whatsappController.getCostAnalytics({ query: { period: 'today' }, admin: { _id: 'merchant-a' } }, res);
    expect(service).toHaveBeenCalledWith('merchant-a', 'today');
    expect(res.json).toHaveBeenLastCalledWith({ success: true, data: result });
  });
});
