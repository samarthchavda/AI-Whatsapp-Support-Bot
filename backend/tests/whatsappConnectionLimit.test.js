const { getWhatsappConnectionLimit, getActiveWhatsappPhoneIds, selectWhatsappPhone, getReceivingWhatsappCredentials } = require('../services/whatsappConnectionLimit');

describe('merchant WhatsApp connection limits', () => {
  test('every merchant has at least two slots while higher plan limits remain', () => {
    expect(getWhatsappConnectionLimit({ role: 'admin', subscriptionPlan: 'starter' })).toBe(2);
    expect(getWhatsappConnectionLimit({ role: 'admin', subscriptionPlan: 'growth' })).toBe(2);
    expect(getWhatsappConnectionLimit({ role: 'admin', subscriptionPlan: 'scale' })).toBe(5);
    expect(getWhatsappConnectionLimit({ role: 'super_admin', subscriptionPlan: 'scale' })).toBe(1);
  });

  test('counts a legacy primary number once alongside stored connections', () => {
    const admin = {
      whatsappConnected: true,
      whatsappPhoneNumberId: 'phone-a',
      whatsappConnections: [
        { phoneNumberId: 'phone-a', isActive: true },
        { phoneNumberId: 'phone-b', isActive: true },
        { phoneNumberId: 'phone-c', isActive: false }
      ]
    };
    expect([...getActiveWhatsappPhoneIds(admin)]).toEqual(['phone-a', 'phone-b']);
    expect([...getActiveWhatsappPhoneIds({ ...admin, whatsappConnections: [] })]).toEqual(['phone-a']);
  });

  test('selects the next unconnected phone from the same Meta account', () => {
    const phones = [{ id: 'phone-a' }, { id: 'phone-b' }];
    const admin = { whatsappConnected: true, whatsappPhoneNumberId: 'phone-a', whatsappConnections: [] };
    expect(selectWhatsappPhone(phones, null, admin)).toBe(phones[1]);
    expect(selectWhatsappPhone(phones, 'phone-a', admin)).toBe(phones[0]);
    expect(selectWhatsappPhone(phones, 'unknown', admin)).toBeNull();
  });

  test('uses the receiving phone token when a second number gets a message', () => {
    const admin = {
      whatsappConnected: true,
      whatsappPhoneNumberId: 'phone-a',
      whatsappAccessToken: 'token-a',
      whatsappBusinessAccountId: 'waba-a',
      whatsappConnections: [
        { phoneNumberId: 'phone-a', accessToken: 'token-a', isActive: true },
        { phoneNumberId: 'phone-b', accessToken: 'token-b', businessAccountId: 'waba-b', isActive: true }
      ]
    };
    expect(getReceivingWhatsappCredentials(admin, 'phone-b')).toEqual({
      accessToken: 'token-b', phoneNumberId: 'phone-b', businessAccountId: 'waba-b'
    });
    expect(getReceivingWhatsappCredentials(admin, 'phone-a').accessToken).toBe('token-a');
    expect(getReceivingWhatsappCredentials(admin, 'unknown')).toBeNull();
  });
});
