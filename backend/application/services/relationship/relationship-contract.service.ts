import type { Either } from '@application/core/either.core';
import type {
  E_RELATIONSHIP_CARDINALITY,
  E_RELATIONSHIP_STORAGE,
  IField,
  IRelationshipDefinition,
  IRelationshipLink,
  Merge,
  ValueOf,
} from '@application/core/entity.core';
import type HTTPException from '@application/core/exception.core';
import type { RelationshipLinkSide } from '@application/repositories/relationship-link/relationship-link-contract.repository';

export type RelationshipCanLinkParams = {
  definition: IRelationshipDefinition;
  sourceField: Pick<IField, 'multiple' | 'relationship'>;
  targetField: Pick<IField, 'multiple' | 'relationship'>;
  sourceId: string;
  targetId: string;
};

export type RelationshipLinkParams = Merge<
  RelationshipCanLinkParams,
  {
    metadata?: Record<string, unknown> | null;
  }
>;

// Endpoint dono da FK (lado OWNS_FK) resolvido de uma definicao. O lado REVERSE
// usa `tableSlug` (colecao a consultar) + `fieldSlug` (path da FK) na query
// reversa; `tableId` alimenta o `ref` do populate nativo no lado OWNS_FK.
export type RelationshipOwner = {
  side: RelationshipLinkSide;
  tableId: string;
  tableSlug: string;
  fieldSlug: string;
};

// Reconcilia os vinculos de um registro (lado `side`) para o conjunto desejado:
// adiciona os ids novos (via canLink) e remove os ausentes. Usado na escrita de
// row, onde `row[slug]` carrega o conjunto completo desejado.
export type RelationshipReplaceParams = {
  definition: IRelationshipDefinition;
  recordId: string;
  side: RelationshipLinkSide;
  desiredIds: string[];
  sourceField: Pick<IField, 'multiple' | 'relationship'>;
  targetField: Pick<IField, 'multiple' | 'relationship'>;
};

export abstract class RelationshipContractService {
  /**
   * O `TableAccessMiddleware` autoriza contra a tabela de `:slug`, mas os
   * use-cases carregavam a definition so por `:id` — quem tinha acesso a
   * tabela A operava relacionamentos da tabela B (IDOR). Uma definition so e
   * visivel pelo slug de um dos seus dois lados.
   */
  abstract belongsToTable(
    definition: IRelationshipDefinition,
    slug: string,
  ): boolean;

  /**
   * Erro de dominio: desvincular deixaria um lado obrigatorio sem vinculo.
   * Fica aqui porque o relationship-builder precisa da mesma mensagem.
   */
  abstract requiredError(): HTTPException;

  // Cardinalidade derivada dos dois `field.multiple` (nao persistida, §5.2).
  abstract cardinalityOf(
    sourceField: Pick<IField, 'multiple'>,
    targetField: Pick<IField, 'multiple'>,
  ): ValueOf<typeof E_RELATIONSHIP_CARDINALITY>;
  // True só em N:N (PIVOT). Os endpoints `/links` (link/unlink/list/reorder) são
  // N:N-only — 1:1/1:N gerem a FK via row create/update, não por vínculos.
  abstract isPivot(definition: IRelationshipDefinition): Promise<boolean>;
  // Papel de armazenamento do lado `side` (OWNS_FK / REVERSE / PIVOT).
  abstract storageRoleOf(
    side: RelationshipLinkSide,
    sourceField: Pick<IField, 'multiple'>,
    targetField: Pick<IField, 'multiple'>,
  ): ValueOf<typeof E_RELATIONSHIP_STORAGE>;
  // Role derivado de um campo RELATIONSHIP (via `field.relationship`); null em
  // dados legados sem side/mirror.
  abstract roleOfField(
    field: Pick<IField, 'multiple' | 'relationship'>,
  ): ValueOf<typeof E_RELATIONSHIP_STORAGE> | null;
  // Endpoint dono da FK; null em N:N (pivo, sem dono single).
  abstract ownerOf(
    definition: IRelationshipDefinition,
    sourceField: Pick<IField, 'multiple'>,
    targetField: Pick<IField, 'multiple'>,
  ): RelationshipOwner | null;
  // Valida regras de cardinalidade/duplicidade/auto-vinculo antes de vincular.
  abstract canLink(
    params: RelationshipCanLinkParams,
  ): Promise<Either<HTTPException, true>>;
  // Cria o vinculo (apos canLink), apendando na lista do lado source.
  abstract link(
    params: RelationshipLinkParams,
  ): Promise<Either<HTTPException, IRelationshipLink>>;
  // Remove um vinculo pelo seu _id.
  abstract unlink(linkId: string): Promise<Either<HTTPException, true>>;
  // Bloqueia o unlink (N:N) que deixaria um lado `required` sem vinculo
  // (RELATIONSHIP_REQUIRED, §5.6). O caso FK (1:1/1:N) vive no builder.
  abstract ensureUnlinkKeepsRequired(
    definition: IRelationshipDefinition,
    linkId: string,
  ): Promise<Either<HTTPException, true>>;
  // Ids dos registros relacionados a `recordId` lendo pelo lado informado.
  abstract resolveLinkedIds(
    definition: IRelationshipDefinition,
    recordId: string,
    side: RelationshipLinkSide,
  ): Promise<string[]>;
  // Versao em lote: resolve os ids ligados de varios registros numa unica query
  // (mapa recordId -> ids). Base da hidratacao N:N por pagina (sem N+1).
  abstract resolveLinkedIdsBatch(
    definition: IRelationshipDefinition,
    recordIds: string[],
    side: RelationshipLinkSide,
  ): Promise<Map<string, string[]>>;
  // Filtro PIVOT: ids dos registros do lado `side` cujos vinculos tocam algum dos
  // `otherIds` (na ponta oposta). Base do filtro N:N (`{ _id: { $in } }`).
  abstract resolveOwningIds(
    relationshipId: string,
    side: RelationshipLinkSide,
    otherIds: string[],
  ): Promise<string[]>;
  // Reconcilia os vinculos de um registro para o conjunto `desiredIds`.
  abstract replaceLinks(
    params: RelationshipReplaceParams,
  ): Promise<Either<HTTPException, true>>;
}
