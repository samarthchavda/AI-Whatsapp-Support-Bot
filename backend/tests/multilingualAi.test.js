const translationService = require('../services/translationService');
const aiService = require('../services/aiService');
const Admin = require('../models/Admin');
const Conversation = require('../models/Conversation');
const GlobalSettings = require('../models/GlobalSettings');

jest.mock('../models/Admin');
jest.mock('../models/Conversation');
jest.mock('../models/GlobalSettings');
jest.mock('../models/AILog', () => jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue(true) })));
jest.mock('../models/MerchantProductLead', () => ({ findOneAndUpdate: jest.fn().mockResolvedValue(true) }));

describe('Multilingual AI Bot & Mid-Conversation Language Switching', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    aiService.responseCache.clear();
  });

  test('detects explicit language switch commands cleanly', () => {
    expect(translationService.extractExplicitLanguageSwitch('please talk in english')).toEqual({
      requestedLanguage: 'English',
      isSwitchOnly: true
    });
    expect(translationService.extractExplicitLanguageSwitch('marathi madhe bola please')).toEqual({
      requestedLanguage: 'Marathi',
      isSwitchOnly: true
    });
    expect(translationService.extractExplicitLanguageSwitch('please talk in english and track my order #1024')).toEqual({
      requestedLanguage: 'English',
      isSwitchOnly: false
    });
  });

  test('preserves active language on neutral inputs like order IDs or ok', async () => {
    const resOrder = await translationService.detectAndTranslate('#1024', 'Gujarati');
    expect(resOrder.detectedLanguage).toBe('Gujarati');
    expect(resOrder.isLanguageNeutral).toBe(true);

    const resOk = await translationService.detectAndTranslate('ok', 'Marathi');
    expect(resOk.detectedLanguage).toBe('Marathi');
    expect(resOk.isLanguageNeutral).toBe(true);
  });

  test('switches sticky preferredLanguage from Gujarati to English and answers in requested language', async () => {
    GlobalSettings.findOne.mockResolvedValue(null);
    Admin.findOne.mockResolvedValue({
      _id: 'admin_1',
      email: 'merchant@store.com',
      whatsappConnected: true,
      subscriptionStatus: 'active',
      subscriptionPlan: 'growth',
      isActive: true,
      save: jest.fn().mockResolvedValue(true)
    });

    const mockConvo = {
      _id: 'convo_lang',
      admin: 'admin_1',
      customerPhone: '919999999999',
      customerName: 'Aarav',
      preferredLanguage: 'English',
      messages: [],
      status: 'active',
      escalated: false,
      botPaused: false,
      save: jest.fn().mockResolvedValue(true)
    };
    Conversation.findOne.mockResolvedValue(mockConvo);

    aiService.validateInput = jest.fn().mockReturnValue({ valid: true });
    aiService.checkCustomerRateLimit = jest.fn().mockReturnValue({ allowed: true });

    const detectSpy = jest.spyOn(translationService, 'detectAndTranslate');
    const translateSpy = jest.spyOn(translationService, 'translateText').mockImplementation(async (txt, lang) => `[${lang}] ${txt}`);
    const inquirySpy = jest.spyOn(aiService, 'handleGeneralInquiry').mockImplementation(async (msg, name, recent, adminId, kb, opts) => ({
      message: `(${opts.targetLanguage}) Store reply`,
      usedAI: true,
      tokenUsage: { totalTokens: 5 }
    }));

    // 1. Customer writes in Gujarati (general inquiry routed to Gemini in Gujarati)
    detectSpy.mockResolvedValueOnce({
      detectedLanguage: 'Gujarati',
      requestedLanguage: null,
      isSwitchOnly: false,
      isLanguageNeutral: false,
      isForeign: true,
      translation: 'Are your support agents open on Sundays?'
    });
    const gujReply = await aiService.processMessage({
      customerPhone: '919999999999',
      customerName: 'Aarav',
      message: 'તમારી બ્રાન્ડ અને વોરંટી વિશે માહિતી આપો',
      messageId: 'm1',
      adminId: 'admin_1'
    });
    expect(mockConvo.preferredLanguage).toBe('Gujarati');
    expect(gujReply.message).toContain('(Gujarati)');

    // 2. Customer writes in Marathi
    detectSpy.mockResolvedValueOnce({
      detectedLanguage: 'Marathi',
      requestedLanguage: null,
      isSwitchOnly: false,
      isLanguageNeutral: false,
      isForeign: true,
      translation: 'Do you pack gift boxes safely?'
    });
    const marReply = await aiService.processMessage({
      customerPhone: '919999999999',
      customerName: 'Aarav',
      message: 'पुण्यात कॅश ऑन डिलिव्हरी उपलब्ध आहे का?',
      messageId: 'm2',
      adminId: 'admin_1'
    });
    expect(mockConvo.preferredLanguage).toBe('Marathi');
    expect(marReply.message).toContain('(Marathi)');

    // 3. Customer explicitly asks to switch to English
    const switchReply = await aiService.processMessage({
      customerPhone: '919999999999',
      customerName: 'Aarav',
      message: 'please talk in english',
      messageId: 'm3',
      adminId: 'admin_1'
    });
    expect(mockConvo.preferredLanguage).toBe('English');
    expect(switchReply.message).toContain('continue in English');

    // 4. Neutral follow-up keeps English (not stale Marathi)
    const neutralReply = await aiService.processMessage({
      customerPhone: '919999999999',
      customerName: 'Aarav',
      message: 'yes',
      messageId: 'm4',
      adminId: 'admin_1'
    });
    expect(neutralReply.message).toContain('(English)');

    // 5. Non-AI order tracking reply in Gujarati translates via translateText (no longer skipped)
    detectSpy.mockResolvedValueOnce({
      detectedLanguage: 'Gujarati',
      requestedLanguage: null,
      isSwitchOnly: false,
      isLanguageNeutral: false,
      isForeign: true,
      translation: 'Where is my order #1024?'
    });
    jest.spyOn(aiService, 'handleOrderStatusQuery').mockResolvedValueOnce({
      message: 'Order #1024 is shipped.',
      orderIds: ['#1024']
    });
    translateSpy.mockResolvedValueOnce('ઓર્ડર #1024 શિપ થઈ ગયો છે.');

    const orderGujReply = await aiService.processMessage({
      customerPhone: '919999999999',
      customerName: 'Aarav',
      message: 'મારો ઓર્ડર #1024 ક્યાં છે?',
      messageId: 'm5',
      adminId: 'admin_1'
    });
    expect(translateSpy).toHaveBeenCalledWith('Order #1024 is shipped.', 'Gujarati');
    expect(orderGujReply.message).toContain('ઓર્ડર #1024 શિપ થઈ ગયો છે.');

    inquirySpy.mockRestore();
  });

  test('buildSystemInstruction includes explicit targetLanguage directive', () => {
    const prompt = aiService.buildSystemInstruction('Riya', { businessName: 'Demo Store' }, 'Marathi');
    expect(prompt).toContain('write your ENTIRE reply in Marathi');
    expect(prompt).toContain('continue replying in Marathi');
  });
});
