const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getDashboardStats,
  getUsers, banUser, unbanUser, updateUserRole,
  getPendingVideos, moderateVideo,
  getAds, createAd, updateAd, deleteAd,
  getRevenue,
} = require('../controllers/adminController');

const adminOnly = [protect, authorize('admin', 'moderator')];

router.get('/stats', ...adminOnly, getDashboardStats);

// Users
router.get('/users', ...adminOnly, getUsers);
router.put('/users/:id/ban', protect, authorize('admin'), banUser);
router.put('/users/:id/unban', protect, authorize('admin'), unbanUser);
router.put('/users/:id/role', protect, authorize('admin'), updateUserRole);

// Videos
router.get('/videos', ...adminOnly, getPendingVideos);
router.put('/videos/:id/moderate', ...adminOnly, moderateVideo);

// Ads
router.get('/ads', ...adminOnly, getAds);
router.post('/ads', protect, authorize('admin'), createAd);
router.put('/ads/:id', protect, authorize('admin'), updateAd);
router.delete('/ads/:id', protect, authorize('admin'), deleteAd);

// Revenue
router.get('/revenue', protect, authorize('admin'), getRevenue);

module.exports = router;
