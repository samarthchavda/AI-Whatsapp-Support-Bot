const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, execSync } = require('child_process');

const JSON_PATH = path.join(os.tmpdir(), 'serveo_tunnel.json');
const LOG_PATH = path.join(os.tmpdir(), 'serveo_tunnel.log');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Checks if a URL is responsive by making a quick request.
 * Returns true if responsive, false otherwise.
 */
async function isUrlResponsive(url) {
  const maxRetries = 3;
  for (let i = 0; i < maxRetries; i++) {
    try {
      // We send a request to the root URL with a 5s timeout.
      // If it returns any status (e.g. 200, 401, 404, etc.) without timing out, it is active.
      await axios.get(url, { timeout: 5000 });
      return true;
    } catch (err) {
      // If we get any HTTP response back (even an error status like 401/404/500/502/504),
      // it means the tunnel server itself is alive and reachable.
      if (err.response) {
        return true;
      }
      
      // Wait 1 second before retrying
      if (i < maxRetries - 1) {
        await sleep(1000);
      }
    }
  }
  return false;
}

/**
 * Auto-detect the local running ngrok tunnel URL by querying the ngrok client API,
 * or automatically establish and reuse a Serveo SSH tunnel for zero-setup local development.
 * Returns the public HTTPS URL if found, otherwise null.
 */
async function getNgrokUrl() {
  // 1. Try to query local ngrok client first
  try {
    const response = await axios.get('http://127.0.0.1:4040/api/tunnels', { timeout: 800 });
    const tunnels = response.data?.tunnels;
    if (Array.isArray(tunnels) && tunnels.length > 0) {
      const httpsTunnel = tunnels.find(t => t.proto === 'https') || tunnels[0];
      if (httpsTunnel && httpsTunnel.public_url) {
        console.log(`✅ Detected local ngrok tunnel: ${httpsTunnel.public_url}`);
        return httpsTunnel.public_url;
      }
    }
  } catch (err) {
    // Ngrok client is not running locally
  }

  // If in production, do not spawn local tunnels
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  // 2. Check if a cached tunnel is already running and responsive
  if (fs.existsSync(JSON_PATH)) {
    try {
      const data = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
      if (data.pid && data.url) {
        // Check if process is still alive
        let processAlive = false;
        try {
          process.kill(data.pid, 0);
          processAlive = true;
        } catch (e) {
          // Process is dead
        }

        if (processAlive) {
          // Check if the URL is actually responsive (not timing out with 408/504)
          const responsive = await isUrlResponsive(data.url);
          if (responsive) {
            return data.url;
          } else {
            console.log(`⚠️ Cached tunnel URL ${data.url} is unresponsive. Killing process ${data.pid} to restart...`);
            try {
              process.kill(data.pid, 'SIGTERM');
            } catch (e) {}
          }
        }
      }
    } catch (e) {
      // Error reading file
    }
  }

  // 3. Clean up any remaining tunnel processes to avoid conflicts
  try {
    execSync('pkill -f "ssh.*serveo.net"');
  } catch (e) {}
  try {
    execSync('pkill -f localtunnel');
  } catch (e) {}

  if (fs.existsSync(LOG_PATH)) {
    try { fs.unlinkSync(LOG_PATH); } catch (e) {}
  }

  const out = fs.openSync(LOG_PATH, 'a');
  const err = fs.openSync(LOG_PATH, 'a');
  const port = process.env.PORT || 5001;

  // 4. Try LocalTunnel (static subdomain) first
  try {
    console.log('Starting LocalTunnel...');
    // Start localtunnel using the open out/err file descriptors
    const localtunnelChild = spawn('npx', [
      'localtunnel',
      '--port', port.toString(),
      '--subdomain', 'samarth-whatsapp-bot'
    ], {
      detached: true,
      stdio: ['ignore', out, err]
    });

    localtunnelChild.unref();
    const pid = localtunnelChild.pid;

    // Poll log file for LocalTunnel URL
    for (let i = 0; i < 30; i++) { // wait up to 6 seconds
      await sleep(200);
      if (fs.existsSync(LOG_PATH)) {
        const logs = fs.readFileSync(LOG_PATH, 'utf8');
        const match = logs.match(/your url is:\s+(https:\/\/[^\s]+)/);
        if (match) {
          const url = match[1];
          console.log(`✅ Established LocalTunnel: ${url} (PID: ${pid})`);
          fs.writeFileSync(JSON_PATH, JSON.stringify({ pid, url, type: 'localtunnel' }, null, 2));
          return url;
        }
      }
    }
    console.warn('⚠️ LocalTunnel initialization timed out. Falling back to Serveo...');
    try {
      process.kill(pid, 'SIGTERM');
    } catch (e) {}
  } catch (err) {
    console.error('❌ Error launching LocalTunnel:', err.message);
  }

  // 5. Fallback to Serveo (SSH tunnel)
  try {
    console.log('Starting Serveo SSH tunnel...');
    const child = spawn('ssh', [
      '-o', 'StrictHostKeyChecking=no',
      '-o', 'UserKnownHostsFile=/dev/null',
      '-o', 'ServerAliveInterval=60',
      '-R', `80:localhost:${port}`,
      'serveo.net'
    ], {
      detached: true,
      stdio: ['ignore', out, err]
    });

    child.unref();
    const pid = child.pid;

    // Poll log file for Serveo URL
    for (let i = 0; i < 30; i++) { // wait up to 6 seconds
      await sleep(200);
      if (fs.existsSync(LOG_PATH)) {
        const logs = fs.readFileSync(LOG_PATH, 'utf8');
        const match = logs.match(/Forwarding HTTP traffic from (https:\/\/[^\s]+)/);
        if (match) {
          const url = match[1];
          console.log(`✅ Established Serveo tunnel: ${url} (PID: ${pid})`);
          fs.writeFileSync(JSON_PATH, JSON.stringify({ pid, url, type: 'serveo' }, null, 2));
          return url;
        }
      }
    }
    console.warn('⚠️ Serveo tunnel initialization timed out.');
    try {
      process.kill(pid, 'SIGTERM');
    } catch (e) {}
  } catch (err) {
    console.error('❌ Error launching Serveo:', err.message);
  }

  return null;
}

module.exports = {
  getNgrokUrl
};
