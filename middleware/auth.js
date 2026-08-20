const User = require('../models/User');

const wantsJson = req => req.originalUrl.startsWith('/api/');

const requireUser = async (req, res, next) => {
  try {
    if (!req.session?.userId) {
      if (wantsJson(req)) return res.status(401).json({ error: 'Authentication required.' });
      req.session.returnTo = req.originalUrl;
      return res.redirect('/#login');
    }
    const user = await User.findById(req.session.userId).select('name email createdAt');
    if (!user) {
      return req.session.destroy(() => wantsJson(req)
        ? res.status(401).json({ error: 'Session is no longer valid.' })
        : res.redirect('/#login'));
    }
    req.user = user;
    res.locals.currentUser = { id: user._id.toString(), name: user.name, email: user.email };
    next();
  } catch (error) { next(error); }
};

const requireGuest = (req, res, next) => req.session?.userId ? res.redirect('/dashboard') : next();

const requireAdmin = (req, res, next) => {
  if (req.session?.isAdmin === true) return next();
  if (wantsJson(req)) return res.status(403).json({ error: 'Administrator access required.' });
  return res.redirect('/admin/login');
};

const requireAdminGuest = (req, res, next) => req.session?.isAdmin ? res.redirect('/admin/dashboard') : next();

module.exports = { requireUser, requireGuest, requireAdmin, requireAdminGuest };
