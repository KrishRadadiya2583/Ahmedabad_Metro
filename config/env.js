const isProduction = process.env.NODE_ENV === 'production';

const firstDefined = (...values) => values.find(value => typeof value === 'string' && value.trim());

const config = {
  isProduction,
  port: Number(process.env.PORT || 3000),
  mongoUrl: firstDefined(process.env.MONGO_URL, process.env.MONGO_URI) || 'mongodb://127.0.0.1:27017/ahmedabad_metro',
  sessionSecret: process.env.SESSION_SECRET || 'change-this-development-secret',
  imagekitUrlEndpoint: firstDefined(process.env.IMAGEKIT_URL_ENDPOINT)?.replace(/\/$/, '') || ''
};

const validateEnvironment = () => {
  const errors = [];
  if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) errors.push('PORT must be a valid TCP port.');
  if (isProduction && !firstDefined(process.env.MONGO_URL, process.env.MONGO_URI)) errors.push('MONGO_URL (or MONGO_URI) is required.');
  if (isProduction && (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32)) errors.push('SESSION_SECRET must contain at least 32 characters.');
  if (isProduction && !process.env.ADMIN_PASSWORD_HASH) errors.push('ADMIN_PASSWORD_HASH is required; plaintext admin passwords are disabled in production.');
  if (errors.length) throw new Error(`Invalid environment configuration:\n- ${errors.join('\n- ')}`);
};

module.exports = { config, validateEnvironment };
