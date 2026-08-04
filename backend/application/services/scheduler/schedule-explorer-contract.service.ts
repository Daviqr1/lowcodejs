/**
 * Percorre as classes registradas pelos decorators, resolve cada instancia por
 * DI e entrega os metodos agendados ao orchestrator.
 */
export abstract class ScheduleExplorerContractService {
  abstract explore(): void;
}
