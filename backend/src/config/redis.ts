import Redis from 'ioredis';
import { config } from './config';

let redisInstance: Redis | null = null;

export function getRedis(): Redis {
  if (!redisInstance) {
    redisInstance = new Redis(config.redis.url);
    
    redisInstance.on('connect', () => {
      console.log('✓ Redis connected');
    });

    redisInstance.on('error', (err) => {
      console.error('Redis error:', err);
    });
  }
  return redisInstance;
}

export async function closeRedis(): Promise<void> {
  if (redisInstance) {
    await redisInstance.quit();
    redisInstance = null;
    console.log('✓ Redis connection closed');
  }
}
