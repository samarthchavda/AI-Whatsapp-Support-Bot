// Basic Auth Middleware to secure Swagger API Docs
module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Kwickbot Private API Docs"');
    return res.status(401).send('Authentication required to access Kwickbot API Documentation.');
  }

  const auth = Buffer.from(authHeader.split(' ')[1], 'base64').toString().split(':');
  const user = auth[0];
  const pass = auth[1];

  const expectedUser = process.env.SWAGGER_USER || 'admin';
  const expectedPass = process.env.SWAGGER_PASS || 'kwickbot2026';

  if (user === expectedUser && pass === expectedPass) {
    return next();
  }

  res.setHeader('WWW-Authenticate', 'Basic realm="Kwickbot Private API Docs"');
  return res.status(401).send('Invalid credentials. Access denied.');
};
