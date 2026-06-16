const fs = require('fs');
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const User = require('../models/User');
const { getCreators, getUser, getCreatorDashboard, getCreatorEarnings, updateMe, uploadAvatar, uploadCover, upgradeToCreator } = require('../controllers/userController');
const { protect } = require('../middleware/auth');

const uploadPath = process.env.UPLOAD_PATH
  ? path.resolve(__dirname, process.env.UPLOAD_PATH)
  : path.resolve(__dirname, '../uploads');
if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadPath),
  filename:    (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});
const imageFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Only image files are allowed.'), false);
};
const upload = multer({ storage, fileFilter: imageFilter, limits: { fileSize: 10 * 1024 * 1024 } });

// Public routes
router.get('/', getCreators);
router.get('/me/dashboard', protect, getCreatorDashboard);
router.get('/me/earnings',  protect, getCreatorEarnings);

// GET /me/following — list of followed user IDs
router.get('/me/following', protect, async (req, res) => {
  try {
    const me = await User.findById(req.user._id).select('following').lean();
    res.json({ success: true, following: (me.following || []).map(String) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/:id', getUser);

// GET /:id/reviews — get reviews for a user
router.get('/:id/reviews', async (req, res) => {
  try {
    // Mock reviews for now - replace with actual Review model query
    const reviews = [];
    res.json({ success: true, reviews });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Protected profile routes
router.put('/me',             protect, updateMe);
router.post('/me/avatar',     protect, upload.single('avatar'), uploadAvatar);
router.post('/me/cover',      protect, upload.single('cover'),  uploadCover);
router.post('/me/creator',    protect, upgradeToCreator);

// POST /:id/follow — toggle follow/unfollow
router.post('/:id/follow', protect, async (req, res) => {
  try {
    const targetId  = req.params.id;
    const myId      = req.user._id ? req.user._id.toString() : req.user.id;

    if (targetId === myId) {
      return res.status(400).json({ success: false, message: 'You cannot follow yourself.' });
    }

    if (global.USE_DEMO && require('../demoStore')) {
      const Demo = require('../demoStore');
      const result = await Demo.follow(myId, targetId);
      return res.json({ success: true, following: result.following });
    }

    const target = await User.findById(targetId).select('_id').lean();
    if (!target) return res.status(404).json({ success: false, message: 'User not found.' });

    const me          = await User.findById(myId).select('following').lean();
    const isFollowing = (me.following || []).some(id => id.toString() === targetId);

    if (isFollowing) {
      await User.findByIdAndUpdate(myId,     { $pull:      { following: targetId }, $inc: { followingCount: -1 } });
      await User.findByIdAndUpdate(targetId, { $inc: { followersCount: -1 } });
      res.json({ success: true, following: false });
    } else {
      await User.findByIdAndUpdate(myId,     { $addToSet: { following: targetId }, $inc: { followingCount:  1 } });
      await User.findByIdAndUpdate(targetId, { $inc: { followersCount:  1 } });
      res.json({ success: true, following: true });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
