import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import type { IField, Merge, Paginated } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { RowContractRepository } from '@application/repositories/row/row-contract.repository';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';
import { HttpResponseContractService } from '@application/services/http-response/http-response-contract.service';
import { RowAccessGuardContractService } from '@application/services/row-access-guard/row-access-guard-contract.service';
import { RowPasswordContractService } from '@application/services/row-password/row-password-contract.service';
import { TableGroupContractService } from '@application/services/table-group/table-group-contract.service';
import { TypeGuardContractService } from '@application/services/type-guard/type-guard-contract.service';

import type { GroupRowPaginatedPayload } from '../_shared.validator';

type Response = Either<HTTPException, Paginated<Record<string, unknown>>>;
type Payload = Merge<GroupRowPaginatedPayload, { __actorUserId?: string }>;

@Service()
export default class GroupRowPaginatedUseCase {
  constructor(
    private readonly tableRepository: TableContractRepository,
    private readonly rowRepository: RowContractRepository,
    private readonly rowPasswordService: RowPasswordContractService,
    private readonly rowAccessGuard: RowAccessGuardContractService,
    private readonly typeGuard: TypeGuardContractService,
    private readonly http: HttpResponseContractService,
    private readonly tableGroup: TableGroupContractService,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      const page = Math.max(1, Number(payload.page) || 1);
      const perPage = Math.max(1, Number(payload.perPage) || 50);
      const skip = (page - 1) * perPage;

      const resolved = await this.tableGroup.resolve(
        payload.slug,
        payload.groupSlug,
      );
      if (resolved.isLeft()) return left(resolved.value);
      const { table, groupField } = resolved.value;

      const row = await this.rowRepository.findOne({
        table,
        query: { _id: payload.rowId },
      });

      if (!row)
        return left(
          HTTPException.NotFound('Registro não encontrado', 'ROW_NOT_FOUND'),
        );

      const denied = await this.rowAccessGuard.assertCanReadParentRow({
        table,
        row,
        actorUserId: payload.__actorUserId,
      });
      if (denied) return left(denied);

      const rawItems = row[groupField.slug];
      const allItems: Record<string, unknown>[] = [];

      if (Array.isArray(rawItems)) {
        for (const item of rawItems) {
          // Mostra rascunhos (status='draft') junto dos publicados; o
          // frontend exibe badge. Oculta apenas itens na lixeira (trashedAt).
          if (this.typeGuard.isRecord(item) && item.trashedAt == null) {
            allItems.push(item);
          }
        }
      }

      const total = allItems.length;
      const meta = this.http.paginationMeta(total, { page, perPage });

      const paginated = allItems.slice(skip, skip + perPage);

      const group = table.groups?.find((g) => g.slug === payload.groupSlug);
      const groupFields: IField[] = group?.fields || [];
      for (const item of paginated) {
        this.rowPasswordService.mask(item, groupFields);
      }

      return right({ data: paginated, meta });
    } catch (error) {
      console.error('[group-rows > paginated][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'LIST_GROUP_ROWS_PAGINATED_ERROR',
        ),
      );
    }
  }
}
