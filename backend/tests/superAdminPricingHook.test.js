const hook = require('../services/superAdminPricingHook');

describe('super admin pricing hook', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
    delete process.env.SUPER_ADMIN_API_URL;
    delete process.env.SUPER_ADMIN_API_KEY;
  });

  test('does nothing when not set up, so checkout keeps its own pricing', async () => {
    global.fetch = jest.fn();
    expect(await hook.getQuote({ planId: 'p1', billingCycle: 'monthly' })).toBeNull();
    expect(await hook.checkCode({ code: 'X' })).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('returns the quote from the service with the internal key', async () => {
    process.env.SUPER_ADMIN_API_URL = 'http://127.0.0.1:5003/sa-api/v1/';
    process.env.SUPER_ADMIN_API_KEY = 'k';
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true, data: { total: 799 } }) }));
    expect(await hook.getQuote({ planId: 'p1', billingCycle: 'monthly', couponCode: 'SAVE', adminId: 'a1' })).toEqual({ total: 799 });
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe('http://127.0.0.1:5003/sa-api/v1/internal/quote');
    expect(options.headers['X-Internal-Key']).toBe('k');
    expect(JSON.parse(options.body)).toEqual({ planId: 'p1', billingCycle: 'monthly', couponCode: 'SAVE', adminId: 'a1' });
  });

  test('falls back (null) when the service fails or is down', async () => {
    process.env.SUPER_ADMIN_API_URL = 'http://127.0.0.1:5003/sa-api/v1';
    process.env.SUPER_ADMIN_API_KEY = 'k';
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    global.fetch = jest.fn(() => Promise.resolve({ ok: false, status: 500 }));
    expect(await hook.getQuote({ planId: 'p1' })).toBeNull();
    global.fetch = jest.fn(() => Promise.reject(new Error('ECONNREFUSED')));
    expect(await hook.checkCode({ code: 'X' })).toBeNull();
    console.warn.mockRestore();
  });
});
