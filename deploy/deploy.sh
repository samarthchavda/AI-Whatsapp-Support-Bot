#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

PROJECT_DIR="/var/www/whatsapp-bot"

echo "========================================================="
echo "🔄 Starting AI WhatsApp Support Bot Deployment Script"
echo "========================================================="

# Navigate to project directory
cd $PROJECT_DIR

# Pull latest changes from the Git repository
echo "📥 Fetching latest code from git..."
git pull origin main || echo "⚠️  Git pull skipped or failed (if not in a git repo yet)"

# --- BACKEND SETUP ---
echo "⚙️  Setting up Backend..."
cd $PROJECT_DIR/backend
echo "📦 Installing backend npm packages..."
npm install --omit=dev

# Run any migrations or database seeding if required
# npm run seed # Uncomment if you want to seed default data on every deploy

# --- FRONTEND SETUP ---
echo "⚙️  Setting up Frontend..."
cd $PROJECT_DIR/frontend
echo "📦 Installing frontend npm packages..."
npm install --legacy-peer-deps
echo "🏗️  Building React production assets..."
npm run build

# --- RESTART PROCESSES ---
echo "🔄 Restarting Express Backend under PM2..."
cd $PROJECT_DIR
pm2 startOrRestart ecosystem.config.js

# Enable PM2 to save the current process list so it launches on server reboot
pm2 save

echo "========================================================="
echo "🎉 Deployment Completed Successfully!"
echo "🚀 Your app is now live with the latest updates."
echo "========================================================="
