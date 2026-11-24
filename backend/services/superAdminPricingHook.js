/**
 * Optional link to the super admin pricing service (super-admin/api), which
 * owns coupons, offers and personal discounts.
 *
 * Turned on only when both are set:
 *   SUPER_ADMIN_API_URL   e.g. http://127.0.0.1:5003/sa-api/v1
 *   SUPER_ADMIN_API_KEY   same value as INTERNAL_API_KEY in super-admin/api
 *
 * Every function returns null when the service is not set up, slow or
 * failing, and the caller then keeps its existing behaviour. Nothing here
 * ever blocks a payment.
 */
const TIMEOUT_MS = 2500;

function settings() {
  const url = (process.env.SUPER_ADMIN_API_URL || '').replace(/\/$/, '');
  const key = process.env.SUPER_ADMIN_API_KEY || '';
  return url && key ? { url, key } : null;
}

async function call(path, body) {
  const s = settings();
  if (!s) return null;
  try {
    const res = await fetch(`${s.url}/internal${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Internal-Key': s.key },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS)
    });
    if (!res.ok) {
      console.warn(`Super admin pricing ${path} returned ${res.status}; using built-in pricing`);
      return null;
    }
    const json = await res.json();
    return json && json.success ? json.data : null;
  } catch (error) {
    console.warn(`Super admin pricing ${path} unavailable (${error.message}); using built-in pricing`);
    return null;
  }
}

/** Price for a plan: { planPrice, setupFee, subtotal, discount, total, couponError } or null */
function getQuote({ planId, billingCycle, couponCode, adminId }) {
  return call('/quote', {
    planId: String(planId),
    billingCycle,
    couponCode: couponCode || '',
    adminId: adminId ? String(adminId) : null
  });
}

/** Can this merchant use this code: { ok, error, discountPercent, amountOff, ... } or null */
function checkCode({ code, adminId }) {
  return call('/check-code', { code, adminId: adminId ? String(adminId) : null });
}

/** Count one use after a successful payment (never waits on or fails the payment) */
function recordRedemption(code) {
  if (!code) return;
  call('/redeem', { code }).catch(() => {});
}

module.exports = { getQuote, checkCode, recordRedemption };
