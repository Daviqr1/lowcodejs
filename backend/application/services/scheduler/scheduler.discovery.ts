/**
 * Substituto do `DiscoveryService` do NestJS: como o `fastify-decorators` não
 * expõe a lista de providers, cada decorator (`@Cron`/`@Interval`/`@Timeout`)
 * registra aqui a classe (constructor) que possui um método decorado. O
 * `ScheduleExplorer` itera este registro no boot para resolver as instâncias
 * via DI.
 *
 * Singleton de módulo porque os decorators rodam no import (muito antes do DI),
 * então precisam de um ponto fixo e único para acumular as classes.
 */
export class SchedulerDiscovery {
  private readonly classes = new Set<Function>();

  register(target: Function): void {
    this.classes.add(target);
  }

  getClasses(): Function[] {
    return [...this.classes];
  }
}

export const schedulerDiscovery = new SchedulerDiscovery();
