const { redisClient } = require('../config/redis');
const User = require('../models/User');

const isUserOnline = async (userId) => {
  const result = await redisClient.exists(`presence:${userId}`);
  return result === 1;
};


const getBulkPresence = async (userIds) => {
  const pipeline = redisClient.pipeline();
  userIds.forEach((id) => pipeline.exists(`presence:${id}`));
  const results = await pipeline.exec();

  return userIds.reduce((acc, id, i) => {
    acc[id] = results[i][1] === 1;
    return acc;
  }, {});
};

const syncPresenceToMongo = async () => {
  const keys = await redisClient.keys('presence:*');
  const onlineIds = keys.map((k) => k.replace('presence:', ''));
  await User.updateMany({}, { isOnline: false });
  if (onlineIds.length > 0) {
    await User.updateMany({ _id: { $in: onlineIds } }, { isOnline: true });
  }
};

module.exports = { isUserOnline, getBulkPresence, syncPresenceToMongo };