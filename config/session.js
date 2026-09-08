const session = require('express-session');
const { MongoStore } = require('connect-mongo');
const { config } = require('./env');

const createSessionMiddleware = mongoClientPromise => {
  if (!mongoClientPromise) throw new Error('A MongoDB client promise is required for sessions.');
  return session({
    name: 'metro.sid',
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    unset: 'destroy',
    rolling: true,
    store: MongoStore.create({
      clientPromise: mongoClientPromise,
      ttl: 60 * 60 * 8,
      autoRemove: 'native'
    }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 8,
      httpOnly: true,
      sameSite: 'lax',
      secure: config.isProduction,
      path: '/'
    }
  });
};

module.exports = { createSessionMiddleware };
