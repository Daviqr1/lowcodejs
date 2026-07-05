import { Service } from 'fastify-decorators';
import type mongoose from 'mongoose';

import type {
  IField,
  IGroupConfiguration,
} from '@application/core/entity.core';
import { E_FIELD_TYPE } from '@application/core/entity.core';
import { Evaluation } from '@application/model/evaluation.model';
import { Reaction } from '@application/model/reaction.model';
import { Storage } from '@application/model/storage.model';
import { Table } from '@application/model/table.model';
import { User } from '@application/model/user.model';

import { FieldGroupBuilderContractService } from './field-group-builder-contract.service';
import { ModelBuilderContractService } from './model-builder-contract.service';
import { PopulateBuilderContractService } from './populate-builder-contract.service';

type RelationModel = Awaited<ReturnType<ModelBuilderContractService['build']>>;
// Doc hidratado do model Table (inferido do próprio model — `Table` usa um
// `Entity` interno não exportado; inferir o tipo hidratado do model mantém o
// tipo em sincronia sem cast).
type ModelDocument<M> =
  M extends mongoose.Model<
    infer _TRaw,
    infer _TQuery,
    infer _TMethods,
    infer _TVirtuals,
    infer THydrated
  >
    ? THydrated
    : never;
type RelationshipTableDoc = ModelDocument<typeof Table>;

/**
 * Caches por request que tornam o populate linear. Sem eles cada nó da árvore
 * faz `Table.findOne().populate()` no DB e reexpande a mesma subárvore em todo
 * ramo irmão — O(branching^depth). Com eles cada tabela é buscada/compilada 1×
 * e cada subárvore `(tableId, depth)` é montada 1× e reusada — O(tabelas×depth).
 */
type PopulateBuildCaches = {
  table: Map<string, RelationshipTableDoc | null>;
  model: Map<string, RelationModel>;
  subtree: Map<string, mongoose.PopulateOptions[]>;
};

@Service()
export default class MongoosePopulateBuilder implements PopulateBuilderContractService {
  /**
   * Profundidade maxima de populate aninhado de relacionamentos. 3 cobre labels
   * multi-hop (ex.: `fornecedor.cidade.uf`) sem regredir o frontend, que navega
   * o path por pontos contra o objeto ja populado.
   *
   * O custo NAO vem da profundidade e sim de (1) o antigo `visited` ser
   * por-caminho (mesmo target reexpandido em milhares de ramos irmaos) e (2)
   * cada no fazer um `Table.findOne().populate()` no DB. A memoizacao por
   * request (`PopulateBuildCaches`) torna o custo linear — O(tabelas×depth) — e
   * desacopla a profundidade da explosao, entao mantemos uma profundidade util.
   */
  private static readonly MAX_RELATIONSHIP_DEPTH = 3;

  constructor(
    private readonly model: ModelBuilderContractService,
    private readonly fieldGroup: FieldGroupBuilderContractService,
  ) {}

  getRelationships(fields: IField[] = []): IField[] {
    const types = [
      E_FIELD_TYPE.RELATIONSHIP,
      E_FIELD_TYPE.FILE,
      E_FIELD_TYPE.REACTION,
      E_FIELD_TYPE.EVALUATION,
      E_FIELD_TYPE.USER,
      E_FIELD_TYPE.CREATOR,
      E_FIELD_TYPE.UPDATER,
    ];

    return fields.filter(
      (field) => field.type && types.some((t) => t === field.type),
    );
  }

  async build(
    fields?: IField[],
    groups?: IGroupConfiguration[],
    conn?: mongoose.Connection,
    depth: number = MongoosePopulateBuilder.MAX_RELATIONSHIP_DEPTH,
    // Ancestor table IDs na cadeia atual de populate — rompe ciclos quando a
    // tabela alvo já aparece no caminho. O caller passa o ID da tabela raiz
    // para que qualquer campo que aponte de volta para ela também seja cortado.
    visited?: Set<string>,
  ): Promise<mongoose.PopulateOptions[]> {
    const caches: PopulateBuildCaches = {
      table: new Map(),
      model: new Map(),
      subtree: new Map(),
    };

    const ancestors: ReadonlySet<string> = visited ?? new Set<string>();
    return this.buildPopulateTree(
      fields,
      groups,
      conn,
      depth,
      caches,
      ancestors,
    );
  }

  /**
   * Resolve o doc da tabela alvo (por id ou slug), memoizado por request — uma
   * busca por tabela em vez de uma por nó da árvore.
   */
  private async resolveTable(
    id: string | undefined,
    slug: string | undefined,
    caches: PopulateBuildCaches,
  ): Promise<RelationshipTableDoc | null> {
    let key = '';
    if (id) key = `id:${id}`;
    else if (slug) key = `slug:${slug}`;
    else return null;

    const cached = caches.table.get(key);
    if (cached !== undefined) return cached;

    let table: RelationshipTableDoc | null = null;
    if (id) {
      table = await Table.findOne({
        _id: id,
        trashed: { $ne: true },
      }).populate(['fields', 'groups.fields']);
    } else if (slug) {
      table = await Table.findOne({
        slug,
        trashed: { $ne: true },
      }).populate(['fields', 'groups.fields']);
    }

    caches.table.set(key, table);
    return table;
  }

  /** Compila o model dinâmico da tabela alvo, memoizado por request. */
  private async resolveModel(
    table: RelationshipTableDoc,
    caches: PopulateBuildCaches,
  ): Promise<RelationModel> {
    const tableId = table._id.toString();

    const cached = caches.model.get(tableId);
    if (cached) return cached;

    const model = await this.model.build({
      ...table.toJSON({ flattenObjectIds: true }),
      _id: tableId,
    });

    caches.model.set(tableId, model);
    return model;
  }

  private async buildPopulateTree(
    fields: IField[] | undefined,
    groups: IGroupConfiguration[] | undefined,
    conn: mongoose.Connection | undefined,
    depth: number,
    caches: PopulateBuildCaches,
    ancestors: ReadonlySet<string> = new Set(),
  ): Promise<mongoose.PopulateOptions[]> {
    const relacionamentos = this.getRelationships(fields);
    const populate: mongoose.PopulateOptions[] = [];

    for await (const field of relacionamentos) {
      if (field.type === E_FIELD_TYPE.FILE) {
        populate.push({
          path: field.slug,
          model: Storage,
        });
      }

      if (field.type === E_FIELD_TYPE.USER) {
        populate.push({
          path: field.slug,
          model: User,
          select: 'name email _id',
        });
      }

      if (field.type === E_FIELD_TYPE.CREATOR) {
        populate.push({
          path: field.slug,
          model: User,
          select: 'name email _id',
        });
      }

      if (field.type === E_FIELD_TYPE.UPDATER) {
        populate.push({
          path: field.slug,
          model: User,
          select: 'name email _id',
        });
      }

      if (field.type === E_FIELD_TYPE.REACTION) {
        populate.push({
          path: field.slug,
          model: Reaction,
          select: 'user type',
        });
      }

      if (field.type === E_FIELD_TYPE.EVALUATION) {
        populate.push({
          path: field.slug,
          model: Evaluation,
          select: 'user value',
        });
      }

      if (field.type === E_FIELD_TYPE.RELATIONSHIP) {
        // Campo não-materializado (sem relationshipId) não tem ref válida para
        // expandir aqui; a hidratação real é por links (relationship-builder).
        // Pula.
        if (!field?.relationship?.relationshipId) continue;

        const relationshipTable = await this.resolveTable(
          field?.relationship?.table?._id?.toString(),
          field?.relationship?.table?.slug,
          caches,
        );

        if (relationshipTable && conn) {
          const nextTableId = relationshipTable._id.toString();

          console.info(
            `[populate-builder > build] field=${field.slug} ` +
              `target=${String(relationshipTable.slug)} depth=${depth}`,
          );

          const relationModel = await this.resolveModel(
            relationshipTable,
            caches,
          );

          // Ciclo detectado: tabela alvo já está na cadeia de ancestors.
          // Popula o campo para resolver o label imediato, mas sem sub-populate.
          if (ancestors.has(nextTableId)) {
            populate.push({ path: field.slug, model: relationModel });
            continue;
          }

          const nextAncestors = new Set([...ancestors, nextTableId]);
          const relationshipPopulate = await this.resolveSubtree(
            relationshipTable,
            conn,
            depth,
            caches,
            nextAncestors,
          );

          populate.push({
            path: field.slug,
            model: relationModel,
            ...(relationshipPopulate.length > 0 && {
              populate: relationshipPopulate,
            }),
          });
        }
      }
    }

    if (groups) {
      populate.push(...this.fieldGroup.buildPopulate(fields ?? [], groups));
    }

    return [...populate];
  }

  /**
   * Subárvore de populate dos relacionamentos do alvo, memoizada por
   * `(tableId, depth, ancestors)`. A subárvore depende do conjunto de
   * ancestors porque o cycle-detection corta caminhos distintos de formas
   * distintas — ramos com ancestors diferentes podem gerar subárvores diferentes.
   * A recursão termina por `depth <= 1` ou ciclo detectado.
   */
  private async resolveSubtree(
    table: RelationshipTableDoc,
    conn: mongoose.Connection,
    depth: number,
    caches: PopulateBuildCaches,
    ancestors: ReadonlySet<string>,
  ): Promise<mongoose.PopulateOptions[]> {
    const nextDepth = depth - 1;
    const ancestorKey = [...ancestors].sort().join(',');
    const key = `${table._id.toString()}:${nextDepth}:${ancestorKey}`;

    const cached = caches.subtree.get(key);
    if (cached) return cached;

    let subtree: mongoose.PopulateOptions[] = [];
    if (depth > 1) {
      subtree = await this.buildPopulateTree(
        this.getRelationships(table?.fields ?? []),
        table?.groups ?? [],
        conn,
        nextDepth,
        caches,
        ancestors,
      );
    }

    caches.subtree.set(key, subtree);
    return subtree;
  }
}
