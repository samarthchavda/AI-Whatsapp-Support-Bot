const mongoose = require('mongoose');
const GlobalSettings = require('../models/GlobalSettings');

const FEATURE_FLAGS = [
  {
    key: 'aiAutoResponseEnabled',
    name: 'AI Auto-Response Engine',
    description: 'Controls whether AI automatically answers incoming WhatsApp messages without escalating to a human agent.',
    scope: 'AI Pipeline',
    defaultEnabled: true
  },
  {
    key: 'shopifySyncEnabled',
    name: 'Shopify Sync & Webhooks',
    description: 'Controls Shopify 15-minute order sync cron jobs as well as Shopify order, fulfillment, and checkout webhooks.',
    scope: 'Cron + Webhooks',
    defaultEnabled: true
  },
  {
    key: 'wooSyncEnabled',
    name: 'WooCommerce Webhook Listeners',
    description: 'Controls WooCommerce real-time webhook routing for automated order updates and notifications.',
    scope: 'Webhooks',
    defaultEnabled: true
  },
  {
    key: 'merchantTemplateCreationEnabled',
    name: 'Merchant Template Creation',
    description: 'Allows merchants to create and submit WhatsApp message templates to their connected Meta Business account.',
    scope: 'Meta Templates',
    defaultEnabled: true
  },
  {
    key: 'broadcastsEnabled',
    name: 'Campaign Broadcasting',
    description: 'Global kill-switch for immediate and scheduled merchant WhatsApp campaign broadcasts.',
    scope: 'Scheduler + Queue',
    defaultEnabled: true
  },
  {
    key: 'abandonedCartRemindersEnabled',
    name: 'Abandoned Cart Reminders',
    description: 'Controls automated WhatsApp recovery reminders for abandoned Shopify checkouts.',
    scope: 'Scheduler',
    defaultEnabled: true
  },
  {
    key: 'merchantSignupEnabled',
    name: 'Merchant Self-Signup',
    description: 'Controls public self-service merchant trial registration on kwickbot.in.',
    scope: 'Public Auth',
    defaultEnabled: true
  }
];

const FEATURE_FLAG_MAP = new Map(FEATURE_FLAGS.map((f) => [f.key, f]));
const PREDEFINED_FLAG_KEYS = FEATURE_FLAGS.map((f) => f.key);

async function isFeatureEnabled(key) {
  const def = FEATURE_FLAG_MAP.get(key);
  const fallback = def ? def.defaultEnabled : true;
  try {
    const isMocked = Boolean(GlobalSettings.findOne && GlobalSettings.findOne.mock);
    if (!isMocked && mongoose.connection.readyState !== 1) {
      return fallback;
    }
    const setting = await GlobalSettings.findOne({ key });
    if (!setting || typeof setting.value !== 'boolean') {
      return fallback;
    }
    return setting.value === true;
  } catch (err) {
    console.error(`Error checking feature flag ${key}:`, err.message);
    return fallback;
  }
}

module.exports = {
  FEATURE_FLAGS,
  FEATURE_FLAG_MAP,
  PREDEFINED_FLAG_KEYS,
  isFeatureEnabled
};
