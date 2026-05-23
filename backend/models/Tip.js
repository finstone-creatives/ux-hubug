const mongoose = require('mongoose');

const tipSchema = new mongoose.Schema({
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    default: 'USD',
  },
  message: {
    type: String,
    default: '',
  },
  type: {
    type: String,
    enum: ['tip', 'ppv'],
    default: 'tip',
  },
  status: {
    type: String,
    enum: ['completed', 'pending', 'failed'],
    default: 'completed',
  },
}, { timestamps: true });

module.exports = mongoose.model('Tip', tipSchema);
