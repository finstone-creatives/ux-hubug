const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: 100,
  },
  description: {
    type: String,
    default: '',
    maxlength: 1000,
  },
  filename: {
    type: String,
    required: true,
  },
  filePath: {
    type: String,
    required: true,
  },
  thumbnail: {
    type: String,
    default: null,
  },
  uploader: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'flagged'],
    default: 'pending',
  },
  moderatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  moderationNote: {
    type: String,
    default: null,
  },
  moderatedAt: {
    type: Date,
    default: null,
  },
  isPremium: {
    type: Boolean,
    default: false,
  },
  views: {
    type: Number,
    default: 0,
  },
  resolution: {
    type: String,
    enum: ['SD', 'HD', '4K'],
    default: 'HD',
  },
  duration: {
    type: Number, // seconds
    default: 0,
  },
  fileSize: {
    type: Number, // bytes
    default: 0,
  },
  tags: [{
    type: String,
    trim: true,
  }],
  category: {
    type: String,
    default: 'General',
  },
  flagReports: [{
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: String,
    reportedAt: { type: Date, default: Date.now },
  }],
}, { timestamps: true });

// Index for search
videoSchema.index({ title: 'text', description: 'text', tags: 'text' });
videoSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Video', videoSchema);
