// Settings come from environment variables only (see .env.example).
function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

module.exports = {
  port: Number(process.env.PORT) || 5003,
  mongoUri: () => required('MONGODB_URI'),
  jwtAccessSecret: () => required('JWT_ACCESS_SECRET'),
  internalApiKey: () => process.env.INTERNAL_API_KEY || '',
  basePath: '/sa-api/v1'
};
