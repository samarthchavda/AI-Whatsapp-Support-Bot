import { extractEffectiveAccessPayload } from './effectiveAccess';

describe('extractEffectiveAccessPayload', () => {
  test('unwraps the canonical nested API response used by /auth/effective-access', () => {
    const parsed = extractEffectiveAccessPayload({
      data: {
        success: true,
        data: {
          effectivePages: ['integration-dashboard', 'crm-connection'],
          effectivePermissions: ['crmConnection.view'],
          usageLimits: { maxCrmConnections: 1 },
          subscription: { planSlug: 'crm-connect' },
          user: { role: 'admin' }
        }
      }
    });

    expect(parsed.effectivePages).toEqual(['integration-dashboard', 'crm-connection']);
    expect(parsed.effectivePermissions).toEqual(['crmConnection.view']);
    expect(parsed.usageLimits.maxCrmConnections).toBe(1);
    expect(parsed.subscription.planSlug).toBe('crm-connect');
  });

  test('continues to support a flat response payload', () => {
    const parsed = extractEffectiveAccessPayload({
      data: { effectivePages: ['dashboard'], effectivePermissions: [] }
    });

    expect(parsed.effectivePages).toEqual(['dashboard']);
  });
});
