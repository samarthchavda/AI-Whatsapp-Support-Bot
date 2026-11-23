const subscriptionService = require('./subscriptionService');

function getWhatsappConnectionLimit(admin) {
  if (admin?.role === 'super_admin') return 1;
  const planLimit = subscriptionService.getPlanLimit(admin?.subscriptionPlan, 'maxWhatsAppConnections');
  return planLimit === -1 ? -1 : Math.max(2, Number(planLimit) || 0);
}

function getActiveWhatsappPhoneIds(admin) {
  const ids = new Set(
    (admin?.whatsappConnections || [])
      .filter(connection => connection.isActive !== false && connection.phoneNumberId)
      .map(connection => String(connection.phoneNumberId))
  );
  if (admin?.whatsappConnected && admin?.whatsappPhoneNumberId) {
    ids.add(String(admin.whatsappPhoneNumberId));
  }
  return ids;
}

function selectWhatsappPhone(phoneList, targetPhoneNumberId, admin) {
  if (targetPhoneNumberId) {
    return phoneList.find(phone => String(phone.id) === String(targetPhoneNumberId)) || null;
  }
  const activeIds = getActiveWhatsappPhoneIds(admin);
  return phoneList.find(phone => !activeIds.has(String(phone.id))) || phoneList[0] || null;
}

function getReceivingWhatsappCredentials(admin, phoneNumberId) {
  if (String(admin?.whatsappPhoneNumberId || '') === String(phoneNumberId) && admin.whatsappConnected) {
    return {
      accessToken: admin.whatsappAccessToken,
      phoneNumberId: admin.whatsappPhoneNumberId,
      businessAccountId: admin.whatsappBusinessAccountId
    };
  }
  const connection = (admin?.whatsappConnections || []).find(item =>
    String(item.phoneNumberId) === String(phoneNumberId) && item.isActive !== false
  );
  return connection ? {
    accessToken: connection.accessToken,
    phoneNumberId: connection.phoneNumberId,
    businessAccountId: connection.businessAccountId
  } : null;
}

module.exports = { getWhatsappConnectionLimit, getActiveWhatsappPhoneIds, selectWhatsappPhone, getReceivingWhatsappCredentials };
