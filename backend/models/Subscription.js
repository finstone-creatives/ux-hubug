const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  plan: {
    type: String,
    enum: ['monthly', 'yearly'],
    default: 'monthly',
  },
  status: {
    type: String,
    enum: ['active', 'cancelled', 'expired', 'pending', 'failed'],
    default: 'pending',
  },
  paymentMethod: {
    type: String,
    enum: ['stripe', 'mtn_momo', 'airtel_money', 'card'],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    default: 'USD',
  },
  // Stripe
  stripePaymentIntentId: {
    type: String,
    default: null,
  },
  stripeSubscriptionId: {
    type: String,
    default: null,
  },
  // MTN MoMo
  mtnReferenceId: {
    type: String,
    default: null,
  },
  // Airtel
  airtelTransactionId: {
    type: String,
    default: null,
  },
  // Phone for mobile money
  phoneNumber: {
    type: String,
    default: null,
  },
  startDate: {
    type: Date,
    default: Date.now,
  },
  endDate: {
    type: Date,
    default: null,
  },
  autoRenew: {
    type: Boolean,
    default: false,
  },
  transactionRef: {
    type: String,
    unique: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('Subscription', subscriptionSchema);
