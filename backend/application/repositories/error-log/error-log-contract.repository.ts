/* eslint-disable no-unused-vars */

// Usuário (populado) associado ao erro — exibido na coluna "Usuário" da tela.
export interface IErrorLogUser {
  _id: string;
  name: string;
  email: string;
}

// Entidade de log de ERRO do sistema ("Histórico de erros"). Definida aqui (não
// em entity.core) para manter o arquivo central enxuto — o model e os demais
// consumidores importam deste contrato.
export interface IErrorLog {
  _id: string;
  statusCode: number;
  message: string;
  cause: string | null;
  method: string;
  url: string;
  user: IErrorLogUser | null;
  errors: unknown;
  resolved: boolean;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ErrorLogCreatePayload {
  statusCode: number;
  message: string;
  cause?: string | null;
  method: string;
  url: string;
  user_id?: string | null;
  errors?: unknown;
}

export interface ErrorLogQueryPayload {
  page: number;
  perPage: number;
  search?: string;
  // Filtro por status HTTP — aceita vários (ex.: [404, 500]).
  statuses?: number[];
  // Intervalo sobre createdAt.
  dateFrom?: Date;
  dateTo?: Date;
  // Visão: false = em aberto (default), true = resolvidos.
  resolved?: boolean;
  // Ordenação por coluna ({ createdAt: -1 } é o default no repositório).
  sort?: Record<string, 1 | -1>;
}

export abstract class ErrorLogContractRepository {
  // Gravação é fire-and-forget (o hook não usa o retorno) — por isso void.
  abstract create(payload: ErrorLogCreatePayload): Promise<void>;
  abstract findMany(payload: ErrorLogQueryPayload): Promise<IErrorLog[]>;
  abstract count(payload: ErrorLogQueryPayload): Promise<number>;
  // Marca/desmarca um erro como resolvido. Retorna se o registro existe.
  abstract setResolved(id: string, resolved: boolean): Promise<boolean>;
}
