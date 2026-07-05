/* eslint-disable no-unused-vars */
import type { Either } from '@application/core/either.core';
import type {
  IField,
  IRelationshipDefinition,
  IRelationshipLink,
} from '@application/core/entity.core';
import type HTTPException from '@application/core/exception.core';
import type { RelationshipLinkSide } from '@application/repositories/relationship-link/relationship-link-contract.repository';

// Documento Mongoose minimo necessario para hidratar o path embedded a partir
// dos links (sem depender do tipo concreto do model dinamico).
export type RelationshipHydratableDoc = {
  _id: { toString(): string };
  set(path: string, value: unknown): void;
};

// Um campo RELATIONSHIP do payload de escrita ja separado da row, com o
// conjunto de ids desejado (fonte da reconciliacao de links).
export type PendingRelationship = {
  field: IField;
  ids: string[];
};

export type RelationshipExtractResult = {
  // Payload da row sem os campos RELATIONSHIP geridos por links.
  data: Record<string, unknown>;
  pending: PendingRelationship[];
};

export abstract class RelationshipBuilderContractService {
  // Read-compat: hidrata `doc[field.slug]` com os ids vindos dos links, para que
  // o populate padrao resolva como antes. Atua em TODO campo RELATIONSHIP (links
  // sao a unica fonte de verdade); campo sem `relationshipId` tem o path zerado e
  // logado — nunca serve o array embedded legado (zero legado).
  abstract hydrate(
    fields: IField[],
    docs: RelationshipHydratableDoc[],
  ): Promise<void>;

  // Separa do payload de escrita os campos RELATIONSHIP por role: OWNS_FK fica no
  // payload como FK single (escrita nativa); REVERSE/PIVOT viram `pending`.
  abstract extract(
    fields: IField[],
    data: Record<string, unknown>,
  ): RelationshipExtractResult;

  // Read-compat: embrulha em array os campos OWNS_FK (FK single -> [obj]/[]) na
  // projecao final, para a UI continuar consumindo `row[slug]` como lista.
  abstract normalizeReadProjection(
    fields: IField[],
    row: Record<string, unknown>,
  ): void;

  // Filtro role-aware: traduz `otherIds` (ids selecionados na sidebar) num
  // fragmento de query por papel. OWNS_FK -> null (caller filtra `{[slug]:{$in}}`
  // direto, FK na row); REVERSE -> `{ _id: { $in } }` via colecao do dono;
  // PIVOT/legado -> `{ _id: { $in } }` via links na ponta oposta.
  abstract resolveRelationshipFilter(
    field: IField,
    otherIds: string[],
  ): Promise<Record<string, unknown> | null>;

  // Persiste (reconcilia) os links de um registro. Lanca HTTPException quando a
  // cardinalidade/duplicidade e violada.
  abstract persist(
    fields: IField[],
    recordId: string,
    pending: PendingRelationship[],
  ): Promise<void>;

  // True quando ha pelo menos um campo RELATIONSHIP gerido por links (pivo).
  abstract hasManagedRelationships(fields: IField[]): boolean;

  // ── Gestão FK (1:1/1:N) traduzida para o formato de link (detalhe) ──────────
  // A tela de detalhe usa os endpoints /links com o widget de gestão. Para
  // 1:1/1:N não há pivo: estes métodos leem/escrevem a FK na colação do dono e
  // devolvem "links sintéticos" no mesmo formato `IRelationshipLink` (o `_id` é o
  // id da row dona da FK, para o unlink). N:N continua no pivo (não passa aqui).

  // Lista paginada dos relacionados de `recordId` no lado `side` como links
  // sintéticos (REVERSE: filhos por FK; OWNS_FK: a FK single da própria row).
  abstract listFkLinks(
    definition: IRelationshipDefinition,
    side: RelationshipLinkSide,
    recordId: string,
    page: number,
    perPage: number,
  ): Promise<{ data: IRelationshipLink[]; total: number }>;

  // Vincula `otherId` a `recordId` escrevendo a FK na row dona (OWNS_FK: a
  // própria; REVERSE: o filho). Devolve o link sintético.
  abstract linkFk(
    definition: IRelationshipDefinition,
    side: RelationshipLinkSide,
    recordId: string,
    otherId: string,
  ): Promise<IRelationshipLink>;

  // Desvincula limpando a FK da row dona (`_id` do link sintético == id da row).
  abstract unlinkFk(
    definition: IRelationshipDefinition,
    linkId: string,
  ): Promise<void>;

  // Bloqueia o unlink (FK 1:1/1:N) que deixaria um lado `required` sem vinculo:
  // o dono da FK (linkId) zera para 0; o lado reverso pode perder o último filho
  // (RELATIONSHIP_REQUIRED, §5.6). O caso N:N vive no RelationshipService.
  abstract ensureUnlinkKeepsRequired(
    definition: IRelationshipDefinition,
    linkId: string,
  ): Promise<Either<HTTPException, true>>;

  // IDs do lado `queriedSide` ja ocupados (vinculados) nesta relationship.
  // excludeForRecordId: remove do resultado os IDs vinculados a este registro
  // (mantém a seleção atual visível no autocomplete durante edição).
  abstract findOccupiedIds(
    definition: IRelationshipDefinition,
    queriedSide: RelationshipLinkSide,
    excludeForRecordId?: string,
  ): Promise<string[]>;
}
