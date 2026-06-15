const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { protect } = require('../middleware/auth');
const postController = require('../controllers/postController');

// Multer config for post media
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const fs = require('fs');
    const uploadDir = process.env.UPLOAD_PATH
      ? path.resolve(__dirname, '..', process.env.UPLOAD_PATH, 'posts')
      : path.resolve(__dirname, '../uploads/posts');
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `post_${req.user._id}_${Date.now()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp|mp4|mov|avi|webm|mp3|aac|wav/;
  if (allowed.test(path.extname(file.originalname).toLowerCase())) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 500 * 1024 * 1024 },
});

// GET /api/posts - feed
router.get('/', postController.getPosts);

// GET /api/posts/creator/:userId
router.get('/creator/:userId', postController.getCreatorPosts);

// GET /api/posts/:id
router.get('/:id', postController.getPost);

// POST /api/posts - create post (creator only)
router.post('/', protect, upload.array('media', 10), postController.createPost);

// PUT /api/posts/:id
router.put('/:id', protect, postController.updatePost);

// DELETE /api/posts/:id
router.delete('/:id', protect, postController.deletePost);

// POST /api/posts/:id/like
router.post('/:id/like', protect, postController.likePost);

// POST /api/posts/:id/view
router.post('/:id/view', postController.viewPost);

// POST /api/posts/:id/report
router.post('/:id/report', protect, postController.reportPost);

module.exports = router;
