/* eslint-disable no-unused-vars */
import type { IRow, ITable } from '@application/core/entity.core';

export type NotifyMentionsParams = {
  table: ITable;
  row: IRow;
  actorUserId: string;
};

export type NotifyMentionsResult = {
  changed: boolean;
  data?: Record<string, unknown>;
};

export abstract class KanbanCommentMentionContractService {
  abstract notifyNewMentions(
    params: NotifyMentionsParams,
  ): Promise<NotifyMentionsResult>;
}
