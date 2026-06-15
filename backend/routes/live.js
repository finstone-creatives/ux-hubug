const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getLiveSessions,
  getLiveSession,
  getMyLive,
  startLive,
  endLive,
  joinLive,
  leaveLive,
} = require('../controllers/liveController');

router.get('/', getLiveSessions);
router.get('/me', protect, getMyLive);
router.post('/start', protect, startLive);
router.post('/end', protect, endLive);
router.post('/:id/join', joinLive);
router.post('/:id/leave', leaveLive);
router.get('/:id', getLiveSession);

module.exports = router;
