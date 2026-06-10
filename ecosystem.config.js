module.exports = {
  apps: [
    {
      name: "whatsapp-ai-backend",
      script: "./backend/server.js",
      instances: "max",       // Runs instances on all available CPU cores in parallel
      exec_mode: "cluster",   // Enables clustering to balance request loads
      autorestart: true,      // Auto-restarts the app instantly if it crashes
      watch: false,
      max_memory_restart: "1G", // Gracefully restarts if memory usage exceeds 1GB
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};
