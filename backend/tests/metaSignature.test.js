const crypto = require('crypto');
const { verifyMetaSignature } = require('../middleware/metaSignature');

const SECRET = 'test_app_secret';
const body = Buffer.from(JSON.stringify({ object: 'whatsapp_business_account', entry: [] }));
const sign = (buf, secret = SECRET) => 'sha256=' + crypto.createHmac('sha256', secret).update(buf).digest('hex');

function run({ method = 'POST', header, mode }) {
  process.env.META_CLIENT_SECRET = SECRET;
  if (mode) process.env.META_WEBHOOK_SIGNATURE_MODE = mode; else delete process.env.META_WEBHOOK_SIGNATURE_MODE;
  const req = { method, rawBody: body, ip: '1.2.3.4', get: (h) => (h.toLowerCase() === 'x-hub-signature-256' ? header : undefined) };
  const res = { sendStatus: jest.fn() };
  const next = jest.fn();
  verifyMetaSignature(req, res, next);
  return { req, res, next };
}

describe('Meta webhook signature', () => {
  beforeAll(() => jest.spyOn(console, 'warn').mockImplementation(() => {}));

  test('valid signature passes and is marked verified', () => {
    const { req, next } = run({ header: sign(body), mode: 'enforce' });
    expect(next).toHaveBeenCalled();
    expect(req.metaSignatureVerified).toBe(true);
  });

  test('enforce mode rejects a forged signature with 401', () => {
    const { res, next } = run({ header: sign(body, 'wrong'), mode: 'enforce' });
    expect(res.sendStatus).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('enforce mode rejects a missing signature', () => {
    const { res } = run({ header: undefined, mode: 'enforce' });
    expect(res.sendStatus).toHaveBeenCalledWith(401);
  });

  test('default monitor mode logs but lets traffic through', () => {
    const { next, req } = run({ header: sign(body, 'merchant_own_app') });
    expect(next).toHaveBeenCalled();
    expect(req.metaSignatureVerified).toBeUndefined();
  });

  test('GET verification handshake is never blocked', () => {
    const { next } = run({ method: 'GET', header: undefined, mode: 'enforce' });
    expect(next).toHaveBeenCalled();
  });

  test('extra merchant app secrets are accepted', () => {
    process.env.META_WEBHOOK_EXTRA_APP_SECRETS = 'merchant_own_app, other';
    const { req } = run({ header: sign(body, 'merchant_own_app'), mode: 'enforce' });
    expect(req.metaSignatureVerified).toBe(true);
    delete process.env.META_WEBHOOK_EXTRA_APP_SECRETS;
  });
});
