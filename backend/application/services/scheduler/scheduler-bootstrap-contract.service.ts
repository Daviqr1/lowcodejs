import type { SchedulerOrchestrator } from './scheduler.orchestrator';

/**
 * Liga a engine de agendamentos no boot: descobre os metodos decorados, monta
 * os jobs e registra no `SchedulerRegistry`. Roda **depois** de `kernel.ready()`,
 * quando todas as classes ja foram importadas e sao resolviveis por DI.
 */
export abstract class SchedulerBootstrapContractService {
  /** Devolve o orchestrator para o shutdown poder chamar `clearAll()`. */
  abstract bootstrap(): SchedulerOrchestrator;
}
