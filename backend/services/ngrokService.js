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

  // 2. Manage/auto-start a Serveo SSH tunnel as a zero-setup alternative
  try {
    // Check if tunnel is already running
    if (fs.existsSync(JSON_PATH)) {
      try {
        const data = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
        if (data.pid && data.url) {
          // Check if the process is still alive
          try {
            process.kill(data.pid, 0);
            return data.url;
          } catch (e) {
            // Process is dead, will start a new one
          }
        }
      } catch (e) {
        // Error reading file
      }
    }

    // Clean up any old serveo ssh processes to avoid port conflicts
    try {
      execSync('pkill -f "ssh.*serveo.net"');
    } catch (e) {
      // ignore if none found
    }

    // Start a new SSH tunnel
    if (fs.existsSync(LOG_PATH)) {
      try { fs.unlinkSync(LOG_PATH); } catch (e) {}
    }

    const out = fs.openSync(LOG_PATH, 'a');
    const err = fs.openSync(LOG_PATH, 'a');

    const port = process.env.PORT || 5001;
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

    // Poll log file for URL
    for (let i = 0; i < 40; i++) { // wait up to 8 seconds
      await sleep(200);
      if (fs.existsSync(LOG_PATH)) {
        const logs = fs.readFileSync(LOG_PATH, 'utf8');
        const match = logs.match(/Forwarding HTTP traffic from (https:\/\/[^\s]+)/);
        if (match) {
          const url = match[1];
          console.log(`✅ Started Serveo SSH tunnel: ${url} (PID: ${pid})`);
          fs.writeFileSync(JSON_PATH, JSON.stringify({ pid, url }, null, 2));
          return url;
        }
      }
    }
    console.warn('⚠️ Serveo tunnel spawn timed out. Check logs at:', LOG_PATH);
  } catch (err) {
    console.error('❌ Error managing Serveo tunnel:', err.message);
  }

  return null;
}

module.exports = {
  getNgrokUrl
};

