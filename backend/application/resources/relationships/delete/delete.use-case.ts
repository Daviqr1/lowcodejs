import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import HTTPException from '@application/core/exception.core';
import { RelationshipDefinitionContractRepository } from '@application/repositories/relationship-definition/relationship-definition-contract.repository';
import { RelationshipLinkContractRepository } from '@application/repositories/relationship-link/relationship-link-contract.repository';
import { RelationshipContractService } from '@application/services/relationship/relationship-contract.service';

import type { RelationshipDeletePayload } from '../_shared.validator';

type Response = Either<HTTPException, null>;

@Service()
export default class RelationshipDeleteUseCase {
  constructor(
    private readonly definitions: RelationshipDefinitionContractRepository,
    private readonly links: RelationshipLinkContractRepository,
    private readonly relationship: RelationshipContractService,
  ) {}

  async execute(payload: RelationshipDeletePayload): Promise<Response> {
    try {
      const existing = await this.definitions.findById(payload.id);
      if (
        !existing ||
        !this.relationship.belongsToTable(existing, payload.slug)
      ) {
        return left(
          HTTPException.NotFound(
            'Relacionamento não encontrado',
            'RELATIONSHIP_NOT_FOUND',
          ),
        );
      }

      // Remove os vínculos da definição e faz soft-delete da definição.
      await this.links.deleteByRelationship(payload.id);
      await this.definitions.delete(payload.id);

      return right(null);
    } catch (error) {
      console.error('[relationships > delete][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'DELETE_RELATIONSHIP_ERROR',
        ),
      );
    }
  }
}
