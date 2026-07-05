import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import type { IMeta, IRelationshipLink } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { RelationshipDefinitionContractRepository } from '@application/repositories/relationship-definition/relationship-definition-contract.repository';
import { RelationshipLinkContractRepository } from '@application/repositories/relationship-link/relationship-link-contract.repository';
import { RelationshipContractService } from '@application/services/relationship/relationship-contract.service';
import { RelationshipBuilderContractService } from '@application/services/table/relationship-builder-contract.service';

import type { RelationshipListBySidePayload } from './list-by-side.validator';

type ListResult = { data: IRelationshipLink[]; meta: IMeta };
type Response = Either<HTTPException, ListResult>;

@Service()
export default class RelationshipListBySideUseCase {
  constructor(
    private readonly links: RelationshipLinkContractRepository,
    private readonly definitions: RelationshipDefinitionContractRepository,
    private readonly relationship: RelationshipContractService,
    private readonly relationshipBuilder: RelationshipBuilderContractService,
  ) {}

  async execute(payload: RelationshipListBySidePayload): Promise<Response> {
    try {
      const definition = await this.definitions.findById(payload.id);
      if (!definition) {
        return left(
          HTTPException.NotFound(
            'Relacionamento não encontrado',
            'RELATIONSHIP_NOT_FOUND',
          ),
        );
      }

      // N:N lista pelo pivo; 1:1/1:N traduz a FK em links sintéticos (a tela de
      // detalhe consome os dois do mesmo jeito).
      let data: IRelationshipLink[] = [];
      let total = 0;
      const isPivot = await this.relationship.isPivot(definition);
      if (isPivot) {
        const page = await this.links.paginateBySide({
          relationshipId: payload.id,
          side: payload.side,
          recordId: payload.recordId,
          page: payload.page,
          perPage: payload.perPage,
        });
        data = page.data;
        total = page.total;
      }
      if (!isPivot) {
        const page = await this.relationshipBuilder.listFkLinks(
          definition,
          payload.side,
          payload.recordId,
          payload.page,
          payload.perPage,
        );
        data = page.data;
        total = page.total;
      }

      const lastPage = Math.max(1, Math.ceil(total / payload.perPage));

      return right({
        data,
        meta: {
          total,
          page: payload.page,
          perPage: payload.perPage,
          lastPage,
          firstPage: 1,
        },
      });
    } catch (error) {
      console.error('[relationships > list-by-side][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'LIST_RELATIONSHIP_LINKS_ERROR',
        ),
      );
    }
  }
}
