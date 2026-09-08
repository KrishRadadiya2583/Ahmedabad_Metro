const { config } = require('../config/env');

const securityHeaders = (req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self)'
  });
  if (config.isProduction) res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
};

const sameOrigin = (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.get('sec-fetch-site') === 'cross-site') return res.status(403).send('Cross-site request rejected.');
  const origin = req.get('origin');
  if (!origin) return next();
  try {
    if (new URL(origin).host !== req.get('host')) return res.status(403).send('Invalid request origin.');
  } catch {
    return res.status(403).send('Invalid request origin.');
  }
  next();
};

module.exports = { securityHeaders, sameOrigin };
