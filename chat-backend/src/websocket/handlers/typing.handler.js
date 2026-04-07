// src/websocket/handlers/typing.handler.js
const { redisClient } = require('../../config/redis');
const { publishEvent } = require('../../config/kafka');

const TYPING_TTL = 3; 

const handleTypingStart = async (ws, payload) => {
  const { conversationId } = payload;

  if (!conversationId) {
    return ws.send(JSON.stringify({ type: 'ERROR', message: 'conversationId is required' }));
  }

  await redisClient.setex(`typing:${conversationId}:${ws.userId}`, TYPING_TTL, '1');

  await publishEvent('chat.typing', conversationId, {
    type:           'TYPING_START',
    conversationId,
    userId:         ws.userId,
    isTyping:       true,
  });
};


const handleTypingStop = async (ws, payload) => {
  const { conversationId } = payload;

  if (!conversationId) {
    return ws.send(JSON.stringify({ type: 'ERROR', message: 'conversationId is required' }));
  }

  await redisClient.del(`typing:${conversationId}:${ws.userId}`);

  await publishEvent('chat.typing', conversationId, {
    type:           'TYPING_STOP',
    conversationId,
    userId:         ws.userId,
    isTyping:       false,
  });
};


const handleGetTypingUsers = async (ws, payload) => {
  const { conversationId } = payload;

  if (!conversationId) {
    return ws.send(JSON.stringify({ type: 'ERROR', message: 'conversationId is required' }));
  }

  const keys = await redisClient.keys(`typing:${conversationId}:*`);
  const typingUserIds = keys.map((k) => k.split(':')[2]);

  ws.send(JSON.stringify({ type: 'TYPING_USERS', conversationId, typingUserIds }));
};

module.exports = { handleTypingStart, handleTypingStop, handleGetTypingUsers };