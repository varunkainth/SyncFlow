import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379,
  username: process.env.REDIS_USERNAME || "default", // Redis username
  password: process.env.REDIS_PASSWORD || "default", // Redis password
  retryStrategy: (times) => Math.min(times * 50, 2000), // Retry delay
});

redis.on('connect', () => console.log('✅ Redis connected successfully'));
redis.on('error', (err) => console.error('❌ Redis connection error:', err));

export default redis;
