const express = require('express');
const router  = express.Router();
const User    = require('../models/User');

// GET /api/stats — public platform statistics
router.get('/', async (req, res) => {
  try {
    const [creators, members, live] = await Promise.all([
      User.countDocuments({ role: 'creator', status: 'active' }),
      User.countDocuments({ status: 'active' }),
      User.countDocuments({ role: 'creator', isOnline: true }),
    ]);
    res.json({ success: true, creators, members, live });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
