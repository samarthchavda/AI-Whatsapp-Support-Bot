jest.mock('../services/whatsappService', () => ({}));
jest.mock('../services/whatsappCloudAPI', () => ({}));
jest.mock('../services/aiService', () => ({}));
jest.mock('../models/Conversation', () => ({}));
jest.mock('../services/webhookRelayService', () => ({}));
jest.mock('../models/Admin', () => ({ findById: jest.fn() }));

const Admin = require('../models/Admin');
const { disconnectWhatsApp } = require('../controllers/public/webhookController');

const makeResponse = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });

describe('WhatsApp disconnect', () => {
  beforeEach(() => jest.clearAllMocks());

  test('removes a stale embedded-signup token even after the primary connection was cleared', async () => {
    const admin = {
      whatsappConnected: false,
      whatsappPhoneNumberId: null,
      whatsappConnections: [{ phoneNumberId: 'phone-a', accessToken: 'secret', isActive: true }],
      save: jest.fn().mockResolvedValue(undefined)
    };
    Admin.findById.mockResolvedValue(admin);
    const res = makeResponse();

    await disconnectWhatsApp({ admin: { _id: 'merchant-a' }, body: {} }, res);

    expect(admin.whatsappConnections).toEqual([]);
    expect(admin.whatsappAccessToken).toBeNull();
    expect(admin.whatsappPhoneNumberId).toBeNull();
    expect(admin.whatsappConnected).toBe(false);
    expect(admin.save).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  test('disconnects only the selected phone and promotes another active connection', async () => {
    const admin = {
      whatsappConnected: true,
      whatsappPhoneNumberId: 'phone-a',
      whatsappConnections: [
        { phoneNumberId: 'phone-a', accessToken: 'old-secret', isActive: true },
        { phoneNumberId: 'phone-b', accessToken: 'next-secret', businessAccountId: 'waba-b', displayPhoneNumber: '+91 222', businessName: 'Next', isActive: true }
      ],
      save: jest.fn().mockResolvedValue(undefined)
    };
    Admin.findById.mockResolvedValue(admin);
    const res = makeResponse();

    await disconnectWhatsApp({ admin: { _id: 'merchant-a' }, body: { phoneNumberId: 'phone-a' } }, res);

    expect(admin.whatsappConnections.map(connection => connection.phoneNumberId)).toEqual(['phone-b']);
    expect(admin.whatsappPhoneNumberId).toBe('phone-b');
    expect(admin.whatsappAccessToken).toBe('next-secret');
    expect(admin.whatsappConnected).toBe(true);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  test('refuses to guess which of multiple connections to delete', async () => {
    const admin = {
      whatsappPhoneNumberId: null,
      whatsappConnections: [{ phoneNumberId: 'phone-a' }, { phoneNumberId: 'phone-b' }],
      save: jest.fn()
    };
    Admin.findById.mockResolvedValue(admin);
    const res = makeResponse();

    await disconnectWhatsApp({ admin: { _id: 'merchant-a' }, body: {} }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(admin.save).not.toHaveBeenCalled();
  });
});
