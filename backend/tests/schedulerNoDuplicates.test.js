jest.mock('node-cron', () => ({ schedule: jest.fn(() => ({ stop: jest.fn() })) }));

const mockBroadcast = {
  findOneAndUpdate: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  find: jest.fn(() => Promise.resolve([]))
};
jest.mock('../models/Broadcast', () => mockBroadcast);
jest.mock('../models/Admin', () => ({ findById: jest.fn(() => Promise.resolve(null)), findByIdAndUpdate: jest.fn(() => ({ catch: () => {} })) }));

const mockCart = { find: jest.fn(), findOneAndUpdate: jest.fn(), updateOne: jest.fn(() => Promise.resolve()) };
jest.mock('../models/AbandonedCart', () => mockCart);
const mockIntegration = { exists: jest.fn() };
jest.mock('../models/Integration', () => mockIntegration);
const mockSendCart = jest.fn(() => Promise.resolve({ success: true }));
jest.mock('../services/webhookService', () => ({ sendCartRecoveryMessage: (...a) => mockSendCart(...a) }));

const cron = require('node-cron');

describe('scheduled jobs never run twice', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIntegration.exists.mockResolvedValue(true);
  });

  test('loading the scheduler does not start cron tasks; startScheduler does', () => {
    const scheduler = require('../services/broadcastScheduler');
    expect(cron.schedule).not.toHaveBeenCalled();
    scheduler.startScheduler();
    expect(cron.schedule).toHaveBeenCalledTimes(2);
    scheduler.startScheduler(); // idempotent
    expect(cron.schedule).toHaveBeenCalledTimes(2);
    scheduler.stopScheduler();
  });

  test('a broadcast that another trigger already claimed is skipped, not resent', async () => {
    const { addBroadcastToQueue } = require('../services/broadcastQueue');
    mockBroadcast.findOneAndUpdate.mockResolvedValue(null);
    mockBroadcast.findById.mockReturnValue({ select: () => ({ lean: () => Promise.resolve({ status: 'sending' }) }) });

    const result = await addBroadcastToQueue('b1');
    expect(result).toEqual({ skipped: true, status: 'sending' });
    expect(mockBroadcast.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'b1', status: { $in: ['draft', 'scheduled'] } },
      expect.objectContaining({ $set: expect.objectContaining({ status: 'sending' }) }),
      { new: true }
    );
  });

  test('an abandoned-cart reminder is sent once even if two runs see the same cart', async () => {
    const scheduler = require('../services/broadcastScheduler');
    const cart = { _id: 'c1', cartId: 'cart-1', status: 'abandoned' };
    mockCart.find.mockResolvedValue([cart]);
    // first run wins the claim, second run finds it already claimed
    mockCart.findOneAndUpdate
      .mockResolvedValueOnce({ ...cart, status: 'reminder_sent' })
      .mockResolvedValueOnce(null);

    await Promise.all([scheduler.checkAbandonedCarts(), scheduler.checkAbandonedCarts()]);
    expect(mockSendCart).toHaveBeenCalledTimes(1);
  });

  test('a failed reminder releases the claim so it can be retried', async () => {
    const scheduler = require('../services/broadcastScheduler');
    mockCart.find.mockResolvedValue([{ _id: 'c2', cartId: 'cart-2', status: 'abandoned' }]);
    mockCart.findOneAndUpdate.mockResolvedValueOnce({ _id: 'c2', cartId: 'cart-2', status: 'reminder_sent' });
    mockSendCart.mockResolvedValueOnce({ success: false, error: 'template missing' });

    await scheduler.checkAbandonedCarts();
    expect(mockCart.updateOne).toHaveBeenCalledWith(
      { _id: 'c2', status: 'reminder_sent' },
      expect.objectContaining({ $set: { status: 'abandoned' } })
    );
  });

  test('does not send reminders after the Shopify store disconnects', async () => {
    const scheduler = require('../services/broadcastScheduler');
    mockIntegration.exists.mockResolvedValue(false);
    mockCart.find.mockResolvedValue([{ _id: 'c3', admin: 'merchant-a', cartId: 'cart-3', status: 'abandoned' }]);

    await scheduler.checkAbandonedCarts();

    expect(mockIntegration.exists).toHaveBeenCalledWith({ adminId: 'merchant-a', platform: 'shopify', isActive: true });
    expect(mockCart.findOneAndUpdate).not.toHaveBeenCalled();
    expect(mockSendCart).not.toHaveBeenCalled();
  });
});
