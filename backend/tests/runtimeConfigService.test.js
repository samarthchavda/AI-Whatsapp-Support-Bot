const mongoose = require('mongoose');
const GlobalSettings = require('../models/GlobalSettings');
const runtimeConfig = require('../services/runtimeConfigService');

describe('runtimeConfigService — DB override with .env fallback & encryption', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env = { ...ORIGINAL_ENV };
    runtimeConfig.__resetForTests();
    mongoose.connection.readyState = 1;
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  test('falls back to process.env when DB has no override', async () => {
    process.env.GEMINI_API_KEY = 'env-gemini-live-key';
    process.env.SMTP_HOST = 'smtp.hostinger.com';
    GlobalSettings.find = jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue([])
    });

    const geminiKey = await runtimeConfig.get('gemini_api_key');
    const smtpHost = await runtimeConfig.get('smtp_host');

    expect(geminiKey).toBe('env-gemini-live-key');
    expect(smtpHost).toBe('smtp.hostinger.com');
  });

  test('decrypts encrypted secret from GlobalSettings and prefers DB over .env', async () => {
    process.env.GEMINI_API_KEY = 'env-old-key';
    process.env.CREDENTIALS_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef';

    const encryptedDbValue = runtimeConfig.encodeValueForStorage('gemini_api_key', 'db-new-gemini-key');
    expect(encryptedDbValue).not.toBe('db-new-gemini-key');
    expect(encryptedDbValue).toContain(':');

    GlobalSettings.find = jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue([
        { key: 'gemini_api_key', value: encryptedDbValue },
        { key: 'gemini_model', value: 'gemini-2.5-pro' }
      ])
    });

    const resolvedKey = await runtimeConfig.get('gemini_api_key');
    const resolvedModel = await runtimeConfig.get('gemini_model');

    expect(resolvedKey).toBe('db-new-gemini-key');
    expect(resolvedModel).toBe('gemini-2.5-pro');
  });

  test('getIntegrationsSnapshot masks secrets and reports accurate db vs env sources', async () => {
    process.env.SMTP_HOST = 'smtp.hostinger.com';
    process.env.SMTP_PASS = 'secret-smtp-pass-from-env';
    process.env.GEMINI_API_KEY = 'your_gemini_api_key_here'; // placeholder should count as unset

    const encryptedGemini = runtimeConfig.encodeValueForStorage('gemini_api_key', 'real-db-key');
    GlobalSettings.find = jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue([{ key: 'gemini_api_key', value: encryptedGemini }])
    });

    const snapshot = await runtimeConfig.getIntegrationsSnapshot();

    expect(snapshot.values.gemini_api_key).toBe('******');
    expect(snapshot.sources.gemini_api_key).toBe('db');
    expect(snapshot.values.smtp_pass).toBe(''); // .env secrets are never leaked to frontend
    expect(snapshot.sources.smtp_pass).toBe('env');
    expect(snapshot.envDefaults.smtp_host).toBe('smtp.hostinger.com');
    expect(snapshot.sources.smtp_host).toBe('env');
  });

  test('skips DB query safely when mongoose is disconnected', async () => {
    mongoose.connection.readyState = 0;
    process.env.RESEND_API_KEY = 're_env_fallback';
    GlobalSettings.find = jest.fn();

    const resendKey = await runtimeConfig.get('resend_api_key');
    expect(GlobalSettings.find).not.toHaveBeenCalled();
    expect(resendKey).toBe('re_env_fallback');
  });
});
