const Redis = require('ioredis');

const createRedisClient = (name) => {
  const client = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    retryStrategy(times) {
      const delay = Math.min(times * 100, 3000); 
      return delay;
    },
    maxRetriesPerRequest: 3,
  });

  client.on('connect', () => console.log(`Redis [${name}] connected`));
  client.on('error', (err) => console.error(`Redis [${name}] error:`, err.message));

  return client;
};

const redisClient   = createRedisClient('main');   
const redisSub      = createRedisClient('sub');   

module.exports = { redisClient, redisSub };