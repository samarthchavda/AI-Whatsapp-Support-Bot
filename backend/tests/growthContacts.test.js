jest.mock('../models/Conversation', () => ({ find: jest.fn(), countDocuments: jest.fn() }));
jest.mock('axios', () => ({ get: jest.fn(), post: jest.fn() }));

const axios = require('axios');
const Conversation = require('../models/Conversation');
const { canUseGrowthContactSync } = require('../services/growthContactSync');
const { listContacts, syncBusinessAppContacts } = require('../controllers/merchant/contactController');

const response = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });
const growth = { _id: 'merchant-1', subscriptionPlan: 'growth', subscriptionStatus: 'active', isActive: true };

beforeEach(() => jest.clearAllMocks());

test('only an active Growth subscription can use automatic contacts', () => {
  expect(canUseGrowthContactSync(growth)).toBe(true);
  expect(canUseGrowthContactSync({ ...growth, subscriptionPlan: 'starter' })).toBe(false);
  expect(canUseGrowthContactSync({ ...growth, subscriptionPlan: 'scale' })).toBe(false);
  expect(canUseGrowthContactSync({ ...growth, subscriptionStatus: 'trial' })).toBe(false);
  expect(canUseGrowthContactSync({ ...growth, subscriptionEndDate: new Date('2020-01-01') })).toBe(false);
});

test('contacts API denies other plans before reading customer data', async () => {
  const res = response();
  await listContacts({ admin: { ...growth, subscriptionPlan: 'starter' }, query: {} }, res);
  expect(res.status).toHaveBeenCalledWith(403);
  expect(Conversation.find).not.toHaveBeenCalled();
});

test('contacts API scopes the list to the Growth merchant and paginates', async () => {
  const chain = { select: jest.fn(), sort: jest.fn(), skip: jest.fn(), limit: jest.fn(), lean: jest.fn() };
  chain.select.mockReturnValue(chain);
  chain.sort.mockReturnValue(chain);
  chain.skip.mockReturnValue(chain);
  chain.limit.mockReturnValue(chain);
  chain.lean.mockResolvedValue([{ customerPhone: '919999999999', customerName: 'Customer' }]);
  Conversation.find.mockReturnValue(chain);
  Conversation.countDocuments.mockResolvedValue(1);
  const res = response();

  await listContacts({ admin: growth, query: { search: '99', page: '1' } }, res);

  expect(Conversation.find).toHaveBeenCalledWith(expect.objectContaining({ admin: 'merchant-1', isSuperAdminChat: { $ne: true } }));
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, total: 1, page: 1, totalPages: 1 }));
});

test('only Growth can request sync and only connected Business App numbers are synced', async () => {
  const starterResponse = response();
  await syncBusinessAppContacts({ admin: { ...growth, subscriptionPlan: 'starter' } }, starterResponse);
  expect(starterResponse.status).toHaveBeenCalledWith(403);
  expect(axios.get).not.toHaveBeenCalled();

  axios.get.mockImplementation(async (url) => ({ data: { is_on_biz_app: url.includes('/phone-1') } }));
  axios.post.mockResolvedValue({ data: { request_id: 'sync-1' } });
  const growthResponse = response();
  await syncBusinessAppContacts({ admin: {
    ...growth,
    whatsappConnected: true,
    whatsappPhoneNumberId: 'phone-1',
    whatsappAccessToken: 'secret-1',
    whatsappConnections: [
      { phoneNumberId: 'phone-1', accessToken: 'secret-1', isActive: true },
      { phoneNumberId: 'phone-2', accessToken: 'secret-2', isActive: true },
      { phoneNumberId: 'phone-3', accessToken: 'secret-3', isActive: false }
    ]
  } }, growthResponse);
  expect(growthResponse.status).toHaveBeenCalledWith(202);
  expect(growthResponse.json).toHaveBeenCalledWith(expect.objectContaining({ started: 1, incompatible: 1, failed: 0 }));
  expect(axios.post).toHaveBeenCalledTimes(1);
  expect(axios.post).toHaveBeenCalledWith(expect.stringContaining('/phone-1/smb_app_data'),
    { messaging_product: 'whatsapp', sync_type: 'smb_app_state_sync' }, expect.anything());
});
