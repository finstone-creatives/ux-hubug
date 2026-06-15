const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  caption: {
    type: String,
    trim: true,
    maxlength: 2000,
    default: '',
  },
  type: {
    type: String,
    enum: ['text', 'image', 'video', 'gallery', 'audio'],
    default: 'text',
  },
  media: [
    {
      url:       { type: String, required: true },
      type:      { type: String, enum: ['image', 'video', 'audio'], required: true },
      thumbnail: { type: String, default: null },
      duration:  { type: Number, default: null },
      size:      { type: Number, default: null },
      width:     { type: Number, default: null },
      height:    { type: Number, default: null },
    },
  ],
  isPremium: {
    type: Boolean,
    default: false,
  },
  price: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'draft'],
    default: 'approved',
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  likesCount: {
    type: Number,
    default: 0,
  },
  commentsCount: {
    type: Number,
    default: 0,
  },
  viewsCount: {
    type: Number,
    default: 0,
  },
  tags: [{ type: String, trim: true, lowercase: true }],
  location: { type: String, default: '' },
  scheduledAt: { type: Date, default: null },
  expiresAt:   { type: Date, default: null },
}, { timestamps: true });

postSchema.index({ creator: 1, createdAt: -1 });
postSchema.index({ status: 1, createdAt: -1 });
postSchema.index({ tags: 1 });

postSchema.virtual('likedBy').get(function () {
  return this.likes || [];
});

module.exports = mongoose.model('Post', postSchema);
