import bcrypt from 'bcryptjs';
import { Service } from 'fastify-decorators';

import { PasswordContractService } from './password-contract.service';

// Custo unico do backend. Hashes antigos com custo menor seguem validando —
// o bcrypt carrega o custo no proprio hash.
const SALT_ROUNDS = 12;

// Prefixos das revisoes de bcrypt que o backend gera.
const BCRYPT_PREFIXES = ['$2a$', '$2b$'];

@Service()
export default class BcryptPasswordService implements PasswordContractService {
  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  async compare(plain: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(plain, hashed);
  }

  isHashed(value: string): boolean {
    return BCRYPT_PREFIXES.some((prefix) => value.startsWith(prefix));
  }
}
