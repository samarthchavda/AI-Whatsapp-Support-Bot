const mongoose = require('mongoose');
const config = require('./src/config');
const { createApp } = require('./src/app');

async function main() {
  const uri = config.mongoUri();
  config.jwtAccessSecret(); // fail fast if missing
  await mongoose.connect(uri);
  const shown = uri.replace(/\/\/[^@/]*@/, '//***@').replace(/\?.*/, '');
  console.log(`super-admin-api: connected to ${shown}`);
  if (!config.internalApiKey()) console.warn('super-admin-api: INTERNAL_API_KEY not set, checkout hook calls will be refused');
  createApp().listen(config.port, () => console.log(`super-admin-api on http://localhost:${config.port}${config.basePath}`));
}

main().catch((error) => {
  console.error('super-admin-api failed to start:', error.message);
  process.exit(1);
});
