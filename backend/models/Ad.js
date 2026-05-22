const mongoose = require('mongoose');

const adSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  advertiser: {
    type: String,
    required: true,
  },
  imageUrl: {
    type: String,
    default: null,
  },
  linkUrl: {
    type: String,
    required: true,
  },
  placement: {
    type: String,
    enum: ['banner_top', 'banner_bottom', 'sidebar', 'footer', 'in_video'],
    required: true,
  },
  status: {
    type: String,
    enum: ['active', 'paused', 'expired'],
    default: 'active',
  },
  impressions: {
    type: Number,
    default: 0,
  },
  clicks: {
    type: Number,
    default: 0,
  },
  budget: {
    type: Number,
    default: 0,
  },
  spent: {
    type: Number,
    default: 0,
  },
  startDate: {
    type: Date,
    default: Date.now,
  },
  endDate: {
    type: Date,
    default: null,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, { timestamps: true });

module.exports = mongoose.model('Ad', adSchema);
