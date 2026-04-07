// src/websocket/wsHandler.js
const { handleMessageRead, handleSendMessage, handleDeleteMessage } = require('./handlers/message.handler');
const { handleTypingStart, handleTypingStop, handleGetTypingUsers } = require('./handlers/typing.handler');
const { handleSetOnline, handleSetOffline, handleGetPresence }      = require('./handlers/presence.handler');
const { publishEvent } = require('../config/kafka');
const { redisClient }  = require('../config/redis');

// ─── Main dispatcher ──────────────────────────────────────────────────────────
const wsHandler = async (ws, data, clients) => {
  const { type, payload = {} } = data;

  try {
    switch (type) {
      // Message events
      case 'SEND_MESSAGE':    await handleSendMessage(ws, payload);   break;
      case 'MESSAGE_READ':    await handleMessageRead(ws, payload);   break;
      case 'DELETE_MESSAGE':  await handleDeleteMessage(ws, payload); break;

      // Typing events
      case 'TYPING_START':      await handleTypingStart(ws, payload);    break;
      case 'TYPING_STOP':       await handleTypingStop(ws, payload);     break;
      case 'GET_TYPING_USERS':  await handleGetTypingUsers(ws, payload); break;

      // Presence events
      case 'SET_ONLINE':    await handleSetOnline(ws);              break;
      case 'SET_OFFLINE':   await handleSetOffline(ws);             break;
      case 'GET_PRESENCE':  await handleGetPresence(ws, payload);   break;

      default:
        ws.send(JSON.stringify({ type: 'ERROR', message: `Unknown event type: ${type}` }));
    }
  } catch (err) {
    console.error(`[wsHandler] Error handling "${type}":`, err.message);
    ws.send(JSON.stringify({ type: 'ERROR', message: 'Internal server error' }));
  }
};

// ─── Kafka consumer ───────────────────────────────────────────────────────────
const startKafkaConsumer = async (clients) => {
  const { consumer } = require('../config/kafka');

  await consumer.subscribe({
    topics: ['chat.messages', 'chat.typing', 'chat.presence'],
    fromBeginning: false,
  });

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      try {
        const event = JSON.parse(message.value.toString());
        await broadcastEvent(topic, event, clients);
      } catch (err) {
        console.error('[Kafka consumer] Error:', err.message);
      }
    },
  });
};

// ─── Broadcast helpers ────────────────────────────────────────────────────────
const broadcastEvent = async (topic, event, clients) => {
  const { conversationId } = event;

  if (topic === 'chat.messages' || topic === 'chat.typing') {
    await broadcastToConversation(conversationId, JSON.stringify(event), clients);
  } else if (topic === 'chat.presence') {
    broadcastToAll(JSON.stringify(event), clients);
  }
};

const broadcastToConversation = async (conversationId, payload, clients) => {
  const Conversation = require('../models/Conversation');
  const conv = await Conversation.findById(conversationId).select('participants');
  if (!conv) return;

  conv.participants.forEach((participantId) => {
    const userSockets = clients.get(participantId.toString());
    if (userSockets) {
      userSockets.forEach((ws) => { if (ws.readyState === 1) ws.send(payload); });
    }
  });
};

const broadcastToAll = (payload, clients) => {
  clients.forEach((sockets) => {
    sockets.forEach((ws) => { if (ws.readyState === 1) ws.send(payload); });
  });
};

// ─── Redis pub/sub ────────────────────────────────────────────────────────────
const startRedisSub = async (clients) => {
  const { redisSub } = require('../config/redis');
  await redisSub.subscribe('chat:broadcast');
  redisSub.on('message', (_channel, message) => broadcastToAll(message, clients));
};

module.exports = wsHandler;
module.exports.startKafkaConsumer = startKafkaConsumer;
module.exports.startRedisSub      = startRedisSub;