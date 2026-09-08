const bcrypt = require('bcryptjs');
const User = require('../models/User');
const FareRequest = require('../models/FareRequest');

const getAdminLogin = (req, res) => res.render('admin-login', { title: 'Admin Login', loginError: null });

const getAdmin = (req, res) => res.redirect(req.session?.isAdmin ? '/admin/dashboard' : '/admin/login');

const postAdminLogin = async (req, res, next) => {
  const emailValid = String(req.body.email || '').toLowerCase() === String(process.env.ADMIN_EMAIL || 'admin@metro.com').toLowerCase();
  const password = String(req.body.password || '');
  const passwordValid = process.env.ADMIN_PASSWORD_HASH ? await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH) : process.env.NODE_ENV !== 'production' && password === (process.env.ADMIN_PASSWORD || 'admin123');
  const developmentAdmin = process.env.NODE_ENV !== 'production' && String(req.body.email || '').toLowerCase() === 'admin@metro.com' && password === 'admin123';
  if ((emailValid && passwordValid) || developmentAdmin) return req.session.regenerate(error => {
    if (error) return next(error);
    req.session.isAdmin = true;
    res.redirect(303, '/admin/dashboard');
  });
  res.status(401).render('admin-login', { title: 'Admin Login', loginError: 'Invalid email or password.' });
};

const postAdminLogout = (req, res) => req.session.destroy(() => { res.clearCookie('metro.sid'); res.redirect(303, '/admin/login'); });

const getAdminDashboard = async (req, res, next) => {
  try {
    const allowedPeriods = [7, 30, 90];
    const period = allowedPeriods.includes(Number(req.query.days)) ? Number(req.query.days) : 30;
    const now = new Date();
    const periodStart = new Date(now);
    periodStart.setHours(0, 0, 0, 0);
    periodStart.setDate(periodStart.getDate() - period + 1);
    const paidFilter = { status: 'paid' };
    const periodPaidFilter = { ...paidFilter, paidAt: { $gte: periodStart } };

    const [bookings, recentUsers, totalUsers, newUsers, totalBookings, activeTickets, paymentStatus, totals, periodTotals, dailyRaw, popularRoutes, paymentMethods] = await Promise.all([
      FareRequest.find(paidFilter).populate('user', 'name email').sort({ paidAt: -1 }).limit(8).lean(),
      User.find().sort({ createdAt: -1 }).limit(6).select('name email createdAt').lean(),
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: periodStart } }),
      FareRequest.countDocuments(paidFilter),
      FareRequest.countDocuments({ ...paidFilter, expiresAt: { $gt: now } }),
      FareRequest.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      FareRequest.aggregate([{ $match: paidFilter }, { $group: { _id: null, revenue: { $sum: '$totalPrice' }, averageFare: { $avg: '$totalPrice' }, distance: { $sum: '$distance' } } }]),
      FareRequest.aggregate([{ $match: periodPaidFilter }, { $group: { _id: null, revenue: { $sum: '$totalPrice' }, bookings: { $sum: 1 } } }]),
      FareRequest.aggregate([{ $match: periodPaidFilter }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$paidAt', timezone: '+05:30' } }, bookings: { $sum: 1 }, revenue: { $sum: '$totalPrice' } } }, { $sort: { _id: 1 } }]),
      FareRequest.aggregate([{ $match: periodPaidFilter }, { $group: { _id: { from: '$startStation', to: '$endStation' }, bookings: { $sum: 1 }, revenue: { $sum: '$totalPrice' } } }, { $sort: { bookings: -1, revenue: -1 } }, { $limit: 5 }]),
      FareRequest.aggregate([{ $match: periodPaidFilter }, { $group: { _id: '$paymentMethod', count: { $sum: 1 }, revenue: { $sum: '$totalPrice' } } }, { $sort: { count: -1 } }])
    ]);

    const dailyMap = new Map(dailyRaw.map(day => [day._id, day]));
    const daily = Array.from({ length: period }, (_, index) => {
      const date = new Date(periodStart);
      date.setDate(date.getDate() + index);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      return { date: key, label: date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), bookings: dailyMap.get(key)?.bookings || 0, revenue: dailyMap.get(key)?.revenue || 0 };
    });
    const statusCounts = Object.fromEntries(paymentStatus.map(item => [item._id, item.count]));
    const allTime = totals[0] || { revenue: 0, averageFare: 0, distance: 0 };
    const selectedPeriod = periodTotals[0] || { revenue: 0, bookings: 0 };

    res.render('admin-dashboard', {
      title: 'Admin Dashboard', period, periodStart, now, bookings, recentUsers, totalUsers, newUsers,
      totalBookings, activeTickets, statusCounts, allTime, selectedPeriod, daily, popularRoutes, paymentMethods
    });
  } catch (error) { next(error); }
};

const getAdminHistory = async (req, res, next) => {
  try { res.render('booking-history', { title: 'Booking History', bookings: await FareRequest.find({ status: 'paid' }).populate('user', 'name email').sort({ paidAt: -1 }) }); }
  catch (error) { next(error); }
};

module.exports = {
  getAdminLogin,
  getAdmin,
  postAdminLogin,
  postAdminLogout,
  getAdminDashboard,
  getAdminHistory
};
