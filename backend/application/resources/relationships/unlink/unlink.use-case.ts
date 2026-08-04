import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import HTTPException from '@application/core/exception.core';
import { RelationshipDefinitionContractRepository } from '@application/repositories/relationship-definition/relationship-definition-contract.repository';
import { RelationshipContractService } from '@application/services/relationship/relationship-contract.service';
import { RelationshipBuilderContractService } from '@application/services/table/relationship-builder-contract.service';

import { definitionBelongsToTable } from '../definition-scope';

import type { RelationshipUnlinkPayload } from './unlink.validator';

type Response = Either<HTTPException, null>;

@Service()
export default class RelationshipUnlinkUseCase {
  constructor(
    private readonly relationship: RelationshipContractService,
    private readonly definitions: RelationshipDefinitionContractRepository,
    private readonly relationshipBuilder: RelationshipBuilderContractService,
  ) {}

  async execute(payload: RelationshipUnlinkPayload): Promise<Response> {
    try {
      const definition = await this.definitions.findById(payload.id);
      if (!definition || !definitionBelongsToTable(definition, payload.slug)) {
        return left(
          HTTPException.NotFound(
            'Relacionamento não encontrado',
            'RELATIONSHIP_NOT_FOUND',
          ),
        );
      }

      // 1:1/1:N: desvincula limpando a FK da row dona (`linkId` == id da row).
      const isPivot = await this.relationship.isPivot(definition);
      if (!isPivot) {
        // Bloqueia deixar um lado obrigatório sem vínculo (RELATIONSHIP_REQUIRED).
        const guard = await this.relationshipBuilder.ensureUnlinkKeepsRequired(
          definition,
          payload.linkId,
        );
        if (guard.isLeft()) return left(guard.value);
        await this.relationshipBuilder.unlinkFk(definition, payload.linkId);
        return right(null);
      }

      const guard = await this.relationship.ensureUnlinkKeepsRequired(
        definition,
        payload.linkId,
      );
      if (guard.isLeft()) return left(guard.value);

      const result = await this.relationship.unlink(payload.linkId);
      if (result.isLeft()) return left(result.value);
      return right(null);
    } catch (error) {
      console.error('[relationships > unlink][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'UNLINK_RELATIONSHIP_ERROR',
        ),
      );
    }
  }
}
