const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30,
  },
  displayName: {
    type: String,
    trim: true,
    maxlength: 100,
    default: '',
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Invalid email'],
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
    select: false,
  },
  role: {
    type: String,
    enum: ['user', 'creator', 'moderator', 'admin'],
    default: 'user',
  },
  status: {
    type: String,
    enum: ['active', 'banned', 'suspended', 'pending_verification'],
    default: 'active',
  },
  // Age verification (DOB checkbox)
  ageVerified: {
    type: Boolean,
    default: false,
  },
  dateOfBirth: {
    type: Date,
    required: [true, 'Date of birth is required'],
  },
  // National ID (for future upgrade)
  nationalId: {
    type: String,
    default: null,
  },
  idVerified: {
    type: Boolean,
    default: false,
  },
  // Premium subscription
  isPremium: {
    type: Boolean,
    default: false,
  },
  premiumExpiry: {
    type: Date,
    default: null,
  },
  // Stats
  uploadCount: {
    type: Number,
    default: 0,
  },
  avatar: {
    type: String,
    default: null,
  },
  coverImage: {
    type: String,
    default: null,
  },
  bio: {
    type: String,
    default: ''
  },
  creatorCategory: {
    type: String,
    trim: true,
    maxlength: 120,
    default: ''
  },
  creatorPitch: {
    type: String,
    trim: true,
    maxlength: 500,
    default: ''
  },
  location: {
    type: String,
    default: ''
  },
  privacySettings: {
    privProfile: {
      type: Boolean,
      default: true,
    },
    privOnline: {
      type: Boolean,
      default: true,
    },
    privMsg: {
      type: Boolean,
      default: true,
    },
    privSubCount: {
      type: Boolean,
      default: true,
    },
  },
  notificationPreferences: {
    notifSubscriber: {
      type: Boolean,
      default: true,
    },
    notifMessage: {
      type: Boolean,
      default: true,
    },
    notifTip: {
      type: Boolean,
      default: true,
    },
    notifLive: {
      type: Boolean,
      default: true,
    },
    notifPost: {
      type: Boolean,
      default: false,
    },
    notifPromos: {
      type: Boolean,
      default: false,
    },
  },
  banReason: {
    type: String,
    default: null,
  },
  bannedAt: {
    type: Date,
    default: null,
  },
  bannedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  lastLogin: {
    type: Date,
    default: null,
  },
}, { timestamps: true });

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Check if user is 18+
userSchema.methods.isAdult = function () {
  if (!this.dateOfBirth) return false;
  const age = Math.floor((Date.now() - new Date(this.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000));
  return age >= 18;
};

module.exports = mongoose.model('User', userSchema);
