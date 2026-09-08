const { config } = require('../config/env');

const viewLocals = (req, res, next) => {
  res.locals.appName = 'Ahmedabad Metro';
  res.locals.isAdmin = Boolean(req.session && req.session.isAdmin);
  res.locals.currentUser = req.session?.userId ? { id: req.session.userId, name: req.session.userName } : null;
  res.locals.supportEmail = process.env.SUPPORT_EMAIL || process.env.EMAIL_USER || 'support@ahmedabadmetro.app';
  res.locals.assetUrl = fileName => config.imagekitUrlEndpoint
    ? `${config.imagekitUrlEndpoint}/ahmedabad-metro/${encodeURIComponent(fileName)}`
    : `/${encodeURIComponent(fileName)}`;
  next();
};

module.exports = { viewLocals };
