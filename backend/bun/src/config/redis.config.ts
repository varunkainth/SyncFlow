import Redis from 'ioredis';

const redisClient = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
});

redisClient.on('connect', () => {
    console.log('🚀 Connected to Redis server');
    
});

redisClient.on('error', (error) => {
    console.error('❌ Redis error:', error);
});

export default redisClient;