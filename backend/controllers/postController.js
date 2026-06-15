const Post = require('../models/Post');
const User = require('../models/User');
const jwt  = require('jsonwebtoken');
const path = require('path');

const getMediaType = (mimetype = '') => {
  if (mimetype.startsWith('image')) return 'image';
  if (mimetype.startsWith('video')) return 'video';
  if (mimetype.startsWith('audio')) return 'audio';
  return 'image';
};

// Decode JWT without throwing (for optional auth)
function decodeToken(req) {
  try {
    const header = req.headers.authorization || '';
    const token  = header.split(' ')[1];
    if (!token) return null;
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch { return null; }
}

// @route GET /api/posts
exports.getPosts = async (req, res) => {
  try {
    const page  = Math.max(parseInt(req.query.page)  || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 12, 50);
    const skip  = (page - 1) * limit;
    const { creator, tag, type } = req.query;

    const query = { status: 'approved' };
    if (creator) query.creator = creator;
    if (tag)     query.tags = { $in: [tag.toLowerCase()] };
    if (type)    query.type = type;
    if (req.query.premium === 'true') query.isPremium = true;

    // Following feed: filter to creators the user follows
    if (req.query.feed === 'following') {
      const decoded = decodeToken(req);
      if (decoded) {
        const me = await User.findById(decoded.id).select('following').lean();
        query.creator = { $in: me?.following || [] };
      } else {
        query.creator = { $in: [] }; // Not authenticated — empty result
      }
    }

    const [posts, total] = await Promise.all([
      Post.find(query)
        .populate('creator', 'username displayName avatar isPremium role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Post.countDocuments(query),
    ]);

    res.json({
      success: true,
      posts,
      pagination: { page, pages: Math.ceil(total / limit), total },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route GET /api/posts/creator/:userId
exports.getCreatorPosts = async (req, res) => {
  try {
    const page  = Math.max(parseInt(req.query.page)  || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 12, 50);
    const skip  = (page - 1) * limit;
    const query = { creator: req.params.userId, status: 'approved' };

    const [posts, total] = await Promise.all([
      Post.find(query)
        .populate('creator', 'username displayName avatar isPremium')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Post.countDocuments(query),
    ]);

    res.json({
      success: true,
      posts,
      pagination: { page, pages: Math.ceil(total / limit), total },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route GET /api/posts/:id
exports.getPost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('creator', 'username displayName avatar isPremium bio location')
      .lean();
    if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });
    res.json({ success: true, post });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route POST /api/posts
exports.createPost = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { caption, isPremium, price, tags, location, scheduledAt } = req.body;

    const media = (req.files || []).map(file => ({
      url:  `/uploads/posts/${file.filename}`,
      type: getMediaType(file.mimetype),
      size: file.size,
    }));

    const postType = media.length === 0 ? 'text'
      : media.length > 1               ? 'gallery'
      : media[0].type;

    const post = await Post.create({
      creator:     user._id,
      caption:     caption || '',
      type:        postType,
      media,
      isPremium:   isPremium === 'true' || isPremium === true,
      price:       parseFloat(price) || 0,
      tags:        tags ? String(tags).split(',').map(t => t.trim().toLowerCase()).filter(Boolean) : [],
      location:    location || '',
      scheduledAt: scheduledAt || null,
      status:      'approved',
    });

    await User.findByIdAndUpdate(user._id, { $inc: { uploadCount: 1 } });
    const populated = await post.populate('creator', 'username displayName avatar isPremium');
    res.status(201).json({ success: true, post: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route PUT /api/posts/:id
exports.updatePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });
    if (post.creator.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }
    const { caption, isPremium, price, tags, location } = req.body;
    if (typeof caption   !== 'undefined') post.caption   = caption;
    if (typeof isPremium !== 'undefined') post.isPremium = isPremium;
    if (typeof price     !== 'undefined') post.price     = parseFloat(price) || 0;
    if (typeof tags      !== 'undefined') post.tags      = String(tags).split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
    if (typeof location  !== 'undefined') post.location  = location;
    await post.save();
    res.json({ success: true, post });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route DELETE /api/posts/:id
exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });
    if (post.creator.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }
    await post.deleteOne();
    await User.findByIdAndUpdate(post.creator, { $inc: { uploadCount: -1 } });
    res.json({ success: true, message: 'Post deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route POST /api/posts/:id/like
exports.likePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });

    const idx = post.likes.indexOf(req.user._id);
    let liked;
    if (idx === -1) {
      post.likes.push(req.user._id);
      post.likesCount = Math.max(0, post.likesCount + 1);
      liked = true;
    } else {
      post.likes.splice(idx, 1);
      post.likesCount = Math.max(0, post.likesCount - 1);
      liked = false;
    }
    await post.save();
    res.json({ success: true, liked, likesCount: post.likesCount });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route POST /api/posts/:id/save
exports.savePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });

    const saves = post.saves || [];
    const idx   = saves.findIndex(id => id.toString() === req.user._id.toString());
    let saved;
    if (idx === -1) {
      post.saves = saves;
      post.saves.push(req.user._id);
      post.savesCount = Math.max(0, (post.savesCount || 0) + 1);
      saved = true;
    } else {
      post.saves.splice(idx, 1);
      post.savesCount = Math.max(0, (post.savesCount || 0) - 1);
      saved = false;
    }
    await post.save();
    res.json({ success: true, saved, savesCount: post.savesCount });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route POST /api/posts/:id/view
exports.viewPost = async (req, res) => {
  try {
    await Post.findByIdAndUpdate(req.params.id, { $inc: { viewsCount: 1 } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route POST /api/posts/:id/report
exports.reportPost = async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ success: false, message: 'Reason required.' });
    await Post.findByIdAndUpdate(req.params.id, { $set: { status: 'pending' } });
    res.json({ success: true, message: 'Post reported and queued for review.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
