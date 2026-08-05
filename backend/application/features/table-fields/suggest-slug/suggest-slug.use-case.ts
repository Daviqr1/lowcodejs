import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import HTTPException from '@application/core/exception.core';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';
import { SlugContractService } from '@application/services/slug/slug-contract.service';

import type { TableFieldSuggestSlugPayload } from '../_shared.validator';

type Response = Either<HTTPException, { slug: string }>;

@Service()
export default class TableFieldSuggestSlugUseCase {
  constructor(
    private readonly tableRepository: TableContractRepository,
    private readonly slugService: SlugContractService,
  ) {}

  async execute(payload: TableFieldSuggestSlugPayload): Promise<Response> {
    try {
      const table = await this.tableRepository.findBySlug(payload.tableSlug);

      if (!table) {
        return left(
          HTTPException.NotFound('Tabela não encontrada', 'TABLE_NOT_FOUND'),
        );
      }

      const existingSlugs = (table.fields ?? [])
        .filter((field) => !field.trashed)
        .map((field) => field.slug);

      return right({
        slug: this.slugService.unique(payload.name, existingSlugs),
      });
    } catch (error) {
      console.error('[table-fields > suggest-slug][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'SUGGEST_FIELD_SLUG_ERROR',
        ),
      );
    }
  }
}
