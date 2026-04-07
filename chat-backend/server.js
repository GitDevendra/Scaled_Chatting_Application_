// server.js
const http = require('http');
require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./src/config/db');
const { connectKafka } = require('./src/config/kafka');
const { initWebSocketServer } = require('./src/websocket/wsServer'); // ← was wrongly wsHandler
const { consumer, producer } = require('./src/config/kafka');
const { redisClient, redisSub } = require('./src/config/redis');
const mongoose = require('mongoose');
const server = http.createServer(app);

const bootstrap = async () => {
  await connectDB();
  await connectKafka();
  await initWebSocketServer(server);

  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
};

const shutdown = async (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  server.close(async () => {

    await consumer.disconnect();
    await producer.disconnect();
    await redisClient.quit();
    await redisSub.quit();
    await mongoose.connection.close();
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('unhandledRejection', (err) => { console.error('Unhandled rejection:', err); shutdown('unhandledRejection'); });

bootstrap();