const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const indexRoutes = require('./routes');
const { config, validateEnvironment } = require('./config/env');
const { createSessionMiddleware } = require('./config/session');
const { securityHeaders, sameOrigin } = require('./middleware/security');
const { viewLocals } = require('./middleware/viewLocals');
const { notFound, errorHandler } = require('./middleware/errors');

const createApp = ({ mongoClientPromise } = {}) => {
  validateEnvironment();
  const app = express();

  if (config.isProduction) app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));

  app.use(securityHeaders);
  app.use(express.urlencoded({ extended: false, limit: '32kb' }));
  app.use(express.json({ limit: '32kb' }));
  app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: config.isProduction ? '7d' : 0,
    etag: true
  }));
  app.use(sameOrigin);
  app.use(createSessionMiddleware(mongoClientPromise));
  app.use(viewLocals);
  app.use('/', indexRoutes);

  app.get('/health', (req, res) => {
    const ready = mongoose.connection.readyState === 1;
    res.status(ready ? 200 : 503).json({
      status: ready ? 'ok' : 'unavailable',
      uptime: Math.floor(process.uptime())
    });
  });

  app.use(notFound);
  app.use(errorHandler);
  return app;
};

module.exports = { createApp };
