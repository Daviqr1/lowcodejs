import type Redis from 'ioredis';
import type { RedisOptions } from 'ioredis';

/**
 * Conexoes Redis. Antes o modulo abria uma conexao em tempo de import — bastava
 * alguem tocar no arquivo para o processo passar a segurar um socket, inclusive
 * em teste e em script standalone. Agora a conexao compartilhada e preguicosa.
 */
export abstract class RedisContractService {
  /** Conexao compartilhada, aberta na primeira chamada. */
  abstract connection(): Redis;

  /** Conexao dedicada para BullMQ (exige `maxRetriesPerRequest: null`). */
  abstract createQueueConnection(extra?: RedisOptions): Redis;
}
