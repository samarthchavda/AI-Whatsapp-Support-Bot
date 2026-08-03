const bcrypt = require('bcryptjs');

// Pre-computed bcrypt hash of the requested password
const DEFAULT_USER = 'samarthsanjaychavda';
const DEFAULT_PASS_HASH = '$2a$10$IzpFmyKFRqZDqwBHY.1gkuLalXSlc.n2PlJI51SNHdoXL0JkpL..O';

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Kwickbot Private API Docs"');
    return res.status(401).send('Authentication required to access Kwickbot API Documentation.');
  }

  try {
    const auth = Buffer.from(authHeader.split(' ')[1], 'base64').toString().split(':');
    const user = auth[0];
    const pass = auth[1] || '';

    const expectedUser = process.env.SWAGGER_USER || DEFAULT_USER;
    const expectedPassHash = process.env.SWAGGER_PASS_HASH || DEFAULT_PASS_HASH;

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
