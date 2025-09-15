const redis = require('redis');
const logger = require('../utils/logger');

let redisClient = null;

const connectRedis = async () => {
  try {
    redisClient = redis.createClient({
      url: process.env.REDIS_URL,
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT
    });

    redisClient.on('error', (err) => {
      logger.warn('Redis Client Error (will continue without Redis):', err.message);
    });

    redisClient.on('connect', () => {
      logger.info('✅ Redis connected successfully');
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    logger.warn('⚠️  Redis connection failed, continuing without cache:', error.message);
    return null;
  }
};

const getRedisClient = () => {
  return redisClient; // Can be null, check before using
};

module.exports = {
  connectRedis,
  getRedisClient
};