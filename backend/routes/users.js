const fs = require('fs');
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { getCreators, getUser, getCreatorDashboard, getCreatorEarnings, updateMe, uploadAvatar, uploadCover, upgradeToCreator } = require('../controllers/userController');
const { protect } = require('../middleware/auth');

const uploadPath = process.env.UPLOAD_PATH
  ? path.resolve(__dirname, process.env.UPLOAD_PATH)
  : path.resolve(__dirname, '../uploads');
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

const storage = multer.diskStorage({
	destination: (req, file, cb) => cb(null, uploadPath),
	filename: (req, file, cb) => {
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

router.get('/', getCreators);
router.get('/me/dashboard', protect, getCreatorDashboard);
router.get('/me/earnings', protect, getCreatorEarnings);
router.get('/:id', getUser);

// Protected profile routes
router.put('/me', protect, updateMe);
router.post('/me/avatar', protect, upload.single('avatar'), uploadAvatar);
router.post('/me/cover', protect, upload.single('cover'), uploadCover);
router.post('/me/creator', protect, upgradeToCreator);

module.exports = router;
