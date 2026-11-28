jest.mock('../models/Template', () => ({ find: jest.fn() }));

const Template = require('../models/Template');
const { getTemplateConnections, getTemplates } = require('../controllers/merchant/whatsappController');

const admin = {
  _id: 'merchant-1', role: 'admin', whatsappConnected: true,
  whatsappPhoneNumberId: 'phone-1', whatsappBusinessAccountId: 'waba-1',
  whatsappAccessToken: 'primary-secret', whatsappDisplayPhoneNumber: '+911111111111',
  whatsappConnections: [
    { phoneNumberId: 'phone-1', businessAccountId: 'waba-1', accessToken: 'primary-secret', displayPhoneNumber: '+911111111111' },
    { phoneNumberId: 'phone-2', businessAccountId: 'waba-2', accessToken: 'secondary-secret', displayPhoneNumber: '+912222222222' }
  ]
};

const response = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });

describe('templates by connected WhatsApp number', () => {
  beforeEach(() => jest.clearAllMocks());

  test('lists phone numbers without access tokens', async () => {
    const res = response();
    await getTemplateConnections({ admin }, res);
    expect(res.json.mock.calls[0][0].data).toHaveLength(2);
    expect(JSON.stringify(res.json.mock.calls[0][0])).not.toContain('secret');
  });

  test('scopes secondary-number templates to its WABA', async () => {
    Template.find.mockReturnValue({ sort: jest.fn().mockResolvedValue([]) });
    const res = response();
    await getTemplates({ admin, query: { phoneNumberId: 'phone-2' } }, res);
    expect(Template.find).toHaveBeenCalledWith({ adminId: 'merchant-1', businessAccountId: 'waba-2' });
  });

  test('rejects a phone number outside the merchant account', async () => {
    const res = response();
    await getTemplates({ admin, query: { phoneNumberId: 'another-phone' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(Template.find).not.toHaveBeenCalled();
  });

  test('returns no templates after all WhatsApp numbers are disconnected', async () => {
    const disconnectedAdmin = {
      ...admin,
      whatsappConnected: false,
      whatsappConnections: [],
      whatsappPhoneNumberId: null,
      whatsappAccessToken: null,
      whatsappBusinessAccountId: null
    };
    const res = response();
    await getTemplates({ admin: disconnectedAdmin, query: {} }, res);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: [] });
    expect(Template.find).not.toHaveBeenCalled();
  });
});
