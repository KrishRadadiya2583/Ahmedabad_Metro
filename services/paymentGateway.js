const Razorpay = require('razorpay');

let razorpayClient;

const paymentConfigured = () => Boolean(
  process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
);

const getRazorpayClient = () => {
  if (!paymentConfigured()) throw new Error('Razorpay credentials are not configured.');
  if (!razorpayClient) {
    razorpayClient = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });
  }
  return razorpayClient;
};

module.exports = { paymentConfigured, getRazorpayClient };
