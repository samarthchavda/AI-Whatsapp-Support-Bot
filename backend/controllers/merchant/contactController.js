const axios = require('axios');
const Conversation = require('../../models/Conversation');
const { canUseGrowthContactSync } = require('../../services/growthContactSync');
const { getReceivingWhatsappCredentials } = require('../../services/whatsappConnectionLimit');

exports.listContacts = async (req, res) => {
  if (!canUseGrowthContactSync(req.admin)) {
    return res.status(403).json({ success: false, error: 'Contacts are available on an active Growth plan.' });
  }

  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 25));
    const search = String(req.query.search || '').trim().slice(0, 80);
    const query = { admin: req.admin._id, isSuperAdminChat: { $ne: true } };
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { customerName: { $regex: escaped, $options: 'i' } },
        { customerPhone: { $regex: escaped, $options: 'i' } }
      ];
    }
    const [contacts, total] = await Promise.all([
      Conversation.find(query)
        .select('customerName customerPhone channelPhoneNumberId syncedFromWhatsAppApp updatedAt')
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Conversation.countDocuments(query)
    ]);
    res.json({ success: true, data: contacts, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Could not load contacts.' });
  }
};

exports.syncBusinessAppContacts = async (req, res) => {
  const admin = req.admin;
  if (!canUseGrowthContactSync(admin)) {
    return res.status(403).json({ success: false, error: 'Contact sync requires an active Growth plan.' });
  }

  const phoneIds = new Set(
    (admin.whatsappConnections || [])
      .filter(connection => connection.isActive !== false && connection.phoneNumberId)
      .map(connection => String(connection.phoneNumberId))
  );
  if (admin.whatsappConnected && admin.whatsappPhoneNumberId) {
    phoneIds.add(String(admin.whatsappPhoneNumberId));
  }
  if (!phoneIds.size) {
    return res.status(409).json({ success: false, error: 'Connect WhatsApp before syncing contacts.' });
  }

  let started = 0;
  let incompatible = 0;
  let failed = 0;
  for (const phoneId of phoneIds) {
    const credentials = getReceivingWhatsappCredentials(admin, phoneId);
    if (!credentials?.accessToken) {
      failed += 1;
      continue;
    }
    const headers = { Authorization: `Bearer ${credentials.accessToken}` };
    try {
      const { data } = await axios.get(`https://graph.facebook.com/v25.0/${phoneId}`, {
        params: { fields: 'is_on_biz_app' }, headers, timeout: 10000
      });
      if (data?.is_on_biz_app !== true) {
        incompatible += 1;
        continue;
      }
      await axios.post(`https://graph.facebook.com/v25.0/${phoneId}/smb_app_data`,
        { messaging_product: 'whatsapp', sync_type: 'smb_app_state_sync' },
        { headers: { ...headers, 'Content-Type': 'application/json' }, timeout: 10000 });
      started += 1;
    } catch (error) {
      failed += 1;
      console.warn('Could not start Business App contact sync:', error.response?.data?.error?.message || error.message);
    }
  }

  if (!started) {
    return res.status(failed ? 502 : 409).json({
      success: false,
      error: failed
        ? 'Could not start contact sync. Check the WhatsApp connection and try again.'
        : 'Business App contact sync requires a connected WhatsApp Business App number.',
      incompatible, failed
    });
  }
  return res.status(202).json({
    success: true,
    message: `Contact sync started for ${started} WhatsApp Business App number${started === 1 ? '' : 's'}. Contacts will appear after Meta sends the sync.`,
    started, incompatible, failed
  });
};
