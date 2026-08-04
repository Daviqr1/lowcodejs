import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import type { IRelationshipDefinition } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { RelationshipDefinitionContractRepository } from '@application/repositories/relationship-definition/relationship-definition-contract.repository';
import { RelationshipContractService } from '@application/services/relationship/relationship-contract.service';

import type { RelationshipUpdatePayload } from './update.validator';

type Response = Either<HTTPException, IRelationshipDefinition>;

@Service()
export default class RelationshipUpdateUseCase {
  constructor(
    private readonly definitions: RelationshipDefinitionContractRepository,
    private readonly relationship: RelationshipContractService,
  ) {}

  async execute(payload: RelationshipUpdatePayload): Promise<Response> {
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

      const definition = await this.definitions.update({
        _id: payload.id,
        name: payload.name,
        source: payload.source,
        target: payload.target,
        onDelete: payload.onDelete,
      });

      return right(definition);
    } catch (error) {
      console.error('[relationships > update][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'UPDATE_RELATIONSHIP_ERROR',
        ),
      );
    }
  }
}
