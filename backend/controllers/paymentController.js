const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_demo');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const Subscription = require('../models/Subscription');
const Tip = require('../models/Tip');
const User = require('../models/User');
const Demo = require('../demoStore');

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
    if (global.USE_DEMO) {
      const { plan } = req.body;
      const amount = plan === 'yearly' ? Math.round(PREMIUM_PRICE_USD * 10 * 100) : Math.round(PREMIUM_PRICE_USD * 100);
      // Demo: fake client secret that the frontend can "confirm"
      return res.json({ success: true, clientSecret: 'demo_pi_' + Date.now(), amount, demo: true });
    }

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
    if (global.USE_DEMO) {
      const { plan = 'monthly' } = req.body;
      const days = plan === 'yearly' ? 365 : 30;
      if (Demo) await Demo.mockSubscribe(req.user.id || req.user._id, 'platform', 'stripe');
      // Grant premium in real path too if needed, but demo does it
      await addPremiumDays(req.user.id, days).catch(() => {});
      return res.json({ success: true, message: 'Premium activated! (demo)', demo: true });
    }

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

exports.sendTip = async (req, res) => {
  try {
    const { creatorId, amount, message } = req.body;
    const parsedAmount = Number(amount);

    if (!creatorId || !parsedAmount || parsedAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid creator and amount are required.' });
    }

    if (global.USE_DEMO && Demo) {
      const result = await Demo.mockTip(creatorId, req.user.id || req.user._id, parsedAmount, message);
      // Broadcast tip via socket if live context
      const io = require('../socket').getIO ? require('../socket').getIO() : null;
      if (io) io.emit('live:tip', { liveId: creatorId, amount: parsedAmount, message, username: 'You' });
      return res.json({ success: true, message: 'Tip sent! Thank you.', tip: result.tip });
    }

    const creator = await User.findById(creatorId);
    if (!creator || creator.role !== 'creator') {
      return res.status(404).json({ success: false, message: 'Creator not found.' });
    }
    if (String(req.user.id) === String(creatorId)) {
      return res.status(400).json({ success: false, message: 'You cannot tip yourself.' });
    }

    const tip = await Tip.create({
      creator: creator._id,
      sender: req.user._id,
      amount: parsedAmount,
      currency: 'USD',
      message: message || '',
      type: 'tip',
      status: 'completed',
    });

    res.json({ success: true, tip, message: 'Tip sent successfully.' });
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
    const { phoneNumber, plan, creatorId } = req.body;
    if (global.USE_DEMO && Demo) {
      const amt = PREMIUM_PRICE_UGX;
      if (creatorId) await Demo.mockSubscribe(req.user.id || req.user._id, creatorId, 'mtn');
      const ref = 'MTN' + Date.now().toString().slice(-9);
      return res.json({ success: true, message: 'MTN MoMo approved instantly (demo mode). Premium unlocked!', referenceId: ref, demo: true });
    }

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
        payerMessage: 'NxtDoor Premium Subscription',
        payeeNote: `NxtDoor Premium - ${plan}`,
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
    if (global.USE_DEMO) {
      await addPremiumDays(req.user.id, 30).catch(() => {});
      return res.json({ success: true, message: 'Payment confirmed. Premium unlocked! (demo)', demo: true });
    }

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
        reference: `NxtDoor-${transactionId}`,
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
