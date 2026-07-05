import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import HTTPException from '@application/core/exception.core';
import { RelationshipDefinitionContractRepository } from '@application/repositories/relationship-definition/relationship-definition-contract.repository';
import { RelationshipLinkContractRepository } from '@application/repositories/relationship-link/relationship-link-contract.repository';
import { RelationshipContractService } from '@application/services/relationship/relationship-contract.service';

import type { RelationshipReorderPayload } from './reorder.validator';

type Response = Either<HTTPException, null>;

@Service()
export default class RelationshipReorderUseCase {
  constructor(
    private readonly links: RelationshipLinkContractRepository,
    private readonly definitions: RelationshipDefinitionContractRepository,
    private readonly relationship: RelationshipContractService,
  ) {}

  async execute(payload: RelationshipReorderPayload): Promise<Response> {
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

      // Só o pivô (N:N) tem ordem persistível. 1:1/1:N (FK) não têm coluna de
      // ordem — no-op (a UI reordena visualmente, sem persistir).
      const isPivot = await this.relationship.isPivot(definition);
      if (!isPivot) return right(null);

      for (const item of payload.items) {
        await this.links.setOrder(item.linkId, item.order);
      }
      return right(null);
    } catch (error) {
      console.error('[relationships > reorder][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'REORDER_RELATIONSHIP_LINKS_ERROR',
        ),
      );
    }
  }
}
