const mongoose = require('mongoose');

// Single message schema definition (remove the separate messageSchema file)
const messageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  text: {
    type: String,
    required: true,
    trim: true,
    maxlength: 5000
  },
  readBy: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  deliveredTo: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    deliveredAt: {
      type: Date,
      default: Date.now
    }
  }],
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: Date,
  isDeleted: {
    type: Boolean,
    default: false
  },
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  attachments: [{
    type: {
      type: String,
      enum: ['image', 'video', 'document', 'audio'],
      required: false
    },
    url: String,
    name: String,
    size: Number
  }]
}, {
  timestamps: true
});

const chatSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  type: {
    type: String,
    enum: ['private', 'group'],
    default: 'private'
  },
  groupName: {
    type: String,
    trim: true
  },
  groupAvatar: String,
  groupAdmin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  groupAdmins: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  messages: [messageSchema],
  lastMessage: {
    text: String,
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    senderName: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  unreadCount: {
    type: Map,
    of: Number,
    default: new Map()
  },
  isActive: {
    type: Boolean,
    default: true
  },
  pinnedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  mutedBy: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    until: Date
  }],
  archivedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true,
  versionKey: false
});

// Indexes for performance
chatSchema.index({ participants: 1 });
chatSchema.index({ updatedAt: -1 });
chatSchema.index({ 'lastMessage.timestamp': -1 });

// Unique index removed because a multikey index with unique:true on participants limits users to only 1 private chat.


// Method to mark messages as delivered
chatSchema.methods.markAsDelivered = async function (userId, messageIds = null) {
  let updatedCount = 0;

  for (const message of this.messages) {
    if (message.senderId.toString() === userId.toString()) continue;

    const alreadyDelivered = message.deliveredTo.some(d => d.userId.toString() === userId.toString());

    if (!alreadyDelivered && (!messageIds || messageIds.includes(message._id.toString()))) {
      message.deliveredTo.push({
        userId: userId,
        deliveredAt: new Date()
      });
      updatedCount++;
    }
  }

  if (updatedCount > 0) {
    await this.save();
  }

  return updatedCount;
};

// Method to mark messages as read
chatSchema.methods.markAsRead = async function (userId, messageIds = null) {
  let updatedCount = 0;

  for (const message of this.messages) {
    if (message.senderId.toString() === userId.toString()) continue;

    const alreadyRead = message.readBy.some(r => r.userId.toString() === userId.toString());

    if (!alreadyRead && (!messageIds || messageIds.includes(message._id.toString()))) {
      message.readBy.push({
        userId: userId,
        readAt: new Date()
      });
      updatedCount++;
    }
  }

  this.unreadCount.set(userId.toString(), 0);

  if (updatedCount > 0) {
    await this.save();
  }

  return updatedCount;
};

// Method to get unread count
chatSchema.methods.getUnreadCount = function (userId) {
  return this.unreadCount.get(userId.toString()) || 0;
};

// Method to delete message (soft delete)
chatSchema.methods.deleteMessage = async function (userId, messageId) {
  const message = this.messages.id(messageId);
  if (!message) {
    throw new Error('Message not found');
  }

  if (message.senderId.toString() !== userId.toString()) {
    throw new Error('You can only delete your own messages');
  }

  const messageAge = Date.now() - new Date(message.createdAt).getTime();

  // Removed the 5-minute restriction to allow users to delete messages anytime


  message.text = 'This message was deleted';
  message.isDeleted = true;
  message.attachments = [];

  // Update last message if this was the last one
  if (this.lastMessage && this.lastMessage.timestamp === message.createdAt) {
    this.lastMessage.text = 'This message was deleted';
    this.lastMessage.isDeleted = true;
  }

  await this.save();
  return message;
};

// Static method to find or create private chat
chatSchema.statics.findOrCreatePrivateChat = async function (userId1, userId2) {
  const p1 = userId1.toString();
  const p2 = userId2.toString();
  const participantsStrings = [p1, p2].sort();
  const participants = participantsStrings.map(id => new mongoose.Types.ObjectId(id));

  let chat = await this.findOneAndUpdate(
    {
      type: 'private',
      participants: participants,
    },
    {
      $setOnInsert: {
        participants: participants,
        type: 'private',
        messages: [],
        unreadCount: new Map()
      }
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true
    }
  ).populate('participants', 'firstName lastName photoUrl emailId');

  return chat;
};

// Static method to get user's chats
chatSchema.statics.getUserChats = async function (userId) {
  return await this.find({
    participants: userId,
    isActive: true
  })
    .populate('participants', 'firstName lastName photoUrl emailId')
    .sort({ updatedAt: -1 });
};

// Method to add a new message - FIXED
chatSchema.methods.addMessage = async function (senderId, text, replyTo = null, attachments = []) {
  // Don't try to fetch User model here to avoid circular dependency
  const newMessage = {
    senderId: senderId,
    text: text,
    readBy: [{ userId: senderId, readAt: new Date() }],
    deliveredTo: [{ userId: senderId, deliveredAt: new Date() }],
    replyTo: replyTo,
    attachments: attachments,
    createdAt: new Date()
  };

  this.messages.push(newMessage);

  // Update last message without fetching User
  this.lastMessage = {
    text: text,
    senderId: senderId,
    senderName: 'User', // Temporary, will be updated by frontend
    timestamp: new Date(),
    isDeleted: false
  };

  // Increment unread count for all participants except sender
  for (const participantId of this.participants) {
    if (participantId.toString() !== senderId.toString()) {
      const currentUnread = this.unreadCount.get(participantId.toString()) || 0;
      this.unreadCount.set(participantId.toString(), currentUnread + 1);
    }
  }

  this.updatedAt = new Date();

  try {
    await this.save();
    return this.messages[this.messages.length - 1];
  } catch (error) {
    console.error('Error saving message:', error);
    throw error;
  }
};

module.exports = mongoose.model('Chat', chatSchema);