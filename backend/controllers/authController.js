const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Demo = require('../demoStore');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'demo-secret', { expiresIn: process.env.JWT_EXPIRE || '7d' });
};

function sendUser(user, includeMore = false) {
  return {
    id: user._id || user.id,
    username: user.username,
    displayName: user.displayName,
    email: user.email,
    role: user.role,
    accountType: user.role,
    isPremium: user.isPremium,
    avatar: user.avatar,
    premiumExpiry: user.premiumExpiry,
    location: user.location,
  };
}

// @desc    Register user
// @route   POST /api/auth/register
exports.register = async (req, res) => {
  try {
    if (global.USE_DEMO && Demo) {
      const data = await Demo.register(req.body);
      return res.status(201).json(data);
    }

    const { username, displayName, email, password, dateOfBirth, ageConfirmed, accountType, role } = req.body;

    if (!ageConfirmed) {
      return res.status(400).json({ success: false, message: 'You must confirm you are 18 or older.' });
    }

    // Check age via DOB
    const dob = new Date(dateOfBirth);
    const age = Math.floor((Date.now() - dob) / (365.25 * 24 * 60 * 60 * 1000));
    if (age < 18) {
      return res.status(400).json({ success: false, message: 'You must be 18 or older to register.' });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email or username already in use.' });
    }

    const isCreator = (accountType && accountType === 'creator') || (role && role === 'creator');
    const user = await User.create({
      username,
      displayName: displayName || username,
      email,
      password,
      dateOfBirth: dob,
      ageVerified: true,
      role: isCreator ? 'creator' : 'user',
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: sendUser(user),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required.' });
    }

    if (global.USE_DEMO && Demo) {
      const data = await Demo.login(email, password);
      return res.json(data);
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    if (user.status === 'banned') {
      return res.status(403).json({ success: false, message: `Account banned: ${user.banReason}` });
    }

    user.lastLogin = Date.now();
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: sendUser(user, true),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc Get current user
exports.getMe = async (req, res) => {
  try {
    if (global.USE_DEMO && Demo) {
      const user = await Demo.getMe(req.user.id);
      return res.json({ success: true, user });
    }
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user: sendUser(user, true) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
exports.getMe = async (req, res) => {
  const user = await User.findById(req.user.id);
  res.json({ success: true, user });
};
