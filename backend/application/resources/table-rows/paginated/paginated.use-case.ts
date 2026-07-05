import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import type {
  IMeta,
  IRow,
  Merge,
  Paginated,
} from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { RelationshipDefinitionContractRepository } from '@application/repositories/relationship-definition/relationship-definition-contract.repository';
import { RowContractRepository } from '@application/repositories/row/row-contract.repository';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';
import { FieldVisibilityContractService } from '@application/services/field-visibility/field-visibility-contract.service';
import { RowAccessGuardContractService } from '@application/services/row-access-guard/row-access-guard-contract.service';
import { RowPasswordContractService } from '@application/services/row-password/row-password-contract.service';
import { RelationshipBuilderContractService } from '@application/services/table/relationship-builder-contract.service';
import { RowContextBuilderContractService } from '@application/services/table/row-context-builder-contract.service';

import type { TableRowPaginatedPayload } from './paginated.validator';

type Response = Either<HTTPException, Paginated<IRow>>;

type Payload = Merge<
  TableRowPaginatedPayload,
  {
    user?: string;
    isOwner?: boolean;
    isAdministrator?: boolean;
  }
>;

@Service()
export default class TableRowPaginatedUseCase {
  constructor(
    private readonly tableRepository: TableContractRepository,
    private readonly rowRepository: RowContractRepository,
    private readonly rowPasswordService: RowPasswordContractService,
    private readonly rowContextBuilder: RowContextBuilderContractService,
    private readonly fieldVisibility: FieldVisibilityContractService,
    private readonly rowAccessGuard: RowAccessGuardContractService,
    private readonly relationshipBuilder: RelationshipBuilderContractService,
    private readonly definitionRepository: RelationshipDefinitionContractRepository,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      // perPage <= 0 (ex.: -1) significa "buscar TODOS os registros" (sem
      // paginação). Usado pelas visualizações Kanban/Document/Forum/Calendar/
      // Gantt, que precisam de todos os registros para agrupar corretamente —
      // um limite fixo truncava as colunas quando a tabela tinha muitos rows.
      const fetchAll = payload.perPage <= 0;
      let skip = 0;
      if (!fetchAll) skip = (payload.page - 1) * payload.perPage;
      // No Mongoose, limit(0) equivale a "sem limite" (retorna tudo).
      let limit = 0;
      if (!fetchAll) limit = payload.perPage;

      const table = await this.tableRepository.findBySlug(payload.slug);

      if (!table) {
        return left(
          HTTPException.NotFound('Tabela não encontrada', 'TABLE_NOT_FOUND'),
        );
      }

      const ctx = await this.rowAccessGuard.resolveContext(payload.user);
      const tableId = table._id.toString();
      const guardQuery = await this.rowAccessGuard.composeListQuery(
        tableId,
        {},
        ctx,
        table,
      );

      const hasGuardQuery = Object.keys(guardQuery).length > 0;
      let guardQueryArg: Record<string, unknown> | undefined = undefined;
      if (hasGuardQuery) guardQueryArg = guardQuery;

      console.info(
        `[table-rows > paginated] slug=${payload.slug} tableId=${tableId} ` +
          `style=${String(table.style)} user=${String(payload.user)} ` +
          `isPrivileged=${ctx.isPrivileged} hasGuardQuery=${hasGuardQuery} ` +
          `guardQuery=${JSON.stringify(guardQuery)} skip=${skip} limit=${limit}`,
      );

      // Filtro excludeLinked: oculta registros já vinculados (autocomplete 1:1/N:N).
      let excludeIds: string[] | undefined;
      if (
        payload.excludeLinked &&
        payload.relationshipId &&
        payload.excludeSide
      ) {
        const definition = await this.definitionRepository.findById(
          payload.relationshipId,
        );
        if (definition) {
          excludeIds = await this.relationshipBuilder.findOccupiedIds(
            definition,
            payload.excludeSide,
            payload.excludeForRecordId,
          );
        }
      }

      // Auto-relacionamento: remove o próprio registro editado dos candidatos.
      // Em relacionamento com outra tabela é no-op (o _id não aparece na lista).
      if (payload.excludeSelfId) {
        if (excludeIds) excludeIds.push(payload.excludeSelfId);
        else excludeIds = [payload.excludeSelfId];
      }

      const rows = await this.rowRepository.findMany({
        table,
        rawFilters: payload,
        skip,
        limit,
        guardQuery: guardQueryArg,
        excludeIds,
      });

      const total = await this.rowRepository.count(
        table,
        payload,
        guardQueryArg,
        excludeIds,
      );

      console.info(
        `[table-rows > paginated] slug=${payload.slug} rows=${rows.length} ` +
          `total=${total}`,
      );

      let perPage = payload.perPage;
      if (fetchAll) perPage = total;
      let page = payload.page;
      if (fetchAll) page = 1;
      let lastPage = Math.ceil(total / payload.perPage);
      if (fetchAll) lastPage = 1;

      const meta: IMeta = {
        total,
        perPage,
        page,
        lastPage,
        firstPage: Number(total > 0),
      };

      const hidden = await this.fieldVisibility.hiddenSlugs({
        fields: table.fields,
        context: 'list',
        userId: payload.user,
        isOwner: payload.isOwner,
        isAdministrator: payload.isAdministrator,
      });

      const data = rows.map((row) => {
        this.rowPasswordService.mask(row, table.fields);
        const transformed = this.rowContextBuilder.transform(
          row,
          table.fields,
          payload.user,
        );
        return this.fieldVisibility.project(transformed, hidden);
      });

      return right({
        meta,
        data,
      });
    } catch (error) {
      console.error('[table-rows > paginated][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'LIST_ROW_TABLE_PAGINATED_ERROR',
        ),
      );
    }
  }
}
