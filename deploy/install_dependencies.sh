#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "================================================================="
echo "🚀 Starting AI WhatsApp Support Bot Server Installation Script"
echo "================================================================="

# 1. Update and upgrade system packages
echo "🔄 Updating system packages..."
sudo apt-get update && sudo apt-get upgrade -y

# 2. Install essential build tools and utilities
echo "🛠️ Installing basic utilities..."
sudo apt-get install -y curl git build-essential software-properties-common ca-certificates gnupg

# 3. Install Node.js (v20.x LTS)
echo "🟢 Installing Node.js v20..."
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | sudo gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" | sudo tee /etc/apt/sources.list.d/nodesource.list
sudo apt-get update
sudo apt-get install nodejs -y

# Verify Node.js and NPM installation
echo "✅ Node.js Version: $(node -v)"
echo "✅ NPM Version: $(npm -v)"

# 4. Install PM2 (Process Manager) globally
echo "📦 Installing PM2 globally..."
sudo npm install -y pm2 -g

# 5. Install Nginx (Web Server)
echo "🌐 Installing Nginx Web Server..."
sudo apt-get install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx

# 6. Install Certbot (Let's Encrypt SSL Client)
echo "🔒 Installing Certbot for SSL/HTTPS..."
sudo apt-get install -y certbot python3-certbot-nginx

# 7. Install Puppeteer/Chrome dependencies (Essential for whatsapp-web.js headless browser)
echo "🌐 Installing Chromium browser and headless Chrome dependencies..."
sudo apt-get install -y chromium-browser

# Additional dependencies for headless Chrome
sudo apt-get install -y \
  ca-certificates \
  fonts-liberation \
  libappindicator3-1 \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libc6 \
  libcairo2 \
  libcups2 \
  libdbus-1-3 \
  libexpat1 \
  libfontconfig1 \
  libgbm1 \
  libgcc1 \
  libgconf-2-4 \
  libgdk-pixbuf2.0-0 \
  libglib2.0-0 \
  libgtk-3-0 \
  libnspr4 \
  libnss3 \
  libpango-1.0-0 \
  libpangocairo-1.0-0 \
  libstdc++6 \
  libx11-6 \
  libx11-xcb1 \
  libxcb1 \
  libxcomposite1 \
  libxcursor1 \
  libxdamage1 \
  libxext6 \
  libxfixes3 \
  libxi6 \
  libxrandr2 \
  libxrender1 \
  libxss1 \
  libxtst6 \
  lsb-release \
  wget \
  xdg-utils

echo "================================================================="
echo "🎉 System Dependencies & Tools Installed Successfully!"
echo "👉 Node.js, PM2, Nginx, Certbot, and Chrome dependencies are ready."
echo "================================================================="
