const mongoose = require('mongoose');

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
  deletedFor: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: Date,
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  }
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
    enum: ['private', 'global', 'group'],
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
  messages: [messageSchema],
  lastMessage: {
    text: String,
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
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
  pinned: {
    type: Boolean,
    default: false
  },
  muted: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    until: Date
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  versionKey: false
});

// Indexes
chatSchema.index({ participants: 1 });
chatSchema.index({ type: 1, updatedAt: -1 });
chatSchema.index({ 'lastMessage.timestamp': -1 });
chatSchema.index({ updatedAt: -1 });

// Unique index for private chats
chatSchema.index({ participants: 1, type: 1 }, {
  unique: true,
  partialFilterExpression: { type: 'private' },
  sparse: true
});

// Method to add message
chatSchema.methods.addMessage = async function(senderId, text, replyTo = null) {
  const newMessage = {
    senderId: senderId,
    text: text,
    readBy: [{ userId: senderId, readAt: new Date() }],
    replyTo: replyTo,
    createdAt: new Date()
  };
  
  this.messages.push(newMessage);
  
  // Update last message
  this.lastMessage = {
    text: text,
    senderId: senderId,
    timestamp: new Date()
  };
  
  // Increment unread count for all participants except sender
  this.participants.forEach(participantId => {
    if (participantId.toString() !== senderId.toString()) {
      const currentUnread = this.unreadCount.get(participantId.toString()) || 0;
      this.unreadCount.set(participantId.toString(), currentUnread + 1);
    }
  });
  
  this.updatedAt = new Date();
  
  try {
    await this.save();
    return this.messages[this.messages.length - 1];
  } catch (error) {
    console.error('Error saving message:', error);
    throw error;
  }
};

// Method to mark messages as read
chatSchema.methods.markAsRead = async function(userId, messageIds = null) {
  let updatedCount = 0;
  
  for (let message of this.messages) {
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
  this.updatedAt = new Date();
  
  try {
    await this.save();
    return updatedCount;
  } catch (error) {
    console.error('Error marking messages as read:', error);
    throw error;
  }
};

// Method to get unread count
chatSchema.methods.getUnreadCount = function(userId) {
  return this.unreadCount.get(userId.toString()) || 0;
};

// Static method to find or create private chat
chatSchema.statics.findOrCreatePrivateChat = async function(userId1, userId2) {
  const participants = [userId1, userId2].sort();
  
  try {
    let chat = await this.findOne({
      type: 'private',
      participants: { $all: participants, $size: 2 },
      isActive: true
    }).populate('participants', 'firstName lastName photoUrl emailId');
    
    if (chat) {
      return chat;
    }
    
    chat = new this({
      participants: participants,
      type: 'private',
      messages: [],
      unreadCount: new Map()
    });
    
    await chat.save();
    await chat.populate('participants', 'firstName lastName photoUrl emailId');
    return chat;
  } catch (error) {
    if (error.code === 11000) {
      const existingChat = await this.findOne({
        type: 'private',
        participants: { $all: participants, $size: 2 },
        isActive: true
      }).populate('participants', 'firstName lastName photoUrl emailId');
      
      if (existingChat) {
        return existingChat;
      }
    }
    throw error;
  }
};

module.exports = mongoose.model('Chat', chatSchema);