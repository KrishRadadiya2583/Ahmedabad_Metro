require('dotenv').config();
const mongoose = require('mongoose');
const { createApp } = require('./app');
const connectDB = require('./config/db');
const { config } = require('./config/env');

let resolveMongoClient;
const mongoClientPromise = new Promise(resolve => { resolveMongoClient = resolve; });
const app = createApp({ mongoClientPromise });
let server;

const start = async () => {
  try {
    await connectDB();
    resolveMongoClient(mongoose.connection.getClient());
    server = app.listen(config.port, () => console.log(`Ahmedabad Metro app running on port ${config.port}`));
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
