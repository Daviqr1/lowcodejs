import { Service } from 'fastify-decorators';
import Redis, { type RedisOptions } from 'ioredis';

import { Env } from '@start/env';

import { RedisContractService } from './redis-contract.service';

@Service()
export default class IoredisService implements RedisContractService {
  private shared: Redis | null = null;

  connection(): Redis {
    if (this.shared) return this.shared;

    this.shared = new Redis(Env.REDIS_URL);
    this.shared.on('error', (error) => {
      console.error('Redis connection error:', error);
    });

    return this.shared;
  }

  createQueueConnection(extra: RedisOptions = {}): Redis {
    const connection = new Redis(Env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      ...extra,
    });

    connection.on('error', (error) => {
      console.error('Redis (BullMQ) connection error:', error);
    });

    return connection;
  }
}
