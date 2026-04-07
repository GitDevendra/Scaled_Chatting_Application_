// src/websocket/handlers/presence.handler.js
const { redisClient } = require('../../config/redis');
const { publishEvent } = require('../../config/kafka');

const PRESENCE_TTL = 30;


const handleSetOnline = async (ws) => {
  await redisClient.setex(`presence:${ws.userId}`, PRESENCE_TTL, 'online');

  await publishEvent('chat.presence', ws.userId, {
    type:      'USER_ONLINE',
    userId:    ws.userId,
    timestamp: Date.now(),
  });
};

const handleSetOffline = async (ws) => {
  await redisClient.del(`presence:${ws.userId}`);

  await publishEvent('chat.presence', ws.userId, {
    type:     'USER_OFFLINE',
    userId:   ws.userId,
    lastSeen: Date.now(),
  });
};

const handleGetPresence = async (ws, payload) => {
  const { userIds } = payload;

  if (!Array.isArray(userIds) || userIds.length === 0) {
    return ws.send(JSON.stringify({ type: 'ERROR', message: 'userIds array is required' }));
  }

  const capped = userIds.slice(0, 100);

  const pipeline = redisClient.pipeline();
  capped.forEach((id) => pipeline.exists(`presence:${id}`));
  const results = await pipeline.exec();

  const presenceMap = capped.reduce((acc, id, i) => {
    acc[id] = results[i][1] === 1;
    return acc;
  }, {});

  ws.send(JSON.stringify({ type: 'PRESENCE_MAP', presenceMap }));
};

module.exports = { handleSetOnline, handleSetOffline, handleGetPresence };