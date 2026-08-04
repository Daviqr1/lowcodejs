import type { IRelationshipDefinition } from '@application/core/entity.core';

/**
 * O `TableAccessMiddleware` autoriza contra a tabela de `:slug`, mas os
 * use-cases carregavam a definition so por `:id` — quem tinha acesso a tabela A
 * operava relacionamentos da tabela B (IDOR). Uma definition so e visivel pelo
 * slug de um dos seus dois lados.
 */
export function definitionBelongsToTable(
  definition: IRelationshipDefinition,
  slug: string,
): boolean {
  return (
    definition.source?.table?.slug === slug ||
    definition.target?.table?.slug === slug
  );
}
