
const { createMessage, deleteMessage } = require('../../services/message.service');
const { publishEvent } = require('../../config/kafka');
const handleMessageRead = async (ws, payload) => {
  const { messageId, conversationId } = payload;

  if (!messageId || !conversationId) {
    return ws.send(JSON.stringify({ type: 'ERROR', message: 'messageId and conversationId are required' }));
  }

  const Message = require('../../models/Message');
  await Message.findByIdAndUpdate(
    messageId,
    { $addToSet: { readBy: { user: ws.userId, readAt: new Date() } } },
  );

  await publishEvent('chat.messages', conversationId, {
    type:           'MESSAGE_READ',
    messageId,
    conversationId,
    userId:         ws.userId,
  });
};


const handleSendMessage = async (ws, payload) => {
  const { conversationId, content, type = 'text' } = payload;

  if (!conversationId || !content?.trim()) {
    return ws.send(JSON.stringify({ type: 'ERROR', message: 'conversationId and content are required' }));
  }


  const Conversation = require('../../models/Conversation');
  const conv = await Conversation.findOne({ _id: conversationId, participants: ws.userId });
  if (!conv) {
    return ws.send(JSON.stringify({ type: 'ERROR', message: 'Not a participant of this conversation' }));
  }

  const message = await createMessage({ conversationId, senderId: ws.userId, content, type });


  ws.send(JSON.stringify({ type: 'MESSAGE_ACK', message }));
};


const handleDeleteMessage = async (ws, payload) => {
  const { messageId } = payload;

  if (!messageId) {
    return ws.send(JSON.stringify({ type: 'ERROR', message: 'messageId is required' }));
  }

  try {
    await deleteMessage({ messageId, requesterId: ws.userId });
  } catch (err) {
    return ws.send(JSON.stringify({ type: 'ERROR', message: err.message }));
  }
};

module.exports = { handleMessageRead, handleSendMessage, handleDeleteMessage };