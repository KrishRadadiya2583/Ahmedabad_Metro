const crypto = require('crypto');
const express = require('express');
const bcrypt = require('bcryptjs');
const Razorpay = require('razorpay');
const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');
const mongoose = require('mongoose');
const { sendTicketEmail } = require('../services/mailer');
const User = require('../models/User');
const FareRequest = require('../models/FareRequest');
const { requireUser, requireGuest, requireAdmin, requireAdminGuest } = require('../middleware/auth');
const { sectionMap, calculateFare, getJourneyDetails, getEdgeDistance, getLineDistance, lines, allStations } = require('../data/stations');
const router = express.Router();

const attempts = new Map();
const loginLimiter = (req, res, next) => {
  const now = Date.now();
  const key = req.ip;
  const entry = attempts.get(key) || { count: 0, resetAt: now + 15 * 60 * 1000 };
  if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + 15 * 60 * 1000; }
  entry.count += 1; attempts.set(key, entry);
  if (entry.count > 20) return res.status(429).render('error', { title: 'Too Many Attempts', message: 'Please wait 15 minutes before trying again.' });
  next();
};
setInterval(() => { const now = Date.now(); for (const [key, entry] of attempts) if (now > entry.resetAt) attempts.delete(key); }, 15 * 60 * 1000).unref();

const formatStation = value => String(value || '').replace(/_/g, ' ');
allStations.sort();
const ticketMinutes = () => Math.max(1, Number(process.env.TICKET_VALID_MINUTES || 180));
const paymentConfigured = () => Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
let razorpayClient;
const getRazorpayClient = () => {
  if (!razorpayClient) razorpayClient = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
  return razorpayClient;
};
const deliverTicketEmail = (user, ticket) => {
  setImmediate(async () => {
    try {
      if (await sendTicketEmail({ user, ticket })) await FareRequest.updateOne({ _id: ticket._id, emailSentAt: null }, { $set: { emailSentAt: new Date() } });
    } catch (error) { console.error('Ticket email failed:', error.message); }
  });
};
const renderLanding = (res, options = {}) => res.render('index', {
  title: 'Welcome', authError: null, authMode: 'login', values: {}, routeLines: lines, ...options
});

router.get('/', (req, res) => req.session?.userId ? res.redirect('/dashboard') : renderLanding(res));
router.get('/privacy', (req, res) => res.render('privacy', { title: 'Privacy Policy' }));
router.get('/contact', (req, res) => res.render('contact', { title: 'Contact Us' }));
router.get('/dashboard', requireUser, (req, res) => res.redirect('/fare'));
router.get('/route', requireUser, (req, res) => res.render('route', {
  title: 'Metro Route', routeLines: lines,
  lineDetails: lines.map(line => ({
    name: line.name, color: line.color, phase: line.phase,
    from: formatStation(line.stations[0]), to: formatStation(line.stations.at(-1)),
    stationCount: line.stations.length, distance: getLineDistance(line.stations),
    segments: line.stations.slice(0, -1).map((station, index) => getEdgeDistance(station, line.stations[index + 1]))
  }))
}));
router.get('/news', requireUser, (req, res) => res.render('news', {
  title: 'News & Stories',
  newsItems: [
    { date: '18 Jun 2026', tag: 'Project', title: 'Phase 2A approved for airport connectivity', summary: 'The approved 6.032 km corridor will connect Koteshwar Road with Sardar Vallabhbhai Patel International Airport through five stations.', url: 'https://www.gujaratmetrorail.com/gmrc-in-news/cabinet-nod-for-rs-2169-crore-phase-2a-of-ahmedabad-metro-rail-project/' },
    { date: '18 May 2026', tag: 'Service', title: 'Updated Ahmedabad–Gandhinagar timetable', summary: 'GMRC published revised frequency, first and last train, travel-time and timetable information for the combined network.', url: 'https://www.gujaratmetrorail.com/ahmedabad/train-information/' },
    { date: '11 Jan 2026', tag: 'Milestone', title: 'Phase 2 fully commissioned to Mahatma Mandir', summary: 'The final Phase 2 section opened, completing the connection from Ahmedabad through Gandhinagar to Mahatma Mandir.', url: 'https://www.gujaratmetrorail.com/milestones2/' },
    { date: '2026', tag: 'Expansion', title: 'Planning advances for GIFT City and western extensions', summary: 'Consultancy and construction activity covers the GIFT City extension, airport line and the corridor beyond Thaltej Gam.', url: 'https://www.gujaratmetrorail.com/tenders/' }
  ]
}));
router.get('/nearest-station', requireUser, (req, res) => res.render('nearest-station', { title: 'Nearest Station' }));
router.get('/timetable', requireUser, (req, res) => res.render('timetable', {
  title: 'Metro Timetable',
  timetable: [
    { line: 'Blue Line', route: 'Vastral Gam → Thaltej Gam', first: '06:20', last: '23:00', peak: 'Every 7 min', regular: 'Every 10–20 min', className: 'blue' },
    { line: 'Blue Line', route: 'Thaltej Gam → Vastral Gam', first: '06:20', last: '23:00', peak: 'Every 7 min', regular: 'Every 10–20 min', className: 'blue' },
    { line: 'Red Line', route: 'APMC → Koteshwar Road', first: '06:20', last: '23:10', peak: 'Every 12 min', regular: 'Every 20 min after 22:00', className: 'red' },
    { line: 'Red Line', route: 'Koteshwar Road → APMC', first: '06:16', last: '23:00', peak: 'Every 12 min', regular: 'Every 20 min after 22:00', className: 'red' },
    { line: 'Phase 2', route: 'Koteshwar Road → Mahatma Mandir', first: '06:55', last: '21:20', peak: 'Average 24 min', regular: 'Average 40 min early morning', className: 'yellow' },
    { line: 'Phase 2', route: 'Mahatma Mandir → Koteshwar Road', first: '06:40', last: '21:00', peak: 'Average 24 min', regular: 'Average 40 min early morning', className: 'yellow' },
    { line: 'GIFT Branch', route: 'GNLU → GIFT City', first: '07:36', last: '18:57', peak: 'Average 49–57 min', regular: 'Bus link: 10:18–16:06', className: 'purple' },
    { line: 'GIFT Branch', route: 'GIFT City → GNLU', first: '07:48', last: '19:13', peak: 'Average 49–57 min', regular: 'Bus link: 10:18–16:06', className: 'purple' }
  ]
}));
router.get('/section/:id', requireUser, (req, res) => {
  const section = sectionMap[Number(req.params.id)];
  if (!section) return res.status(404).render('error', { title: 'Section Not Found', message: 'The selected section does not exist.' });
  res.render('section', { title: `Section ${req.params.id}`, section, formattedStations: section.stations.map(formatStation) });
});

router.get('/register', (req, res) => res.redirect(req.session?.userId ? '/dashboard' : '/#register'));
router.post('/register', loginLimiter, requireGuest, async (req, res, next) => {
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
});
router.get('/login', (req, res) => res.redirect(req.session?.userId ? '/dashboard' : '/#login'));
router.post('/login', loginLimiter, requireGuest, async (req, res, next) => {
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
});
router.post('/logout', requireUser, (req, res) => req.session.destroy(() => { res.clearCookie('metro.sid'); res.redirect(303, '/'); }));

router.get('/profile', requireUser, async (req, res, next) => {
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
});
router.post('/profile', requireUser, async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    if (name.length < 2 || name.length > 80) return res.redirect('/profile?error=name');
    await User.findByIdAndUpdate(req.session.userId, { name });
    req.session.userName = name;
    res.redirect(303, '/profile?updated=1');
  } catch (error) { next(error); }
});

router.get('/fare', requireUser, (req, res) => res.render('fare', { title: 'Buy Ticket', allStations, result: null, query: {}, paymentConfigured: paymentConfigured() }));
router.post('/fare', requireUser, (req, res) => {
  const { startStation, endStation } = req.body;
  const result = calculateFare(startStation, endStation);
  res.status(result.valid ? 200 : 400).render('fare', { title: 'Confirm Ticket', allStations, result, query: { startStation, endStation }, paymentConfigured: paymentConfigured() });
});

router.post('/api/payment/order', requireUser, async (req, res) => {
  try {
    if (!paymentConfigured()) return res.status(503).json({ error: 'Razorpay test keys are not configured yet.' });
    const { startStation, endStation } = req.body;
    const result = calculateFare(startStation, endStation);
    if (!result.valid) return res.status(400).json({ error: result.message });
    const order = await getRazorpayClient().orders.create({ amount: Math.round(result.totalPrice * 100), currency: 'INR', receipt: `metro_${Date.now()}` });
    await FareRequest.create({ user: req.session.userId, startStation: formatStation(startStation), endStation: formatStation(endStation), distance: result.distance, basePrice: result.basePrice, totalPrice: result.totalPrice, discountApplied: result.discountApplied, razorpayOrderId: order.id });
    res.json({ orderId: order.id, amount: order.amount, currency: order.currency, keyId: process.env.RAZORPAY_KEY_ID, user: { name: req.user.name, email: req.user.email } });
  } catch (error) { console.error('Razorpay order error:', error.message); res.status(500).json({ error: 'Could not start payment. Please try again.' }); }
});

router.post('/api/payment/verify', requireUser, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '').update(`${razorpay_order_id}|${razorpay_payment_id}`).digest('hex');
    const valid = razorpay_signature && expected.length === razorpay_signature.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(razorpay_signature));
    if (!valid) { await FareRequest.updateOne({ razorpayOrderId: razorpay_order_id, user: req.session.userId }, { status: 'failed' }); return res.status(400).json({ error: 'Payment verification failed.' }); }
    const now = new Date();
    let ticket = await FareRequest.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id, user: req.session.userId, status: 'pending' },
      { status: 'paid', razorpayPaymentId: razorpay_payment_id, paidAt: now, expiresAt: new Date(now.getTime() + ticketMinutes() * 60000) }, { new: true }
    );
    const ticketWasCreated = Boolean(ticket);
    if (!ticket) ticket = await FareRequest.findOne({ razorpayOrderId: razorpay_order_id, razorpayPaymentId: razorpay_payment_id, user: req.session.userId, status: 'paid' });
    if (!ticket) return res.status(409).json({ error: 'Ticket was already processed or was not found.' });
    res.json({ success: true, redirectUrl: `/tickets/${ticket._id}` });
    if (ticketWasCreated) deliverTicketEmail(req.user, ticket);
  } catch (error) { console.error('Payment verification error:', error.message); res.status(500).json({ error: 'Could not verify payment.' }); }
});

router.get('/tickets', requireUser, async (req, res, next) => {
  try { res.render('my-tickets', { title: 'My Tickets', tickets: await FareRequest.find({ user: req.session.userId, status: 'paid' }).sort({ paidAt: -1 }), now: new Date() }); }
  catch (error) { next(error); }
});
router.get('/tickets/:id/download', requireUser, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).render('error', { title: 'Ticket Not Found', message: 'The requested ticket ID is invalid.' });
    const ticket = await FareRequest.findOne({ _id: req.params.id, user: req.session.userId, status: 'paid' });
    if (!ticket) return res.status(404).render('error', { title: 'Ticket Not Found', message: 'This ticket does not exist or does not belong to you.' });
    const routeDetails = getJourneyDetails(ticket.startStation, ticket.endStation);
    const qrPayload = JSON.stringify({ ticketId: ticket._id.toString(), paymentId: ticket.razorpayPaymentId, from: ticket.startStation, to: ticket.endStation, expiresAt: ticket.expiresAt.toISOString() });
    const qrImage = await QRCode.toBuffer(qrPayload, { width: 320, margin: 2, errorCorrectionLevel: 'M' });
    const code = ticket._id.toString().slice(-8).toUpperCase();
    const document = new PDFDocument({ size: 'A4', margin: 46, info: { Title: `Ahmedabad Metro Ticket #${code}`, Author: 'Ahmedabad Metro' } });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="metro-ticket-${code}.pdf"`);
    document.pipe(res);

    document.rect(0, 0, document.page.width, 112).fill('#0d4fa3');
    document.fillColor('#ffffff').fontSize(26).font('Helvetica-Bold').text('Ahmedabad Metro', 46, 35);
    document.fontSize(12).font('Helvetica').text('Digital journey ticket', 46, 72);
    document.fillColor('#147746').roundedRect(46, 130, 132, 26, 13).fill('#e5f8ee');
    document.fillColor('#147746').fontSize(11).font('Helvetica-Bold').text('TICKET CONFIRMED', 58, 138);
    document.fillColor('#14243a').fontSize(22).text(`Ticket #${code}`, 46, 178);

    document.roundedRect(46, 218, 503, 76, 10).fill('#f2f7fc');
    document.fillColor('#66778c').fontSize(9).text('FROM', 64, 235).text('TO', 320, 235);
    document.fillColor('#0d4fa3').fontSize(16).font('Helvetica-Bold').text(formatStation(ticket.startStation), 64, 252, { width: 205 }).text(formatStation(ticket.endStation), 320, 252, { width: 205 });

    document.image(qrImage, 198, 314, { width: 200 });
    document.fillColor('#0b8f76').fontSize(10).text('SCAN AT ENTRY AND EXIT GATES', 0, 520, { align: 'center' });

    const detailsTop = 552;
    document.fillColor('#14243a').fontSize(11).font('Helvetica-Bold');
    document.text('Passenger', 46, detailsTop).text('Fare paid', 220, detailsTop).text('Distance', 390, detailsTop);
    document.font('Helvetica').fontSize(11).text(String(req.user.name), 46, detailsTop + 17, { width: 150 }).text(`Rs. ${ticket.totalPrice}`, 220, detailsTop + 17).text(`${Number(ticket.distance).toFixed(2)} km`, 390, detailsTop + 17);
    document.font('Helvetica-Bold').text('Purchased', 46, detailsTop + 52).text('Valid until', 220, detailsTop + 52).text('Payment ID', 390, detailsTop + 52);
    document.font('Helvetica').fontSize(9).text(ticket.paidAt.toLocaleString('en-IN'), 46, detailsTop + 69, { width: 155 }).text(ticket.expiresAt.toLocaleString('en-IN'), 220, detailsTop + 69, { width: 155 }).text(String(ticket.razorpayPaymentId), 390, detailsTop + 69, { width: 155 });

    document.addPage();
    document.fillColor('#0d4fa3').fontSize(20).font('Helvetica-Bold').text('Route instructions');
    document.moveDown(0.7).fillColor('#14243a').fontSize(11).font('Helvetica');
    if (routeDetails.interchanges.length) {
      routeDetails.interchanges.forEach(change => document.text(`Change at ${formatStation(change.station)}: ${change.fromLine} to ${change.toLine}`, { bullet: true }));
    } else {
      document.text('Direct train - no interchange required.', { bullet: true });
    }
    document.moveDown().font('Helvetica-Bold').fontSize(15).text('All stations');
    document.moveDown(0.4).font('Helvetica').fontSize(9).text(routeDetails.journey.map((station, index) => `${index + 1}. ${formatStation(station)}`).join('\n'), { columns: 2, columnGap: 24 });
    document.moveDown().fillColor('#66778c').fontSize(9).text('Valid only for the selected origin, destination and passenger. Keep this ticket available until your journey is complete.');
    document.end();
  } catch (error) { next(error); }
});
router.get('/tickets/:id', requireUser, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).render('error', { title: 'Ticket Not Found', message: 'The requested ticket ID is invalid.' });
    const ticket = await FareRequest.findOne({ _id: req.params.id, user: req.session.userId, status: 'paid' });
    if (!ticket) return res.status(404).render('error', { title: 'Ticket Not Found', message: 'This ticket does not exist or does not belong to you.' });
    const qrPayload = JSON.stringify({ ticketId: ticket._id.toString(), paymentId: ticket.razorpayPaymentId, from: ticket.startStation, to: ticket.endStation, expiresAt: ticket.expiresAt.toISOString() });
    const qrCode = await QRCode.toDataURL(qrPayload, { width: 280, margin: 2, errorCorrectionLevel: 'M' });
    res.render('ticket', { title: 'Ticket', ticket, expired: new Date() >= ticket.expiresAt, qrCode, routeDetails: getJourneyDetails(ticket.startStation, ticket.endStation) });
  } catch (error) { next(error); }
});

router.get('/admin/login', requireAdminGuest, (req, res) => res.render('admin-login', { title: 'Admin Login', loginError: null }));
router.get('/admin', (req, res) => res.redirect(req.session?.isAdmin ? '/admin/dashboard' : '/admin/login'));
router.post('/admin/login', loginLimiter, requireAdminGuest, async (req, res, next) => {
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
});
router.post('/admin/logout', requireAdmin, (req, res) => req.session.destroy(() => { res.clearCookie('metro.sid'); res.redirect(303, '/admin/login'); }));
router.get('/admin/dashboard', requireAdmin, async (req, res, next) => {
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
});
router.get('/admin/history', requireAdmin, async (req, res, next) => {
  try { res.render('booking-history', { title: 'Booking History', bookings: await FareRequest.find({ status: 'paid' }).populate('user', 'name email').sort({ paidAt: -1 }) }); }
  catch (error) { next(error); }
});

router.use('/api', (req, res) => res.status(404).json({ error: 'API endpoint not found.' }));

module.exports = router;
