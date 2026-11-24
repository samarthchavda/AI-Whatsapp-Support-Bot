const fs = require('fs');
const path = require('path');

// Manually parse .env file
let envConfig = {};
try {
  const envPath = path.resolve(__dirname, 'backend', '.env');
  if (fs.existsSync(envPath)) {
    const envFileContent = fs.readFileSync(envPath, 'utf-8');
    envFileContent.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        let key = match[1];
        let value = match[2] || '';
        // Remove quotes if present
        if (value.length > 0 && value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') {
          value = value.replace(/^"|"\s*$/g, '');
        } else if (value.length > 0 && value.charAt(0) === "'" && value.charAt(value.length - 1) === "'") {
          value = value.replace(/^'|'\s*$/g, '');
        }
        envConfig[key] = value;
      }
    });
  }
} catch (err) {
  console.error("Error reading .env in ecosystem config:", err);
}

module.exports = {
  apps: [
    {
      name: "whatsapp-ai-backend",
      cwd: "./backend",
      script: "./server.js",
      instances: "max",       // Runs instances on all available CPU cores in parallel
      exec_mode: "cluster",   // Enables clustering to balance request loads
      autorestart: true,      // Auto-restarts the app instantly if it crashes
      watch: false,
      max_memory_restart: "1G", // Gracefully restarts if memory usage exceeds 1GB
      env: {
        NODE_ENV: "production",
        ...envConfig
      }
    },
    {
      // New super admin API (plans, coupons, offers, pricing, website promotions).
      // Uses the same database and login secret as the backend (from backend/.env).
      // nginx must send /sa-api/ to it (see deploy/nginx.conf).
      name: "super-admin-api",
      cwd: "./super-admin/api",
      script: "./server.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
      watch: false,
      max_memory_restart: "300M",
      env: {
        NODE_ENV: "production",
        PORT: envConfig.SUPER_ADMIN_API_PORT || "5003",
        MONGODB_URI: envConfig.MONGODB_URI,
        JWT_ACCESS_SECRET: envConfig.JWT_ACCESS_SECRET,
        // Same value as the backend's SUPER_ADMIN_API_KEY (checkout hook)
        INTERNAL_API_KEY: envConfig.SUPER_ADMIN_API_KEY || ""
      }
    }
  ]
};
