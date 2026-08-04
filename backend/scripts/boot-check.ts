/**
 * Smoke de boot: conecta no Mongo, sobe o kernel inteiro e sai.
 *
 * Cobre o que o `di:check` nao alcanca — ordem de registro no `kernel.ts`,
 * carga dos controllers e os hooks de `onReady`. Uma dependencia resolvida
 * antes do `registerDependencies()`, por exemplo, so aparece aqui.
 *
 *   npm run boot:check
 */
import { MongooseConnect } from '../config/database.config';
import { kernel } from '../start/kernel';

await MongooseConnect();
await kernel.ready();

console.info('\nKernel pronto.');
process.exit(0);
