const mongoose = require('mongoose');
const { config } = require('./env');

const connectDB = async () => {
  try {
    await mongoose.connect(config.mongoUrl, {
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 20,
      minPoolSize: config.isProduction ? 2 : 0
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    throw error;
  }
};

module.exports = connectDB;
