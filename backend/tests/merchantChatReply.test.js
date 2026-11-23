jest.mock('../models/Conversation', () => ({ findOne: jest.fn() }));
jest.mock('../services/whatsappCloudAPI', () => ({ sendMessage: jest.fn() }));

const Conversation = require('../models/Conversation');
const whatsappCloudAPI = require('../services/whatsappCloudAPI');
const { sendAdminMessage, getMessageMedia } = require('../controllers/merchant/conversationController');

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
});
