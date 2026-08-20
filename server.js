require('dotenv').config();
const express = require('express');
const session = require('express-session');
const { MongoStore } = require('connect-mongo');
const mongoose = require('mongoose');
const path = require('path');
const connectDB = require('./config/db');
const indexRoutes = require('./routes/index');
const { config, validateEnvironment } = require('./config/env');

const app = express();
validateEnvironment();
const PORT = config.port;
let resolveMongoClient;
const mongoClientPromise = new Promise(resolve => { resolveMongoClient = resolve; });

if (config.isProduction) app.set('trust proxy', 1);
app.disable('x-powered-by');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self)'
  });
  if (config.isProduction) res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});
app.use(express.urlencoded({ extended: false, limit: '32kb' }));
app.use(express.json({ limit: '32kb' }));
app.use(express.static(path.join(__dirname, 'public'), { maxAge: config.isProduction ? '7d' : 0, etag: true }));
app.use((req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.get('sec-fetch-site') === 'cross-site') return res.status(403).send('Cross-site request rejected.');
  const origin = req.get('origin');
  if (origin) {
    try { if (new URL(origin).host !== req.get('host')) return res.status(403).send('Invalid request origin.'); }
    catch { return res.status(403).send('Invalid request origin.'); }
  }
  next();
});
app.use(session({
  name: 'metro.sid',
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  unset: 'destroy',
  rolling: true,
  store: MongoStore.create({ clientPromise: mongoClientPromise, ttl: 60 * 60 * 8, autoRemove: 'native' }),
  cookie: { maxAge: 1000 * 60 * 60 * 8, httpOnly: true, sameSite: 'lax', secure: config.isProduction, path: '/' }
}));

app.use((req, res, next) => {
  res.locals.appName = 'Ahmedabad Metro';
  res.locals.isAdmin = Boolean(req.session && req.session.isAdmin);
  res.locals.currentUser = req.session?.userId ? { id: req.session.userId, name: req.session.userName } : null;
  res.locals.supportEmail = process.env.SUPPORT_EMAIL || process.env.EMAIL_USER || 'support@ahmedabadmetro.app';
  res.locals.assetUrl = fileName => config.imagekitUrlEndpoint
    ? `${config.imagekitUrlEndpoint}/ahmedabad-metro/${encodeURIComponent(fileName)}`
    : `/${encodeURIComponent(fileName)}`;
  next();
});

app.use('/', indexRoutes);

app.get('/health', (req, res) => {
  const ready = mongoose.connection.readyState === 1;
  res.status(ready ? 200 : 503).json({ status: ready ? 'ok' : 'unavailable', uptime: Math.floor(process.uptime()) });
});

app.use((req, res) => {
  res.status(404).render('error', {
    title: 'Page Not Found',
    message: 'The page you are looking for does not exist.'
  });
});

app.use((error, req, res, next) => {
  console.error(error.stack || error);
  if (res.headersSent) return next(error);
  if (req.path.startsWith('/api/')) return res.status(500).json({ error: 'Internal server error.' });
  res.status(500).render('error', { title: 'Something Went Wrong', message: 'Please try again in a moment.' });
});

let server;
const start = async () => {
  try {
    await connectDB();
    resolveMongoClient(mongoose.connection.getClient());
    server = app.listen(PORT, () => console.log(`Ahmedabad Metro app running on port ${PORT}`));
    server.on('error', error => {
      console.error(`HTTP server error: ${error.message}`);
      process.exitCode = 1;
    });
    return server;
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error.message);
    process.exitCode = 1;
    return null;
  }
};

const shutdown = signal => {
  console.log(`${signal} received; shutting down.`);
  const forceExit = setTimeout(() => process.exit(1), 10000);
  forceExit.unref();
  if (!server) return mongoose.disconnect().finally(() => process.exit(process.exitCode || 0));
  server.close(() => mongoose.disconnect().finally(() => process.exit(0)));
};
process.once('SIGTERM', () => shutdown('SIGTERM'));
process.once('SIGINT', () => shutdown('SIGINT'));

if (require.main === module) start();

module.exports = { app, start };
