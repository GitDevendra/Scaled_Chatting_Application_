// src/websocket/wsServer.js
const { WebSocketServer } = require('ws');
const jwt = require('jsonwebtoken');
const cookie = require('cookie');
const { redisClient } = require('../config/redis');
const { publishEvent } = require('../config/kafka');
const wsHandler = require('./wsHandler');
const { startKafkaConsumer, startRedisSub } = require('./wsHandler'); 

const clients = new Map();

const initWebSocketServer = async (server) => {
  const wss = new WebSocketServer({ server });

  wss.on('connection', async (ws, req) => {
    // --- Auth ---
    let token;
    if (req.headers.cookie) {
      const cookies = cookie.parse(req.headers.cookie);
      token = cookies.jwt;
    }
    if (!token) {
      const url = new URL(req.url, 'http://localhost');
      token = url.searchParams.get('token');
    }
    if (!token) return ws.close(4001, 'Unauthorized: No token');

    let userId;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const stored  = await redisClient.get(`session:${decoded.id}`);
      if (!stored || stored !== token) return ws.close(4001, 'Unauthorized: Invalid session');
      userId = decoded.id;
    } catch {
      return ws.close(4001, 'Unauthorized: Invalid token');
    }

    // --- Register client ---
    ws.userId  = userId;
    ws.isAlive = true;

    if (!clients.has(userId)) clients.set(userId, new Set());
    clients.get(userId).add(ws);

    await redisClient.setex(`presence:${userId}`, 30, 'online');
    await publishEvent('chat.presence', userId, { type: 'USER_ONLINE', userId, timestamp: Date.now() });

    // --- Incoming messages ---
    ws.on('message', (raw) => {
      try {
        const data = JSON.parse(raw);
        wsHandler(ws, data, clients);
      } catch {
        ws.send(JSON.stringify({ type: 'ERROR', message: 'Invalid JSON' }));
      }
    });

    ws.on('pong', () => { ws.isAlive = true; });

    // --- Disconnect ---
    ws.on('close', async () => {
      clients.get(userId)?.delete(ws);
      if (clients.get(userId)?.size === 0) {
        clients.delete(userId);
        await redisClient.del(`presence:${userId}`);
        await publishEvent('chat.presence', userId, { type: 'USER_OFFLINE', userId, lastSeen: Date.now() });
      }
    });
  });

  // --- Heartbeat ---
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
      if (ws.userId) redisClient.expire(`presence:${ws.userId}`, 30);
    });
  }, 25000);

  wss.on('close', () => clearInterval(heartbeatInterval));

  await startKafkaConsumer(clients);
  await startRedisSub(clients);

  return wss;
};

module.exports = { initWebSocketServer, clients };