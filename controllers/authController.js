const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { lines } = require('../data/stations');

const renderLanding = (res, options = {}) => res.render('index', {
  title: 'Welcome', authError: null, authMode: 'login', values: {}, routeLines: lines, ...options
});

const getRegister = (req, res) => res.redirect(req.session?.userId ? '/dashboard' : '/#register');

const postRegister = async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (!name || !/^\S+@\S+\.\S+$/.test(email) || password.length < 8) return renderLanding(res.status(400), { authError: 'Enter a name, valid email, and password of at least 8 characters.', authMode: 'register', values: { name, email } });
    if (await User.exists({ email })) return renderLanding(res.status(409), { authError: 'An account with this email already exists.', authMode: 'register', values: { name, email } });
    const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 12) });
    req.session.regenerate(error => {
      if (error) return next(error);
      req.session.userId = user._id.toString(); req.session.userName = user.name;
      res.redirect(303, '/dashboard');
    });
  } catch (error) { next(error); }
};

const getLogin = (req, res) => res.redirect(req.session?.userId ? '/dashboard' : '/#login');

const postLogin = async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const user = await User.findOne({ email });
    if (!user || !await bcrypt.compare(String(req.body.password || ''), user.passwordHash)) return renderLanding(res.status(401), { authError: 'Invalid email or password.', authMode: 'login', values: { email } });
    const destination = String(req.session.returnTo || '/dashboard'); delete req.session.returnTo;
    req.session.regenerate(error => {
      if (error) return next(error);
      req.session.userId = user._id.toString(); req.session.userName = user.name;
      res.redirect(303, destination.startsWith('/') && !destination.startsWith('//') ? destination : '/dashboard');
    });
  } catch (error) { next(error); }
};

const postLogout = (req, res) => req.session.destroy(() => { res.clearCookie('metro.sid'); res.redirect(303, '/'); });

module.exports = {
  getRegister,
  postRegister,
  getLogin,
  postLogin,
  postLogout
};
