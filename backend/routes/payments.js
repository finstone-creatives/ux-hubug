const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createStripeIntent, confirmStripePayment,
  requestMtnPayment, verifyMtnPayment,
  requestAirtelPayment, verifyAirtelPayment,
} = require('../controllers/paymentController');

router.post('/stripe/create-intent', protect, createStripeIntent);
router.post('/stripe/confirm', protect, confirmStripePayment);

router.post('/mtn/request', protect, requestMtnPayment);
router.get('/mtn/verify/:referenceId', protect, verifyMtnPayment);

router.post('/airtel/request', protect, requestAirtelPayment);
router.get('/airtel/verify/:transactionId', protect, verifyAirtelPayment);

module.exports = router;
