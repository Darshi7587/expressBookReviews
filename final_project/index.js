const express = require('express');
const jwt = require('jsonwebtoken');
const session = require('express-session');
const { jwtSecret } = require('./config');
const { authenticated: customerRoutes } = require('./router/auth_users');
const { general: generalRoutes } = require('./router/general');

const app = express();
const PORT = Number(process.env.PORT) || 5000;

app.use(express.json());

app.use('/customer', session({
  name: 'bookshop.sid',
  secret: process.env.SESSION_SECRET || 'development-only-change-this-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  }
}));

app.use('/customer/auth', (req, res, next) => {
  const authorization = req.get('authorization');
  const token = authorization && authorization.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : null;

  if (token) {
    try {
      const payload = jwt.verify(token, jwtSecret);
      if (typeof payload.username !== 'string') {
        return res.status(401).json({ message: 'Invalid or expired token' });
      }
      req.user = { username: payload.username };
      return next();
    } catch {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
  }

  if (req.session.username) {
    req.user = { username: req.session.username };
    return next();
  }

  return res.status(401).json({ message: 'Authentication required' });
});

app.use('/customer', customerRoutes);
app.use('/', generalRoutes);

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Book review API listening on port ${PORT}`);
  });
}

module.exports = { app };
