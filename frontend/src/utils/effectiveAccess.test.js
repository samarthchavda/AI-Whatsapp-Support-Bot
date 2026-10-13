import { extractEffectiveAccessPayload } from './effectiveAccess';

describe('extractEffectiveAccessPayload', () => {
  test('unwraps the canonical nested API response used by /auth/effective-access', () => {
    const parsed = extractEffectiveAccessPayload({
      data: {
        success: true,
        data: {
          effectivePages: ['dashboard', 'whatsapp-connection'],
          effectivePermissions: ['whatsappConnection.view'],
          usageLimits: { maxWhatsAppConnections: 1 },
          subscription: { planSlug: 'crm-connect' },
          user: { role: 'admin' }
        }
      }
    });

    expect(parsed.effectivePages).toEqual(['dashboard', 'whatsapp-connection']);
    expect(parsed.effectivePermissions).toEqual(['whatsappConnection.view']);
    expect(parsed.usageLimits.maxWhatsAppConnections).toBe(1);
    expect(parsed.subscription.planSlug).toBe('crm-connect');
  });

  test('continues to support a flat response payload', () => {
    const parsed = extractEffectiveAccessPayload({
      data: { effectivePages: ['dashboard'], effectivePermissions: [] }
    });

    expect(parsed.effectivePages).toEqual(['dashboard']);
  });
});
