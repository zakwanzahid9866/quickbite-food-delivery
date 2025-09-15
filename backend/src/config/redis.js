const redis = require('redis');
const logger = require('../utils/logger');

let redisClient;

const connectRedis = async () => {
  try {
    // Railway provides REDIS_URL environment variable
    const redisConfig = process.env.REDIS_URL
      ? { url: process.env.REDIS_URL }
      : {
          host: process.env.REDIS_HOST || 'localhost',
          port: process.env.REDIS_PORT || 6379
        };

    redisClient = redis.createClient(redisConfig);

    redisClient.on('error', (err) => {
      logger.warn('⚠️ Redis Client Error:', err.message);
    });

    redisClient.on('connect', () => {
      logger.info('✅ Redis connected successfully');
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    logger.warn('⚠️ Redis connection failed:', error.message);
    // In production, continue without Redis
    if (process.env.NODE_ENV === 'production') {
      logger.info('📋 Running without Redis cache');
      return null;
    }
    throw error;
  }
};

const getRedisClient = () => {
  // Return null if Redis is not available (graceful degradation)
  return redisClient || null;
};

module.exports = {
  connectRedis,
  getRedisClient
};