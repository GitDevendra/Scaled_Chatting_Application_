const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['direct', 'group'],
      required: true,
    },
    name: {
      type: String,
      trim: true,
      maxlength: 50,
    },
    avatar: String,
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
    },
    lastActivity: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

conversationSchema.index({ participants: 1, type: 1 });
conversationSchema.index({ lastActivity: -1 }); // sort by recent activity

module.exports = mongoose.model('Conversation', conversationSchema);