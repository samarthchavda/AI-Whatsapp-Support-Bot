const bcrypt = require('bcryptjs');

module.exports = (req, res, next) => {
  const expectedUser = process.env.SWAGGER_USER;
  const expectedPassHash = process.env.SWAGGER_PASS_HASH;

  if (!expectedUser || !expectedPassHash) {
    console.error('SWAGGER_USER or SWAGGER_PASS_HASH environment variables are not configured');
    res.setHeader('WWW-Authenticate', 'Basic realm="Kwickbot Private API Docs"');
    return res.status(500).send('Swagger documentation authentication is not configured on the server.');
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Kwickbot Private API Docs"');
    return res.status(401).send('Authentication required to access Kwickbot API Documentation.');
  }

  try {
    const auth = Buffer.from(authHeader.split(' ')[1], 'base64').toString().split(':');
    const user = auth[0];
    const pass = auth[1] || '';

    const isUserValid = user === expectedUser;
    const isPassValid = bcrypt.compareSync(pass, expectedPassHash);

    if (isUserValid && isPassValid) {
      return next();
    }
  } catch (err) {
    console.error('Error in basicAuth middleware:', err);
  }

  res.setHeader('WWW-Authenticate', 'Basic realm="Kwickbot Private API Docs"');
  return res.status(401).send('Invalid credentials. Access denied.');
};
