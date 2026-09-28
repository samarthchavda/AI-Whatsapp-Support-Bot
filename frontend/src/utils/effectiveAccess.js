export function extractEffectiveAccessPayload(response) {
  const responseBody = response?.data || {};
  const payload = responseBody?.data && typeof responseBody.data === 'object'
    ? responseBody.data
    : responseBody;

  return {
    effectivePages: Array.isArray(payload.effectivePages) ? payload.effectivePages : [],
    effectivePermissions: Array.isArray(payload.effectivePermissions) ? payload.effectivePermissions : [],
    usageLimits: payload.usageLimits || {},
    currentUsage: payload.currentUsage || {},
    subscription: payload.subscription || null,
    features: payload.features || {},
    user: payload.user || null
  };
}
