jest.mock('../models/Integration', () => ({ exists: jest.fn() }));

const Integration = require('../models/Integration');
const requireConnectedShopify = require('../middleware/requireConnectedShopify');

const response = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });

describe('Shopify connection guard', () => {
  beforeEach(() => jest.clearAllMocks());

  test('allows only an active Shopify connection belonging to the merchant', async () => {
    Integration.exists.mockResolvedValue({ _id: 'integration-id' });
    const next = jest.fn();
    const res = response();

    await requireConnectedShopify({ admin: { _id: 'merchant-a' } }, res, next);

    expect(Integration.exists).toHaveBeenCalledWith({ adminId: 'merchant-a', platform: 'shopify', isActive: true });
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  test('returns a clear 409 when no Shopify store is connected', async () => {
    Integration.exists.mockResolvedValue(null);
    const next = jest.fn();
    const res = response();

    await requireConnectedShopify({ admin: { _id: 'merchant-a' } }, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'STORE_CONNECTION_REQUIRED' }));
  });

  test('does not treat a database error as a disconnected store', async () => {
    Integration.exists.mockRejectedValue(new Error('database unavailable'));
    const res = response();

    await requireConnectedShopify({ admin: { _id: 'merchant-a' } }, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Store connection could not be checked. Please try again.' }));
  });
});
