const mongoose = require('mongoose');

const fareRequestSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  startStation: { type: String, required: true },
  endStation: { type: String, required: true },
  paymentMethod: { type: String, default: 'razorpay' },
  distance: { type: Number, required: true },
  basePrice: { type: Number, required: true },
  totalPrice: { type: Number, required: true },
  discountApplied: { type: Boolean, default: false },
  status: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending', index: true },
  razorpayOrderId: { type: String, index: true },
  razorpayPaymentId: { type: String },
  paidAt: { type: Date },
  expiresAt: { type: Date, index: true },
  emailSentAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

fareRequestSchema.index({ user: 1, status: 1, paidAt: -1 });
fareRequestSchema.index({ user: 1, razorpayOrderId: 1, status: 1 });

module.exports = mongoose.model('FareRequest', fareRequestSchema);
