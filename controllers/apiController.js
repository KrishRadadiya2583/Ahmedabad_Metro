const crypto = require('crypto');
const FareRequest = require('../models/FareRequest');
const metroStationLocations = require('../data/metroStationLocations');
const { calculateFare } = require('../data/stations');
const { normalizeNearbyStations } = require('../services/nearbyStations');
const { paymentConfigured, getRazorpayClient } = require('../services/paymentGateway');
const { ticketMinutes, deliverTicketEmail } = require('../services/ticketDelivery');
const { fetchOverpass } = require('../services/overpass');
const { formatStation } = require('../utils/stations');

const getApiNearbyStations = async (req, res) => {
  const latitude = Number(req.query.lat);
  const longitude = Number(req.query.lon);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return res.status(400).json({ error: 'Valid latitude and longitude are required.' });
  }
  const stations = normalizeNearbyStations(metroStationLocations, latitude, longitude);
  res.set('Cache-Control', 'no-store, max-age=0');
  res.json({ origin: { latitude, longitude }, stations });
};

const getApiMetroMap = async (req, res) => {
  const bounds = '22.95,72.43,23.35,72.78';
  const query = `[out:json][timeout:30];(
    relation["route"~"subway|light_rail"](${bounds});
    way["railway"~"subway|light_rail"](${bounds});
    node["railway"="station"]["station"~"subway|light_rail"](${bounds});
    node["railway"~"station|halt"]["network"~"Ahmedabad|Gujarat Metro|GMRC",i](${bounds});
  );out body geom;`;
  try {
    res.json(await fetchOverpass(query));
  } catch (error) {
    console.error('Metro map lookup failed:', error.message);
    res.status(502).json({ error: 'Map data service is temporarily unavailable.' });
  }
};

const postApiPaymentOrder = async (req, res) => {
  try {
    if (!paymentConfigured()) return res.status(503).json({ error: 'Razorpay test keys are not configured yet.' });
    const { startStation, endStation } = req.body;
    const result = calculateFare(startStation, endStation);
    if (!result.valid) return res.status(400).json({ error: result.message });
    const order = await getRazorpayClient().orders.create({ amount: Math.round(result.totalPrice * 100), currency: 'INR', receipt: `metro_${Date.now()}` });
    await FareRequest.create({ user: req.session.userId, startStation: formatStation(startStation), endStation: formatStation(endStation), distance: result.distance, basePrice: result.basePrice, totalPrice: result.totalPrice, discountApplied: result.discountApplied, razorpayOrderId: order.id });
    res.json({ orderId: order.id, amount: order.amount, currency: order.currency, keyId: process.env.RAZORPAY_KEY_ID, user: { name: req.user.name, email: req.user.email } });
  } catch (error) { console.error('Razorpay order error:', error.message); res.status(500).json({ error: 'Could not start payment. Please try again.' }); }
};

const postApiPaymentVerify = async (req, res) => {
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
};

const useApi = (req, res) => res.status(404).json({ error: 'API endpoint not found.' });

module.exports = {
  getApiNearbyStations,
  getApiMetroMap,
  postApiPaymentOrder,
  postApiPaymentVerify,
  useApi
};
