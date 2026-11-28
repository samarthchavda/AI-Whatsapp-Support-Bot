jest.mock('axios', () => ({ get: jest.fn(), post: jest.fn() }));
jest.mock('../models/Conversation', () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  countDocuments: jest.fn(),
  aggregate: jest.fn()
}));
jest.mock('../services/whatsappCloudAPI', () => ({ sendMessage: jest.fn() }));

const axios = require('axios');
const Conversation = require('../models/Conversation');
const whatsappCloudAPI = require('../services/whatsappCloudAPI');
const {
  sendAdminMessage,
  getMessageMedia,
  getAllConversations,
  getConversationStats,
  syncChatHistory
} = require('../controllers/merchant/conversationController');

const makeResponse = () => {
  const res = { status: jest.fn(), json: jest.fn() };
  res.status.mockReturnValue(res);
  return res;
};

describe('live chat manual replies', () => {
  const admin = { _id: 'merchant-1', whatsappConnected: true, whatsappPhoneNumberId: 'phone-2', whatsappAccessToken: 'merchant-token' };
  const req = { admin, body: { customerPhone: '919876543210', message: 'Hello 😊' }, app: { get: () => null } };
  let conversation;

  beforeEach(() => {
    jest.clearAllMocks();
    conversation = { admin: 'merchant-1', customerPhone: '919876543210', channelPhoneNumberId: 'phone-2', messages: [], botPaused: false, save: jest.fn() };
    Conversation.findOne.mockResolvedValue(conversation);
  });

  test('does not claim a reply was sent or save it when Meta rejects it', async () => {
    whatsappCloudAPI.sendMessage.mockResolvedValue({ success: false, error: 'Meta rejected message' });
    const res = makeResponse();
    await sendAdminMessage(req, res);
    expect(res.status).toHaveBeenCalledWith(502);
    expect(conversation.messages).toHaveLength(0);
    expect(conversation.save).not.toHaveBeenCalled();
  });

  test('saves emoji text after successful delivery from the conversation number', async () => {
    whatsappCloudAPI.sendMessage.mockResolvedValue({ success: true, messageId: 'wamid-1' });
    const res = makeResponse();
    await sendAdminMessage(req, res);
    expect(whatsappCloudAPI.sendMessage).toHaveBeenCalledWith('919876543210', 'Hello 😊', expect.objectContaining({ phoneNumberId: 'phone-2', accessToken: 'merchant-token' }));
    expect(conversation.messages[0]).toMatchObject({ content: 'Hello 😊', messageId: 'wamid-1' });
    expect(conversation.save).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  test('does not serve an attachment from a conversation outside the merchant account', async () => {
    Conversation.findOne.mockResolvedValue(null);
    const res = makeResponse();
    await getMessageMedia({ admin, params: { id: 'someone-elses-chat', messageId: 'message-1' } }, res);
    expect(Conversation.findOne).toHaveBeenCalledWith({ _id: 'someone-elses-chat', admin: 'merchant-1' });
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('excludes contact-only synced records without messages from live chat list and stats', async () => {
    const chain = {
      sort: jest.fn(),
      limit: jest.fn(),
      skip: jest.fn(),
      lean: jest.fn(),
      exec: jest.fn().mockResolvedValue([{ _id: 'chat-1', messages: [{ role: 'user', content: 'Hi' }] }])
    };
    chain.sort.mockReturnValue(chain);
    chain.limit.mockReturnValue(chain);
    chain.skip.mockReturnValue(chain);
    chain.lean.mockReturnValue(chain);
    Conversation.find.mockReturnValue(chain);
    Conversation.countDocuments.mockResolvedValue(1);
    Conversation.aggregate.mockResolvedValue([]);

    const listRes = makeResponse();
    await getAllConversations({ admin, query: { limit: '100' } }, listRes);
    expect(Conversation.find).toHaveBeenCalledWith({
      admin: 'merchant-1',
      'messages.0': { $exists: true }
    });
    expect(Conversation.countDocuments).toHaveBeenCalledWith({
      admin: 'merchant-1',
      'messages.0': { $exists: true }
    });

    const statsRes = makeResponse();
    await getConversationStats({ admin }, statsRes);
    expect(Conversation.countDocuments).toHaveBeenCalledWith({
      admin: 'merchant-1',
      'messages.0': { $exists: true }
    });
  });

  test('starts chat history sync for Business App coexistence numbers and explains Meta sync limits', async () => {
    axios.get.mockResolvedValue({ data: { is_on_biz_app: true } });
    axios.post.mockResolvedValue({ data: { request_id: 'hist-1' } });
    const res = makeResponse();
    await syncChatHistory({
      admin: {
        ...admin,
        whatsappBusinessAccountId: 'waba-1',
        whatsappConnections: [{ phoneNumberId: 'phone-2', businessAccountId: 'waba-1', accessToken: 'merchant-token', isActive: true }]
      },
      body: { phoneNumberId: 'phone-2' }
    }, res);
    expect(res.status).toHaveBeenCalledWith(202);
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/phone-2/smb_app_data'),
      { messaging_product: 'whatsapp', sync_type: 'history' },
      expect.anything()
    );

    axios.post.mockImplementation(async (url) => {
      if (url.includes('/smb_app_data')) {
        const err = new Error('Sync limit');
        err.response = { data: { error: { error_subcode: 2593107, message: 'Synchronization Request Limit Exceeded' } } };
        throw err;
      }
      return { data: { success: true } };
    });
    const limitRes = makeResponse();
    await syncChatHistory({ admin, body: {} }, limitRes);
    expect(limitRes.status).toHaveBeenCalledWith(502);
    expect(limitRes.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      error: expect.stringMatching(/Disconnect and reconnect/i)
    }));
  });
});
