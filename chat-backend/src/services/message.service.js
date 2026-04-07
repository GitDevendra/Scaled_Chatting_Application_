const Message      = require('../models/Message');
const Conversation = require('../models/Conversation');
const { publishEvent } = require('../config/kafka');

const createMessage = async ({ conversationId, senderId, content, type = 'text' }) => {
  const message = await Message.create({ conversationId, sender: senderId, content, type });
  await message.populate('sender', 'username avatar');

  await Conversation.findByIdAndUpdate(conversationId, {
    lastMessage:  message._id,
    lastActivity: new Date(),
  });

  await publishEvent('chat.messages', conversationId, {
    type:           'NEW_MESSAGE',
    conversationId: conversationId.toString(),
    message: {
      _id:            message._id,
      content:        message.content,
      type:           message.type,
      sender:         message.sender,
      createdAt:      message.createdAt,
      conversationId: conversationId.toString(),
    },
  });

  return message;
};

const deleteMessage = async ({ messageId, requesterId }) => {
  const message = await Message.findById(messageId);
  if (!message) throw Object.assign(new Error('Message not found'), { statusCode: 404 });
  if (message.sender.toString() !== requesterId.toString()) {
    throw Object.assign(new Error('Not authorised to delete this message'), { statusCode: 403 });
  }

  message.isDeleted = true;
  message.content   = '';
  await message.save();

  await publishEvent('chat.messages', message.conversationId.toString(), {
    type:           'MESSAGE_DELETED',
    messageId:      messageId.toString(),
    conversationId: message.conversationId.toString(),
    deletedBy:      requesterId.toString(),
  });

  return message;
};

module.exports = { createMessage, deleteMessage };