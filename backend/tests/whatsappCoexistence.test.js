jest.mock('../services/whatsappService', () => ({}));
jest.mock('../services/whatsappCloudAPI', () => ({
  markAsRead: jest.fn().mockResolvedValue({ success: true }),
  sendMessage: jest.fn().mockResolvedValue({ success: true, messageId: 'wamid.123' })
}));
jest.mock('../services/aiService', () => ({
  processMessage: jest.fn().mockResolvedValue({ message: 'AI response' })
}));
jest.mock('../services/webhookRelayService', () => ({
  relayIncomingMessage: jest.fn().mockResolvedValue({})
}));

const mockAdminFindOne = jest.fn();
const mockAdminFind = jest.fn();
const mockAdminFindById = jest.fn();

jest.mock('../models/Admin', () => ({
  findOne: (...args) => mockAdminFindOne(...args),
  find: (...args) => mockAdminFind(...args),
  findById: (...args) => mockAdminFindById(...args)
}));

const mockConversationFindOne = jest.fn();
const mockConversationCreate = jest.fn();

function MockConversation(doc) {
  Object.assign(this, doc);
  this.save = jest.fn().mockResolvedValue(this);
}
MockConversation.findOne = (...args) => mockConversationFindOne(...args);
MockConversation.create = (...args) => mockConversationCreate(...args);

jest.mock('../models/Conversation', () => MockConversation);

const { handleWebhook } = require('../controllers/public/webhookController');

const makeResponse = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis()
  };
  return res;
};

describe('WhatsApp Coexistence Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.io = {
      emit: jest.fn()
    };
  });

  test('1. Handles account_update webhook for PARTNER_REMOVED and disconnects admin', async () => {
    const mockAdmin = {
      _id: 'admin_123',
      whatsappBusinessAccountId: '102290129340398',
      whatsappConnected: true,
      whatsappStatus: 'connected',
      save: jest.fn().mockResolvedValue(true)
    };
    mockAdminFindOne.mockResolvedValue(mockAdmin);

    const req = {
      method: 'POST',
      body: {
        object: 'whatsapp_business_account',
        entry: [{
          id: '2949482758682047',
          time: 1739212624,
          changes: [{
            value: {
              event: 'PARTNER_REMOVED',
              waba_info: {
                waba_id: '102290129340398',
                owner_business_id: '2329417887457253'
              },
              disconnection_info: {
                reason: 'PRIMARY_INACTIVITY',
                initiated_by: 'SYSTEM'
              }
            },
            field: 'account_update'
          }]
        }]
      }
    };
    const res = makeResponse();

    await handleWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, event: 'PARTNER_REMOVED' }));
    expect(mockAdmin.whatsappConnected).toBe(false);
    expect(mockAdmin.whatsappStatus).toBe('disconnected');
    expect(mockAdmin.save).toHaveBeenCalled();
  });

  test('offboarding a secondary WABA keeps the primary number connected', async () => {
    const mockAdmin = {
      _id: 'admin_123',
      whatsappBusinessAccountId: 'waba-primary',
      whatsappPhoneNumberId: 'phone-primary',
      whatsappConnected: true,
      whatsappConnections: [
        { phoneNumberId: 'phone-primary', businessAccountId: 'waba-primary', isActive: true },
        { phoneNumberId: 'phone-secondary', businessAccountId: 'waba-secondary', isActive: true }
      ],
      save: jest.fn().mockResolvedValue(true)
    };
    mockAdminFindOne.mockResolvedValue(mockAdmin);
    const res = makeResponse();

    await handleWebhook({ method: 'POST', body: { object: 'whatsapp_business_account', entry: [{
      id: 'waba-secondary', changes: [{ field: 'account_update', value: { event: 'PARTNER_REMOVED', waba_info: { waba_id: 'waba-secondary' } } }]
    }] } }, res);

    expect(mockAdmin.whatsappConnected).toBe(true);
    expect(mockAdmin.whatsappPhoneNumberId).toBe('phone-primary');
    expect(mockAdmin.whatsappConnections[1].isActive).toBe(false);
    expect(global.io.emit).toHaveBeenCalledWith('whatsapp_status_updated', { adminId: 'admin_123', connected: true });
  });

  test('offboarding the primary WABA promotes another active number', async () => {
    const mockAdmin = {
      _id: 'admin_123',
      whatsappBusinessAccountId: 'waba-primary',
      whatsappPhoneNumberId: 'phone-primary',
      whatsappConnected: true,
      whatsappConnections: [
        { phoneNumberId: 'phone-primary', businessAccountId: 'waba-primary', isActive: true },
        { phoneNumberId: 'phone-secondary', businessAccountId: 'waba-secondary', accessToken: 'second-token', isActive: true }
      ],
      save: jest.fn().mockResolvedValue(true)
    };
    mockAdminFindOne.mockResolvedValue(mockAdmin);
    const res = makeResponse();

    await handleWebhook({ method: 'POST', body: { object: 'whatsapp_business_account', entry: [{
      id: 'waba-primary', changes: [{ field: 'account_update', value: { event: 'PARTNER_REMOVED', waba_info: { waba_id: 'waba-primary' } } }]
    }] } }, res);

    expect(mockAdmin.whatsappConnected).toBe(true);
    expect(mockAdmin.whatsappPhoneNumberId).toBe('phone-secondary');
    expect(mockAdmin.whatsappAccessToken).toBe('second-token');
    expect(mockAdmin.whatsappConnections[0].isActive).toBe(false);
  });

  test('2. Handles smb_message_echoes webhook from mobile WhatsApp Business app and pauses bot', async () => {
    const mockAdmin = {
      _id: 'admin_123',
      whatsappPhoneNumberId: '106540352242922',
      whatsappConnected: true
    };
    mockAdminFind.mockResolvedValue([mockAdmin]);
    mockAdminFindOne.mockResolvedValue(mockAdmin);

    const mockConv = new MockConversation({
      admin: 'admin_123',
      customerPhone: '16505551234',
      messages: [],
      botPaused: false
    });
    mockConversationFindOne.mockResolvedValue(mockConv);

    const req = {
      method: 'POST',
      body: {
        object: 'whatsapp_business_account',
        entry: [{
          id: '102290129340398',
          changes: [{
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '15550783881',
                phone_number_id: '106540352242922'
              },
              message_echoes: [{
                from: '15550783881',
                to: '16505551234',
                id: 'wamid.HBgLMTY0NjcwNDM1OTUVAgARGBIyNDlBOEI5QUQ4NDc0N0FCNjMA',
                timestamp: '1700255121',
                type: 'text',
                text: {
                  body: "Hello from merchant's WhatsApp Business mobile phone!"
                }
              }]
            },
            field: 'smb_message_echoes'
          }]
        }]
      }
    };
    const res = makeResponse();

    await handleWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, count: 1 }));
    expect(mockConv.messages.length).toBe(1);
    expect(mockConv.messages[0].content).toBe("Hello from merchant's WhatsApp Business mobile phone!");
    expect(mockConv.botPaused).toBe(true);
    expect(mockConv.save).toHaveBeenCalled();
    expect(global.io.emit).toHaveBeenCalledWith('new_message', expect.anything());
  });

  test('3. Handles smb_app_state_sync webhook to sync contacts from phone', async () => {
    const mockAdmin = {
      _id: 'admin_123',
      whatsappPhoneNumberId: '106540352242922',
      whatsappConnected: true,
      subscriptionPlan: 'growth',
      subscriptionStatus: 'active'
    };
    mockAdminFind.mockResolvedValue([mockAdmin]);
    mockAdminFindOne.mockResolvedValue(mockAdmin);
    mockConversationFindOne.mockResolvedValue(null);
    mockConversationCreate.mockResolvedValue({});

    const req = {
      method: 'POST',
      body: {
        object: 'whatsapp_business_account',
        entry: [{
          id: '102290129340398',
          changes: [{
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '15550783881',
                phone_number_id: '106540352242922'
              },
              state_sync: [{
                type: 'contact',
                contact: {
                  full_name: 'Pablo Morales',
                  first_name: 'Pablo',
                  phone_number: '16505559876'
                },
                action: 'add',
                metadata: {
                  timestamp: '1738346006'
                }
              }]
            },
            field: 'smb_app_state_sync'
          }]
        }]
      }
    };
    const res = makeResponse();

    await handleWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockConversationCreate).toHaveBeenCalledWith(expect.objectContaining({
      admin: 'admin_123',
      customerPhone: '16505559876',
      customerName: 'Pablo Morales',
      syncedFromWhatsAppApp: true
    }));
  });

  test('does not import Business App contacts for Starter merchants', async () => {
    const mockAdmin = {
      _id: 'admin_starter',
      whatsappPhoneNumberId: '106540352242922',
      whatsappConnected: true,
      subscriptionPlan: 'starter',
      subscriptionStatus: 'active'
    };
    mockAdminFind.mockResolvedValue([mockAdmin]);
    const res = makeResponse();
    await handleWebhook({ method: 'POST', body: { object: 'whatsapp_business_account', entry: [{
      id: 'waba-1', changes: [{ field: 'smb_app_state_sync', value: {
        metadata: { phone_number_id: '106540352242922' },
        state_sync: [{ type: 'contact', action: 'add', contact: { phone_number: '16505559876', full_name: 'Pablo Morales' } }]
      } }]
    }] } }, res);
    expect(res.json).toHaveBeenCalledWith({ success: true, count: 0 });
    expect(mockConversationCreate).not.toHaveBeenCalled();
  });

  test('4. Handles message edit event and updates existing conversation message', async () => {
    const mockAdmin = {
      _id: 'admin_123',
      whatsappPhoneNumberId: '106540352242922',
      whatsappConnected: true,
      role: 'merchant'
    };
    mockAdminFind.mockResolvedValue([mockAdmin]);

    const mockConv = new MockConversation({
      admin: 'admin_123',
      customerPhone: '16505551234',
      messages: [{
        messageId: 'wamid.ORIGINAL_123',
        content: 'Original message text'
      }]
    });
    mockConversationFindOne.mockResolvedValue(mockConv);

    const req = {
      method: 'POST',
      body: {
        object: 'whatsapp_business_account',
        entry: [{
          id: '102290129340398',
          changes: [{
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '15550783881',
                phone_number_id: '106540352242922'
              },
              messages: [{
                from: '16505551234',
                id: 'wamid.EDIT_EVENT_999',
                timestamp: '1749854575',
                type: 'edit',
                edit: {
                  original_message_id: 'wamid.ORIGINAL_123',
                  message: {
                    type: 'text',
                    text: {
                      body: 'Updated text after edit'
                    }
                  }
                }
              }]
            },
            field: 'messages'
          }]
        }]
      }
    };
    const res = makeResponse();

    await handleWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockConv.messages[0].content).toBe('Updated text after edit (edited)');
    expect(mockConv.save).toHaveBeenCalled();
  });

  test('5. Handles history sync webhook and populates past messages', async () => {
    const mockAdmin = {
      _id: 'admin_123',
      whatsappPhoneNumberId: '106540352242922',
      whatsappConnected: true,
      role: 'merchant'
    };
    mockAdminFind.mockResolvedValue([mockAdmin]);

    const mockConv = new MockConversation({
      admin: 'admin_123',
      customerPhone: '16505551234',
      messages: []
    });
    mockConversationFindOne.mockResolvedValue(mockConv);

    const req = {
      method: 'POST',
      body: {
        object: 'whatsapp_business_account',
        entry: [{
          id: '102290129340398',
          changes: [{
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '15550783881',
                phone_number_id: '106540352242922'
              },
              history: [{
                metadata: {
                  phase: 0,
                  chunk_order: 1,
                  progress: 55
                },
                threads: [{
                  id: '16505551234',
                  messages: [{
                    from: '16505551234',
                    id: 'wamid.HIST_1',
                    timestamp: '1739230955',
                    type: 'text',
                    text: {
                      body: 'Historical message from customer'
                    }
                  }]
                }]
              }]
            },
            field: 'history'
          }]
        }]
      }
    };
    const res = makeResponse();

    await handleWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockConv.messages.length).toBe(1);
    expect(mockConv.messages[0].content).toBe('Historical message from customer');
    expect(mockConv.messages[0].role).toBe('user');
    expect(mockConv.save).toHaveBeenCalled();
  });

  test('6. Handles Meta peer_recipient_id, message_echoes, from_me, and uppercase/played history statuses', async () => {
    const mockAdmin = {
      _id: 'admin_123',
      whatsappPhoneNumberId: '106540352242922',
      whatsappConnected: true,
      role: 'merchant'
    };
    mockAdminFind.mockResolvedValue([mockAdmin]);

    const mockConv = new MockConversation({
      admin: 'admin_123',
      customerPhone: '919876543210',
      customerName: 'Riya Shah',
      syncedFromWhatsAppApp: true,
      messages: []
    });
    mockConversationFindOne.mockResolvedValue(mockConv);

    const req = {
      method: 'POST',
      body: {
        object: 'whatsapp_business_account',
        entry: [{
          id: '102290129340398',
          changes: [{
            field: 'history',
            value: {
              messaging_product: 'whatsapp',
              metadata: { phone_number_id: '106540352242922' },
              history: [{
                metadata: { phase: 1, chunk_order: 1, progress: 50 },
                threads: [{
                  peer_recipient_id: '919876543210',
                  messages: [
                    {
                      id: 'wamid.H_IN_1',
                      from: '919876543210',
                      timestamp: '1739230900',
                      type: 'audio',
                      audio: { id: 'media-1', mime_type: 'audio/ogg' },
                      history_context: { from_me: false, status: 'PLAYED' }
                    },
                    {
                      id: 'wamid.H_OUT_FROM_ME',
                      from: '919876543210',
                      timestamp: '1739230920',
                      type: 'text',
                      text: { body: 'Outbound via from_me' },
                      history_context: { from_me: true, status: 'READ' }
                    }
                  ],
                  message_echoes: [
                    {
                      id: 'wamid.H_ECHO_1',
                      from: '106540352242922',
                      timestamp: '1739230940',
                      type: 'text',
                      text: { body: 'Echo reply from app' },
                      history_context: { status: 'DELIVERED' }
                    }
                  ]
                }]
              }]
            }
          }]
        }]
      }
    };
    const res = makeResponse();

    await handleWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockConv.channelPhoneNumberId).toBe('106540352242922');
    expect(mockConv.messages).toHaveLength(3);
    expect(mockConv.messages[0]).toMatchObject({ role: 'user', status: 'read', messageId: 'wamid.H_IN_1' });
    expect(mockConv.messages[1]).toMatchObject({ role: 'assistant', status: 'read', content: 'Outbound via from_me' });
    expect(mockConv.messages[2]).toMatchObject({ role: 'assistant', status: 'delivered', content: 'Echo reply from app' });
    expect(mockConv.save).toHaveBeenCalled();
  });
});
