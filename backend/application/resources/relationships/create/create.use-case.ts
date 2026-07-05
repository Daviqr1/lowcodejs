import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import type { IRelationshipDefinition } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { RelationshipDefinitionContractRepository } from '@application/repositories/relationship-definition/relationship-definition-contract.repository';

import type { RelationshipCreatePayload } from './create.validator';

type Response = Either<HTTPException, IRelationshipDefinition>;

@Service()
export default class RelationshipCreateUseCase {
  constructor(
    private readonly definitions: RelationshipDefinitionContractRepository,
  ) {}

  async execute(payload: RelationshipCreatePayload): Promise<Response> {
    try {
      // Auto-relacionamento (source/target mesma tabela) e permitido (§4.5);
      // apenas o vinculo trivial (mesmo registro) e bloqueado ao vincular.
      const name =
        payload.name ?? `${payload.source.label} ↔ ${payload.target.label}`;

      const definition = await this.definitions.create({
        name,
        source: payload.source,
        target: payload.target,
        onDelete: payload.onDelete,
      });

      return right(definition);
    } catch (error) {
      console.error('[relationships > create][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'CREATE_RELATIONSHIP_ERROR',
        ),
      );
    }
  }
}
