jest.mock('../services/broadcastQueue', () => ({
  addBroadcastToQueue: jest.fn().mockResolvedValue(undefined),
  getQueueStats: jest.fn()
}));
jest.mock('../services/broadcastScheduler', () => ({
  scheduleBroadcast: jest.fn(),
  cancelScheduledBroadcast: jest.fn()
}));

const Admin = require('../models/Admin');
const Broadcast = require('../models/Broadcast');
const Template = require('../models/Template');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { addBroadcastToQueue } = require('../services/broadcastQueue');
const { createBroadcast, sendBroadcastNow } = require('../controllers/merchant/broadcastController');
const { isSelfServePreview, previewWriteAllowed } = require('../services/selfServePreview');

const trialAdmin = (overrides = {}) => ({
  _id: 'merchant-1',
  role: 'admin',
  selfSignupTrial: true,
  subscriptionStatus: 'trial',
  whatsappConnected: true,
  whatsappAccessToken: 'token',
  whatsappPhoneNumberId: 'phone-1',
  ...overrides
});

function response() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  };
}

describe('self-signup preview', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  test('ends only after an active paid subscription and opens previews as read-only', () => {
    expect(isSelfServePreview(trialAdmin())).toBe(true);
    expect(isSelfServePreview(trialAdmin({ subscriptionStatus: 'active', subscriptionEndDate: new Date('2027-01-01') }))).toBe(false);
    expect(isSelfServePreview(trialAdmin({ subscriptionStatus: 'active', subscriptionEndDate: new Date('2026-01-01') }))).toBe(true);
    expect(isSelfServePreview(trialAdmin({ selfSignupTrial: false }))).toBe(false);
    expect(previewWriteAllowed('GET', '/api/orders')).toBe(true);
    expect(previewWriteAllowed('POST', '/api/orders')).toBe(false);
    expect(previewWriteAllowed('POST', '/api/whatsapp/templates')).toBe(true);
    expect(previewWriteAllowed('PUT', '/api/whatsapp/templates/id/map')).toBe(false);
    expect(previewWriteAllowed('POST', '/api/broadcasts/id/send')).toBe(true);
    expect(previewWriteAllowed('POST', '/api/broadcasts/id/reuse')).toBe(false);
  });

  test('refuses a third test broadcast before queueing it', async () => {
    jest.spyOn(Broadcast, 'findOne').mockResolvedValue({ _id: 'broadcast-1', status: 'draft', totalRecipients: 2, recipients: [{}, {}], templateName: 'approved' });
    jest.spyOn(Template, 'findOne').mockResolvedValue({ name: 'approved', status: 'APPROVED' });
    const reserve = jest.spyOn(Admin, 'findOneAndUpdate').mockResolvedValue(null);
    const res = response();

    await sendBroadcastNow({ params: { id: 'broadcast-1' }, admin: trialAdmin() }, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json.mock.calls[0][0].error).toMatch(/two test broadcasts/i);
    expect(reserve.mock.calls[0][0]).toMatchObject({ selfSignupTrial: true, trialBroadcastsUsed: { $lt: 2 } });
    expect(addBroadcastToQueue).not.toHaveBeenCalled();
  });

  test('rejects oversized and unapproved test sends', async () => {
    const broadcast = { _id: 'broadcast-1', status: 'draft', totalRecipients: 1, recipients: Array(6).fill({}), templateName: 'approved' };
    jest.spyOn(Broadcast, 'findOne').mockResolvedValue(broadcast);
    const reserve = jest.spyOn(Admin, 'findOneAndUpdate');
    const res = response();
    await sendBroadcastNow({ params: { id: 'broadcast-1' }, admin: trialAdmin() }, res);
    expect(res.status).toHaveBeenCalledWith(403);

    broadcast.recipients = [{}];
    jest.spyOn(Template, 'findOne').mockResolvedValue(null);
    const res2 = response();
    await sendBroadcastNow({ params: { id: 'broadcast-1' }, admin: trialAdmin() }, res2);
    expect(res2.status).toHaveBeenCalledWith(400);
    expect(reserve).not.toHaveBeenCalled();
  });

  test('reserves one test before queueing an approved small broadcast', async () => {
    const broadcast = { _id: 'broadcast-1', status: 'draft', totalRecipients: 2, recipients: [{}, {}], templateName: 'approved' };
    jest.spyOn(Broadcast, 'findOne').mockResolvedValue(broadcast);
    jest.spyOn(Broadcast, 'findOneAndUpdate').mockResolvedValue({ ...broadcast, status: 'sending' });
    jest.spyOn(Template, 'findOne').mockResolvedValue({ name: 'approved', status: 'APPROVED' });
    const reserve = jest.spyOn(Admin, 'findOneAndUpdate').mockResolvedValue({ ...trialAdmin(), trialBroadcastsUsed: 1 });
    const res = response();

    await sendBroadcastNow({ params: { id: 'broadcast-1' }, admin: trialAdmin() }, res);

    expect(reserve).toHaveBeenCalledWith(
      { _id: 'merchant-1', selfSignupTrial: true, trialBroadcastsUsed: { $lt: 2 } },
      { $inc: { trialBroadcastsUsed: 1 } },
      { new: true }
    );
    expect(addBroadcastToQueue).toHaveBeenCalledWith('broadcast-1', { claimed: true });
    expect(res.json.mock.calls[0][0].success).toBe(true);
  });

  test('the create endpoint rejects a third campaign after parsing an approved test CSV', async () => {
    const filePath = path.join(os.tmpdir(), `kwickbot-preview-${process.pid}-${Date.now()}.csv`);
    fs.writeFileSync(filePath, 'phone,name\n9876543210,Test Customer\n');
    jest.spyOn(Template, 'findOne').mockResolvedValue({ name: 'approved', language: 'en_US', status: 'APPROVED' });
    const reserve = jest.spyOn(Admin, 'findOneAndUpdate').mockResolvedValue(null);
    const res = response();
    const req = {
      admin: trialAdmin({ subscriptionPlan: 'starter', name: 'Merchant' }),
      body: { title: 'Test campaign', message: 'Hello', templateName: 'approved', recipientSource: 'csv' },
      files: { csvFile: [{ path: filePath, originalname: 'contacts.csv' }] }
    };

    await createBroadcast(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json.mock.calls[0][0].error).toMatch(/two test broadcasts/i);
    expect(reserve).toHaveBeenCalled();
    expect(addBroadcastToQueue).not.toHaveBeenCalled();
    expect(fs.existsSync(filePath)).toBe(false);
  });
});
