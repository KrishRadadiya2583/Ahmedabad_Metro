const User = require('../models/User');
const FareRequest = require('../models/FareRequest');

const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) return req.session.destroy(() => res.redirect('/'));
    const [totalTickets, activeTickets, totalSpent] = await Promise.all([
      FareRequest.countDocuments({ user: user._id, status: 'paid' }),
      FareRequest.countDocuments({ user: user._id, status: 'paid', expiresAt: { $gt: new Date() } }),
      FareRequest.aggregate([{ $match: { user: user._id, status: 'paid' } }, { $group: { _id: null, value: { $sum: '$totalPrice' } } }])
    ]);
    res.render('profile', { title: 'My Profile', user, totalTickets, activeTickets, totalSpent: totalSpent[0]?.value || 0, success: req.query.updated === '1', error: req.query.error === 'name' ? 'Name must be between 2 and 80 characters.' : null });
  } catch (error) { next(error); }
};

const postProfile = async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    if (name.length < 2 || name.length > 80) return res.redirect('/profile?error=name');
    await User.findByIdAndUpdate(req.session.userId, { name });
    req.session.userName = name;
    res.redirect(303, '/profile?updated=1');
  } catch (error) { next(error); }
};

module.exports = {
  getProfile,
  postProfile
};
