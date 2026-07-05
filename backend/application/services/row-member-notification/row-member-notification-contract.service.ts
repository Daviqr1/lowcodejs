import type { IRow, ITable } from '@application/core/entity.core';

export type NotifyRowMembersParams = {
  table: ITable;
  previousRow: IRow | null;
  nextRow: IRow;
  actorUserId: string;
};

export abstract class RowMemberNotificationContractService {
  /**
   * Compara a row antes/depois e dispara notificação `ROW_MEMBER_ASSIGNED` para
   * os usuários que foram adicionados a campos do tipo USER da tabela.
   *
   * Só aplica para tabelas com estilo KANBAN ou CALENDAR. Para outros estilos
   * é no-op — adicione novos estilos aqui quando fizer sentido notificar.
   */
  abstract notifyNewMembers(params: NotifyRowMembersParams): Promise<void>;
}
