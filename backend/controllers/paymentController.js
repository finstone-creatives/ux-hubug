const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const Subscription = require('../models/Subscription');
const User = require('../models/User');

const PREMIUM_PRICE_USD = parseFloat(process.env.PREMIUM_PRICE_USD) || 9.99;
const PREMIUM_PRICE_UGX = parseInt(process.env.PREMIUM_PRICE_UGX) || 37000;

const addPremiumDays = async (userId, days = 30) => {
  const user = await User.findById(userId);
  const now = new Date();
  const currentExpiry = user.premiumExpiry && user.premiumExpiry > now ? user.premiumExpiry : now;
  const newExpiry = new Date(currentExpiry.getTime() + days * 24 * 60 * 60 * 1000);
  await User.findByIdAndUpdate(userId, { isPremium: true, premiumExpiry: newExpiry });
};

// ─── STRIPE ────────────────────────────────────────────────────────────────────

exports.createStripeIntent = async (req, res) => {
  try {
    const { plan } = req.body; // monthly | yearly
    const amount = plan === 'yearly' ? Math.round(PREMIUM_PRICE_USD * 10 * 100) : Math.round(PREMIUM_PRICE_USD * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      metadata: { userId: req.user.id, plan },
    });

    res.json({ success: true, clientSecret: paymentIntent.client_secret, amount });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.confirmStripePayment = async (req, res) => {
  try {
    const { paymentIntentId, plan } = req.body;
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (intent.status !== 'succeeded') {
      return res.status(400).json({ success: false, message: 'Payment not completed.' });
    }

    const days = plan === 'yearly' ? 365 : 30;
    const amount = intent.amount / 100;

    const sub = await Subscription.create({
      user: req.user.id,
      plan,
      status: 'active',
      paymentMethod: 'stripe',
      amount,
      currency: 'USD',
      stripePaymentIntentId: paymentIntentId,
      startDate: Date.now(),
      endDate: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
      transactionRef: uuidv4(),
    });

    await addPremiumDays(req.user.id, days);

    res.json({ success: true, message: 'Premium activated!', subscription: sub });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── MTN MOBILE MONEY ──────────────────────────────────────────────────────────

const getMtnToken = async () => {
  const response = await axios.post(
    `${process.env.MTN_BASE_URL}/collection/token/`,
    {},
    {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${process.env.MTN_API_USER}:${process.env.MTN_API_KEY}`).toString('base64')}`,
        'Ocp-Apim-Subscription-Key': process.env.MTN_COLLECTION_SUBSCRIPTION_KEY,
      },
    }
  );
  return response.data.access_token;
};

exports.requestMtnPayment = async (req, res) => {
  try {
    const { phoneNumber, plan } = req.body;
    const amount = PREMIUM_PRICE_UGX;
    const referenceId = uuidv4();
    const token = await getMtnToken();

    await axios.post(
      `${process.env.MTN_BASE_URL}/collection/v1_0/requesttopay`,
      {
        amount: String(amount),
        currency: 'UGX',
        externalId: referenceId,
        payer: { partyIdType: 'MSISDN', partyId: phoneNumber },
        payerMessage: 'UX-HUB Premium Subscription',
        payeeNote: `UX-HUB Premium - ${plan}`,
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Reference-Id': referenceId,
          'X-Target-Environment': process.env.MTN_ENVIRONMENT || 'sandbox',
          'Ocp-Apim-Subscription-Key': process.env.MTN_COLLECTION_SUBSCRIPTION_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    // Save pending subscription
    await Subscription.create({
      user: req.user.id,
      plan,
      status: 'pending',
      paymentMethod: 'mtn_momo',
      amount,
      currency: 'UGX',
      mtnReferenceId: referenceId,
      phoneNumber,
      transactionRef: referenceId,
    });

    res.json({ success: true, message: 'MTN payment request sent. Approve on your phone.', referenceId });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.verifyMtnPayment = async (req, res) => {
  try {
    const { referenceId } = req.params;
    const token = await getMtnToken();

    const response = await axios.get(
      `${process.env.MTN_BASE_URL}/collection/v1_0/requesttopay/${referenceId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Target-Environment': process.env.MTN_ENVIRONMENT || 'sandbox',
          'Ocp-Apim-Subscription-Key': process.env.MTN_COLLECTION_SUBSCRIPTION_KEY,
        },
      }
    );

    const { status } = response.data;

    if (status === 'SUCCESSFUL') {
      const sub = await Subscription.findOneAndUpdate(
        { mtnReferenceId: referenceId },
        { status: 'active', startDate: Date.now() },
        { new: true }
      );
      if (sub) {
        const days = sub.plan === 'yearly' ? 365 : 30;
        await addPremiumDays(sub.user, days);
      }
      return res.json({ success: true, message: 'Payment confirmed! Premium activated.' });
    }

    res.json({ success: false, message: `Payment status: ${status}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── AIRTEL MONEY ──────────────────────────────────────────────────────────────

const getAirtelToken = async () => {
  const response = await axios.post(
    `${process.env.AIRTEL_BASE_URL}/auth/oauth2/token`,
    {
      client_id: process.env.AIRTEL_CLIENT_ID,
      client_secret: process.env.AIRTEL_CLIENT_SECRET,
      grant_type: 'client_credentials',
    },
    { headers: { 'Content-Type': 'application/json' } }
  );
  return response.data.access_token;
};

exports.requestAirtelPayment = async (req, res) => {
  try {
    const { phoneNumber, plan } = req.body;
    const amount = PREMIUM_PRICE_UGX;
    const transactionId = uuidv4().replace(/-/g, '').substring(0, 12).toUpperCase();
    const token = await getAirtelToken();

    await axios.post(
      `${process.env.AIRTEL_BASE_URL}/merchant/v1/payments/`,
      {
        reference: `UX-HUB-${transactionId}`,
        subscriber: { country: 'UG', currency: 'UGX', msisdn: phoneNumber },
        transaction: { amount, country: 'UG', currency: 'UGX', id: transactionId },
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Country': 'UG',
          'X-Currency': 'UGX',
        },
      }
    );

    await Subscription.create({
      user: req.user.id,
      plan,
      status: 'pending',
      paymentMethod: 'airtel_money',
      amount,
      currency: 'UGX',
      airtelTransactionId: transactionId,
      phoneNumber,
      transactionRef: transactionId,
    });

    res.json({ success: true, message: 'Airtel payment request sent. Approve on your phone.', transactionId });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.verifyAirtelPayment = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const token = await getAirtelToken();

    const response = await axios.get(
      `${process.env.AIRTEL_BASE_URL}/standard/v1/payments/${transactionId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Country': 'UG',
          'X-Currency': 'UGX',
        },
      }
    );

    const txStatus = response.data?.data?.transaction?.status;

    if (txStatus === 'TS') { // TS = Transaction Successful
      const sub = await Subscription.findOneAndUpdate(
        { airtelTransactionId: transactionId },
        { status: 'active', startDate: Date.now() },
        { new: true }
      );
      if (sub) {
        const days = sub.plan === 'yearly' ? 365 : 30;
        await addPremiumDays(sub.user, days);
      }
      return res.json({ success: true, message: 'Airtel payment confirmed! Premium activated.' });
    }

    res.json({ success: false, message: `Payment status: ${txStatus}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
