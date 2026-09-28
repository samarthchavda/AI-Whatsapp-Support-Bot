const dns = require('dns').promises;
const net = require('net');
const url = require('url');

/**
 * Checks if an IPv4 address is in a private/reserved range
 */
function isPrivateIPv4(ip) {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) {
    return true; // invalid IP is considered unsafe
  }

  // 0.0.0.0/8
  if (parts[0] === 0) return true;
  // 127.0.0.0/8 (Loopback)
  if (parts[0] === 127) return true;
  // 10.0.0.0/8 (Private Network)
  if (parts[0] === 10) return true;
  // 172.16.0.0/12 (Private Network: 172.16.0.0 - 172.31.255.255)
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  // 192.168.0.0/16 (Private Network)
  if (parts[0] === 192 && parts[1] === 168) return true;
  // 169.254.0.0/16 (Link-Local & Cloud Metadata 169.254.169.254)
  if (parts[0] === 169 && parts[1] === 254) return true;
  // 100.64.0.0/10 (Carrier-Grade NAT)
  if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true;
  // 192.0.0.0/24 (IETF Protocol Assignments)
  if (parts[0] === 192 && parts[1] === 0 && parts[2] === 0) return true;
  // 192.0.2.0/24 (TEST-NET-1)
  if (parts[0] === 192 && parts[1] === 0 && parts[2] === 2) return true;
  // 198.51.100.0/24 (TEST-NET-2)
  if (parts[0] === 198 && parts[1] === 51 && parts[2] === 100) return true;
  // 203.0.113.0/24 (TEST-NET-3)
  if (parts[0] === 203 && parts[1] === 0 && parts[2] === 113) return true;
  // 224.0.0.0/4 (Multicast)
  if (parts[0] >= 224 && parts[0] <= 239) return true;
  // 240.0.0.0/4 (Reserved)
  if (parts[0] >= 240) return true;
  // Broadcast
  if (ip === '255.255.255.255') return true;

  return false;
}

/**
 * Checks if an IPv6 address is in a private/reserved range
 */
function isPrivateIPv6(ip) {
  const normalized = ip.toLowerCase();
  if (normalized === '::1' || normalized === '::') return true;
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true; // Unique local fc00::/7
  if (normalized.startsWith('fe80:')) return true; // Link-local fe80::/10
  if (normalized.startsWith('::ffff:')) {
    const v4 = normalized.replace('::ffff:', '');
    if (net.isIPv4(v4)) return isPrivateIPv4(v4);
  }
  return false;
}

/**
 * Validates a target URL against SSRF vulnerabilities
 * @param {string} rawUrl - Target URL to check
 * @param {object} options - Optional validation parameters
 * @returns {Promise<{ isValid: boolean, error?: string, sanitizedUrl?: string }>}
 */
async function validateSSRF(rawUrl, options = {}) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { isValid: false, error: 'URL must be a non-empty string' };
  }

  let parsedUrl;
  try {
    parsedUrl = new url.URL(rawUrl.trim());
  } catch {
    return { isValid: false, error: 'Invalid URL format' };
  }

  // 1. Enforce allowed protocols
  const protocol = parsedUrl.protocol.toLowerCase();
  if (protocol !== 'http:' && protocol !== 'https:') {
    return { isValid: false, error: 'Only HTTP and HTTPS protocols are permitted' };
  }

  const hostname = parsedUrl.hostname.toLowerCase().trim();

  // 2. Reject prohibited hostnames and extensions
  const blockedHostnames = [
    'localhost',
    'metadata.google.internal',
    'instance-data',
    '169.254.169.254'
  ];

  if (blockedHostnames.includes(hostname) || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
    return { isValid: false, error: 'Access to internal, local, or metadata hostnames is forbidden' };
  }

  // 3. If direct IP address is provided
  const ipType = net.isIP(hostname);
  if (ipType === 4 && isPrivateIPv4(hostname)) {
    return { isValid: false, error: 'Direct access to private IPv4 address range is forbidden' };
  }
  if (ipType === 6 && isPrivateIPv6(hostname)) {
    return { isValid: false, error: 'Direct access to private IPv6 address range is forbidden' };
  }

  // 4. Perform DNS resolution check to prevent DNS rebinding to private IPs
  if (ipType === 0 && !options.skipDns) {
    try {
      const records = await dns.lookup(hostname, { all: true });
      for (const record of records) {
        if (record.family === 4 && isPrivateIPv4(record.address)) {
          return { isValid: false, error: `Hostname ${hostname} resolves to private IP (${record.address})` };
        }
        if (record.family === 6 && isPrivateIPv6(record.address)) {
          return { isValid: false, error: `Hostname ${hostname} resolves to private IPv6 (${record.address})` };
        }
      }
    } catch (dnsErr) {
      // If DNS lookup fails, return invalid destination
      return { isValid: false, error: `Could not resolve hostname: ${dnsErr.message}` };
    }
  }

  return {
    isValid: true,
    sanitizedUrl: parsedUrl.toString()
  };
}

module.exports = {
  validateSSRF,
  isPrivateIPv4,
  isPrivateIPv6
};
