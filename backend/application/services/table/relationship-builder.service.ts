import { Service } from 'fastify-decorators';
import mongoose from 'mongoose';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import type {
  IField,
  IRelationshipDefinition,
  IRelationshipLink,
} from '@application/core/entity.core';
import {
  E_FIELD_TYPE,
  E_RELATIONSHIP_STORAGE,
} from '@application/core/entity.core';
import type HTTPException from '@application/core/exception.core';
import { FieldContractRepository } from '@application/repositories/field/field-contract.repository';
import { RelationshipDefinitionContractRepository } from '@application/repositories/relationship-definition/relationship-definition-contract.repository';
import { RelationshipLinkContractRepository } from '@application/repositories/relationship-link/relationship-link-contract.repository';
import type { RelationshipLinkSide } from '@application/repositories/relationship-link/relationship-link-contract.repository';
import { RelationshipContractService } from '@application/services/relationship/relationship-contract.service';
import { getDataConnection } from '@config/database.config';

import type {
  PendingRelationship,
  RelationshipBuilderContractService,
  RelationshipExtractResult,
  RelationshipHydratableDoc,
} from './relationship-builder-contract.service';

// Endpoint multiples derivados do proprio campo (denormalizado em
// `field.relationship`), na ordem source/target — alimenta role/owner sem DB.
type EndpointMultiples = {
  sourceField: Pick<IField, 'multiple'>;
  targetField: Pick<IField, 'multiple'>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

@Service()
export default class MongooseRelationshipBuilder implements RelationshipBuilderContractService {
  constructor(
    private readonly definitionRepository: RelationshipDefinitionContractRepository,
    private readonly fieldRepository: FieldContractRepository,
    private readonly linkRepository: RelationshipLinkContractRepository,
    private readonly relationship: RelationshipContractService,
  ) {}

  hasManagedRelationships(fields: IField[]): boolean {
    return this.relationshipFields(fields).length > 0;
  }

  async hydrate(
    fields: IField[],
    docs: RelationshipHydratableDoc[],
  ): Promise<void> {
    const relationshipFields = this.relationshipFields(fields);
    if (relationshipFields.length === 0 || docs.length === 0) return;

    for (const field of relationshipFields) {
      try {
        await this.hydrateField(field, docs);
      } catch (error) {
        console.error(
          `[relationship-builder > hydrate][error] field=${field.slug} ` +
            `relationshipId=${String(field.relationship?.relationshipId)} ` +
            `side=${String(field.relationship?.side)} docs=${docs.length}:`,
          error,
        );
        throw error;
      }
    }
  }

  private async hydrateField(
    field: IField,
    docs: RelationshipHydratableDoc[],
  ): Promise<void> {
    {
      // OWNS_FK: a FK single ja vive na propria row; o populate nativo resolve.
      // Nao tocar o path (sobrescrever quebraria o cast single do schema).
      if (
        this.relationship.roleOfField(field) === E_RELATIONSHIP_STORAGE.OWNS_FK
      )
        return;

      const relationshipId = field.relationship?.relationshipId;

      // Zero legado: os links sao a UNICA fonte de verdade. Um campo sem
      // relationshipId nao foi materializado (esperado 0 apos as migrations §11);
      // nunca servir o array embedded legado — zera o path e loga alto.
      if (!relationshipId) {
        for (const doc of docs) doc.set(field.slug, []);
        console.warn(
          `[relationship-builder] campo "${field.slug}" sem relationshipId — rode "npm run migrate:relationship"`,
        );
        return;
      }

      const definition =
        await this.definitionRepository.findById(relationshipId);
      if (!definition) {
        for (const doc of docs) doc.set(field.slug, []);
        console.warn(
          `[relationship-builder] definition ${relationshipId} nao encontrada para o campo "${field.slug}"`,
        );
        return;
      }

      const side = this.sideOf(definition, field);

      // REVERSE: nada e gravado neste lado; resolve por 1 query reversa na
      // colecao do dono (FK == meuId), agrupada por pagina.
      if (
        this.relationship.roleOfField(field) === E_RELATIONSHIP_STORAGE.REVERSE
      ) {
        await this.hydrateReverse(field, definition, docs);
        return;
      }

      // PIVOT (e fallback legado sem role): 1 query de links para a pagina
      // inteira (mata o N+1) — agrupada por registro.
      const recordIds = docs.map((doc) => doc._id.toString());
      const byRecord = await this.relationship.resolveLinkedIdsBatch(
        definition,
        recordIds,
        side,
      );
      for (const doc of docs) {
        // Projeta sempre, inclusive vazio (vinculo removido NAO pode reaparecer).
        doc.set(field.slug, byRecord.get(doc._id.toString()) ?? []);
      }
    }
  }

  // REVERSE batched: le a colecao do dono uma vez por pagina e agrupa os filhos
  // por FK (== id do registro deste lado). Projeta sempre array (read-compat),
  // inclusive vazio.
  private async hydrateReverse(
    field: IField,
    definition: IRelationshipDefinition,
    docs: RelationshipHydratableDoc[],
  ): Promise<void> {
    const { sourceField, targetField } = this.endpointMultiples(field);
    const owner = this.relationship.ownerOf(
      definition,
      sourceField,
      targetField,
    );
    if (!owner) {
      for (const doc of docs) doc.set(field.slug, []);
      return;
    }

    const db = getDataConnection().db;
    if (!db) {
      for (const doc of docs) doc.set(field.slug, []);
      return;
    }

    const parentIds = docs.map(
      (doc) => new mongoose.Types.ObjectId(doc._id.toString()),
    );
    const collection = db.collection<Record<string, unknown>>(owner.tableSlug);
    const children = await collection
      .find(
        { [owner.fieldSlug]: { $in: parentIds } },
        { projection: { _id: 1, [owner.fieldSlug]: 1 } },
      )
      .toArray();

    const byParent = new Map<string, string[]>();
    for (const child of children) {
      const fk = child[owner.fieldSlug];
      if (fk === null || fk === undefined) continue;
      const parentId = String(fk);
      const childId = String(child['_id']);
      const current = byParent.get(parentId) ?? [];
      current.push(childId);
      byParent.set(parentId, current);
    }

    for (const doc of docs) {
      doc.set(field.slug, byParent.get(doc._id.toString()) ?? []);
    }
  }

  extract(
    fields: IField[],
    data: Record<string, unknown>,
  ): RelationshipExtractResult {
    const relationshipFields = this.relationshipFields(fields);
    const pending: PendingRelationship[] = [];
    const cleaned: Record<string, unknown> = { ...data };

    for (const field of relationshipFields) {
      if (!(field.slug in cleaned)) continue;
      const ids = this.toIds(cleaned[field.slug]);

      // OWNS_FK: a FK single fica no payload da row (escrita nativa no
      // insert/update) — sem ida ao pivo. `[id] -> id` (ou null se vazio).
      if (
        this.relationship.roleOfField(field) === E_RELATIONSHIP_STORAGE.OWNS_FK
      ) {
        cleaned[field.slug] = ids[0] ?? null;
        continue;
      }

      // REVERSE/PIVOT (e legado): sai do payload e vira pending (persistido por
      // role depois que a row tem _id).
      delete cleaned[field.slug];
      pending.push({ field, ids });
    }

    return { data: cleaned, pending };
  }

  // Read-compat: o frontend sempre consome `row[slug]` como array. OWNS_FK guarda
  // FK single (populate nativo retorna objeto unico), entao embrulha em array
  // ([] quando vazio). REVERSE/PIVOT ja chegam array via hydrate.
  normalizeReadProjection(
    fields: IField[],
    row: Record<string, unknown>,
  ): void {
    for (const field of this.relationshipFields(fields)) {
      if (
        this.relationship.roleOfField(field) !== E_RELATIONSHIP_STORAGE.OWNS_FK
      )
        continue;

      const value = row[field.slug];
      if (value === null || value === undefined) {
        row[field.slug] = [];
        continue;
      }
      if (Array.isArray(value)) continue;
      row[field.slug] = [value];
    }
  }

  async resolveRelationshipFilter(
    field: IField,
    otherIds: string[],
  ): Promise<Record<string, unknown> | null> {
    const role = this.relationship.roleOfField(field);

    // OWNS_FK: a FK vive na propria row; o caller filtra `{[slug]:{$in}}` direto.
    if (role === E_RELATIONSHIP_STORAGE.OWNS_FK) return null;

    // REVERSE: os filhos guardam a FK; os pais sao os FKs dos filhos selecionados.
    if (role === E_RELATIONSHIP_STORAGE.REVERSE) {
      return this.resolveReverseFilter(field, otherIds);
    }

    // PIVOT (e legado com relationshipId+side): resolve via links na ponta oposta.
    return this.resolvePivotFilter(field, otherIds);
  }

  // REVERSE filter: le os filhos selecionados na colecao do dono e devolve seus
  // FKs (== ids dos pais deste lado) como `{ _id: { $in } }`.
  private async resolveReverseFilter(
    field: IField,
    otherIds: string[],
  ): Promise<Record<string, unknown> | null> {
    const config = field.relationship;
    const ownerTableSlug = config?.table?.slug;
    const ownerFieldSlug = config?.field?.slug;
    if (!ownerTableSlug || !ownerFieldSlug) return null;
    if (otherIds.length === 0) return { _id: { $in: [] } };

    const db = getDataConnection().db;
    if (!db) return null;

    const childIds = otherIds.map((id) => new mongoose.Types.ObjectId(id));
    const collection = db.collection<Record<string, unknown>>(ownerTableSlug);
    const children = await collection
      .find(
        { _id: { $in: childIds } },
        { projection: { _id: 1, [ownerFieldSlug]: 1 } },
      )
      .toArray();

    const parentIds: string[] = [];
    for (const child of children) {
      const fk = child[ownerFieldSlug];
      if (fk === null || fk === undefined) continue;
      const parentId = String(fk);
      if (!parentIds.includes(parentId)) parentIds.push(parentId);
    }
    return { _id: { $in: parentIds } };
  }

  // PIVOT filter: resolve os ids deste lado cujos vinculos tocam algum dos
  // selecionados (ponta oposta). Sem relationshipId/side (legado), cai no caller.
  private async resolvePivotFilter(
    field: IField,
    otherIds: string[],
  ): Promise<Record<string, unknown> | null> {
    const relationshipId = field.relationship?.relationshipId;
    const side = field.relationship?.side;
    if (!relationshipId || !side) return null;
    if (otherIds.length === 0) return { _id: { $in: [] } };

    const ids = await this.relationship.resolveOwningIds(
      relationshipId,
      side,
      otherIds,
    );
    return { _id: { $in: ids } };
  }

  async persist(
    fields: IField[],
    recordId: string,
    pending: PendingRelationship[],
  ): Promise<void> {
    for (const item of pending) {
      const relationshipId = item.field.relationship?.relationshipId;
      if (!relationshipId) {
        console.error(
          `[relationship-builder] campo "${item.field.slug}" sem relationshipId no persist — vinculos ignorados; rode "npm run migrate:relationship"`,
        );
        continue;
      }

      const definition =
        await this.definitionRepository.findById(relationshipId);
      if (!definition) continue;

      // REVERSE: editar o lado "1" reatribui a FK dos filhos (rouba/orfana) na
      // colecao do dono — semantica 1:N/1:1 sem pivo.
      if (
        this.relationship.roleOfField(item.field) ===
        E_RELATIONSHIP_STORAGE.REVERSE
      ) {
        await this.persistReverse(item.field, definition, recordId, item.ids);
        continue;
      }

      // PIVOT (e fallback legado): reconcilia os links (valida cardinalidade).
      const side = this.sideOf(definition, item.field);
      const { sourceField, targetField } = await this.endpointFields(
        definition,
        item.field,
        side,
      );

      const result = await this.relationship.replaceLinks({
        definition,
        recordId,
        side,
        desiredIds: item.ids,
        sourceField,
        targetField,
      });

      if (result.isLeft()) throw result.value;
    }
  }

  // REVERSE write: seta a FK dos filhos atribuidos para `recordId` e orfana
  // (null) os que apontavam para mim mas sairam do conjunto. Reatribuir "rouba"
  // o filho do pai anterior (FK single = 1 pai), que e a semantica 1:N correta.
  private async persistReverse(
    field: IField,
    definition: IRelationshipDefinition,
    recordId: string,
    ids: string[],
  ): Promise<void> {
    const { sourceField, targetField } = this.endpointMultiples(field);
    const owner = this.relationship.ownerOf(
      definition,
      sourceField,
      targetField,
    );
    if (!owner) return;

    const db = getDataConnection().db;
    if (!db) return;

    const collection = db.collection<Record<string, unknown>>(owner.tableSlug);
    const recordObjectId = new mongoose.Types.ObjectId(recordId);
    const assignedIds = ids.map((id) => new mongoose.Types.ObjectId(id));

    if (assignedIds.length > 0) {
      await collection.updateMany(
        { _id: { $in: assignedIds } },
        { $set: { [owner.fieldSlug]: recordObjectId } },
      );
    }

    await collection.updateMany(
      { [owner.fieldSlug]: recordObjectId, _id: { $nin: assignedIds } },
      { $set: { [owner.fieldSlug]: null } },
    );
  }

  // ── Gestão FK (1:1/1:N) como links sintéticos ─────────────

  async listFkLinks(
    definition: IRelationshipDefinition,
    side: RelationshipLinkSide,
    recordId: string,
    page: number,
    perPage: number,
  ): Promise<{ data: IRelationshipLink[]; total: number }> {
    const { sourceField, targetField } =
      await this.loadEndpointMultiples(definition);
    const owner = this.relationship.ownerOf(
      definition,
      sourceField,
      targetField,
    );
    const db = getDataConnection().db;
    if (!owner || !db) return { data: [], total: 0 };

    const role = this.relationship.storageRoleOf(
      side,
      sourceField,
      targetField,
    );
    const collection = db.collection<Record<string, unknown>>(owner.tableSlug);

    // OWNS_FK: a própria row guarda a FK single — 0/1 relacionado.
    if (role === E_RELATIONSHIP_STORAGE.OWNS_FK) {
      const row = await collection.findOne(
        { _id: new mongoose.Types.ObjectId(recordId) },
        { projection: { [owner.fieldSlug]: 1 } },
      );
      const fk = row?.[owner.fieldSlug];
      if (fk === null || fk === undefined) return { data: [], total: 0 };
      const link = this.buildSyntheticLink(
        definition,
        side,
        recordId,
        String(fk),
        recordId,
        0,
      );
      return { data: [link], total: 1 };
    }

    // REVERSE: os filhos guardam a FK == recordId (paginado).
    const filter = {
      [owner.fieldSlug]: new mongoose.Types.ObjectId(recordId),
    };
    const total = await collection.countDocuments(filter);
    const skip = (page - 1) * perPage;
    const children = await collection
      .find(filter, { projection: { _id: 1 } })
      .skip(skip)
      .limit(perPage)
      .toArray();

    const data = children.map((child, index): IRelationshipLink => {
      const childId = String(child['_id']);
      return this.buildSyntheticLink(
        definition,
        side,
        recordId,
        childId,
        childId,
        skip + index,
      );
    });
    return { data, total };
  }

  async linkFk(
    definition: IRelationshipDefinition,
    side: RelationshipLinkSide,
    recordId: string,
    otherId: string,
  ): Promise<IRelationshipLink> {
    const { sourceField, targetField } =
      await this.loadEndpointMultiples(definition);
    const owner = this.relationship.ownerOf(
      definition,
      sourceField,
      targetField,
    );
    const role = this.relationship.storageRoleOf(
      side,
      sourceField,
      targetField,
    );

    // OWNS_FK: a própria row aponta para otherId. REVERSE: o filho (otherId)
    // passa a apontar para recordId (rouba — FK single = 1 pai).
    let ownerRowId = recordId;
    let fkValue = otherId;
    if (role === E_RELATIONSHIP_STORAGE.REVERSE) {
      ownerRowId = otherId;
      fkValue = recordId;
    }

    const db = getDataConnection().db;
    if (owner && db) {
      const collection = db.collection<Record<string, unknown>>(
        owner.tableSlug,
      );
      await collection.updateOne(
        { _id: new mongoose.Types.ObjectId(ownerRowId) },
        { $set: { [owner.fieldSlug]: new mongoose.Types.ObjectId(fkValue) } },
      );
    }

    return this.buildSyntheticLink(
      definition,
      side,
      recordId,
      otherId,
      ownerRowId,
      0,
    );
  }

  async unlinkFk(
    definition: IRelationshipDefinition,
    linkId: string,
  ): Promise<void> {
    const { sourceField, targetField } =
      await this.loadEndpointMultiples(definition);
    const owner = this.relationship.ownerOf(
      definition,
      sourceField,
      targetField,
    );
    const db = getDataConnection().db;
    if (!owner || !db) return;

    // O `_id` do link sintético é o id da row dona da FK — basta zerá-la.
    const collection = db.collection<Record<string, unknown>>(owner.tableSlug);
    await collection.updateOne(
      { _id: new mongoose.Types.ObjectId(linkId) },
      { $set: { [owner.fieldSlug]: null } },
    );
  }

  async ensureUnlinkKeepsRequired(
    definition: IRelationshipDefinition,
    linkId: string,
  ): Promise<Either<HTTPException, true>> {
    const sourceField = await this.fieldRepository.findById(
      definition.source.field._id,
    );
    const targetField = await this.fieldRepository.findById(
      definition.target.field._id,
    );
    const sourceRequired = Boolean(sourceField?.required);
    const targetRequired = Boolean(targetField?.required);
    if (!sourceRequired && !targetRequired) return right(true);

    const owner = this.relationship.ownerOf(
      definition,
      { multiple: Boolean(sourceField?.multiple) },
      { multiple: Boolean(targetField?.multiple) },
    );
    if (!owner) return right(true);

    // O dono da FK (linkId) perde o seu único vínculo → 0; se obrigatório, barra.
    let ownerRequired = sourceRequired;
    let reverseRequired = targetRequired;
    if (owner.side === 'target') {
      ownerRequired = targetRequired;
      reverseRequired = sourceRequired;
    }
    if (ownerRequired) return left(this.relationship.requiredError());
    if (!reverseRequired) return right(true);

    // Lado reverso obrigatório: sobra algum outro filho apontando para ele?
    const db = getDataConnection().db;
    if (!db) return right(true);
    const collection = db.collection<Record<string, unknown>>(owner.tableSlug);
    const ownerDoc = await collection.findOne({
      _id: new mongoose.Types.ObjectId(linkId),
    });
    const fkValue = ownerDoc?.[owner.fieldSlug];
    if (!fkValue) return right(true);
    const siblings = await collection.countDocuments({
      [owner.fieldSlug]: fkValue,
    });
    if (siblings <= 1) return left(this.relationship.requiredError());
    return right(true);
  }

  async findOccupiedIds(
    definition: IRelationshipDefinition,
    queriedSide: RelationshipLinkSide,
    excludeForRecordId?: string,
  ): Promise<string[]> {
    const { sourceField, targetField } =
      await this.loadEndpointMultiples(definition);
    const role = this.relationship.storageRoleOf(
      queriedSide,
      sourceField,
      targetField,
    );

    // PIVOT (N:N): usa repositório de links.
    if (role === E_RELATIONSHIP_STORAGE.PIVOT) {
      const allLinked = await this.linkRepository.findAllLinkedIds(
        definition._id,
        queriedSide,
      );
      if (!excludeForRecordId || allLinked.length === 0) return allLinked;

      // Remove do resultado os IDs já vinculados a excludeForRecordId
      // (seleção atual do registro em edição deve permanecer visível).
      let oppSide: RelationshipLinkSide = 'source';
      if (queriedSide === 'source') oppSide = 'target';

      let myLinks: IRelationshipLink[];
      if (oppSide === 'source') {
        myLinks = await this.linkRepository.findBySource(
          definition._id,
          excludeForRecordId,
        );
      } else {
        myLinks = await this.linkRepository.findByTarget(
          definition._id,
          excludeForRecordId,
        );
      }
      const myIds = new Set(
        myLinks.map((l) => {
          if (queriedSide === 'source') return l.sourceId;
          return l.targetId;
        }),
      );
      return allLinked.filter((id) => !myIds.has(id));
    }

    // FK-inline (OWNS_FK/REVERSE): a FK vive na coleção dona.
    const owner = this.relationship.ownerOf(
      definition,
      sourceField,
      targetField,
    );
    const db = getDataConnection().db;
    if (!owner || !db) return [];

    const collection = db.collection<Record<string, unknown>>(owner.tableSlug);
    const baseFilter: Record<string, unknown> = {
      [owner.fieldSlug]: { $ne: null, $exists: true },
      trashedAt: null,
    };
    if (excludeForRecordId) {
      baseFilter['_id'] = {
        $ne: new mongoose.Types.ObjectId(excludeForRecordId),
      };
    }

    // Para OWNS_FK com queriedSide='source': os IDs ocupados são as próprias rows
    // da coleção dona (elas já têm uma FK). Para queriedSide='target': são os
    // valores da FK (os alvos já vinculados).
    let isSideOwner: boolean;
    if (role === E_RELATIONSHIP_STORAGE.OWNS_FK) {
      isSideOwner = queriedSide === 'source';
    } else {
      isSideOwner = queriedSide === 'target';
    }

    if (isSideOwner) {
      // OWNS_FK do queriedSide: os IDs ocupados são as rows que JÁ têm FK.
      const rows = await collection
        .find(baseFilter, { projection: { _id: 1 } })
        .toArray();
      return rows.map((r) => String(r['_id']));
    }

    // O queriedSide guarda os alvos da FK → coletar os valores da FK.
    const rows = await collection
      .find(baseFilter, { projection: { [owner.fieldSlug]: 1, _id: 0 } })
      .toArray();
    const ids: string[] = [];
    for (const row of rows) {
      const fk = row[owner.fieldSlug];
      if (fk) ids.push(String(fk));
    }
    return ids;
  }

  // Monta o link sintético: `_id` = id da row dona da FK (p/ o unlink);
  // recordId no lado do campo, otherId no oposto (p/ o front derivar o otherId).
  private buildSyntheticLink(
    definition: IRelationshipDefinition,
    side: RelationshipLinkSide,
    recordId: string,
    otherId: string,
    ownerRowId: string,
    order: number,
  ): IRelationshipLink {
    let sourceId = recordId;
    let targetId = otherId;
    if (side === 'target') {
      sourceId = otherId;
      targetId = recordId;
    }
    return {
      _id: ownerRowId,
      relationshipId: definition._id,
      sourceId,
      targetId,
      order,
      metadata: null,
      createdAt: new Date(),
      updatedAt: null,
    };
  }

  // Multiples dos dois endpoints da definition (lookup no field repo), na ordem
  // source/target — alimenta `ownerOf`/`storageRoleOf` na gestão FK.
  private async loadEndpointMultiples(
    definition: IRelationshipDefinition,
  ): Promise<{
    sourceField: Pick<IField, 'multiple'>;
    targetField: Pick<IField, 'multiple'>;
  }> {
    const sourceFieldDoc = await this.fieldRepository.findById(
      definition.source.field._id,
    );
    const targetFieldDoc = await this.fieldRepository.findById(
      definition.target.field._id,
    );
    return {
      sourceField: { multiple: Boolean(sourceFieldDoc?.multiple) },
      targetField: { multiple: Boolean(targetFieldDoc?.multiple) },
    };
  }

  // ── helpers ───────────────────────────────────────────────

  // Todo campo RELATIONSHIP é gerido por links (zero legado): não filtra mais por
  // relationshipId — campos sem definition são tratados (zerados/logados) acima,
  // nunca caem em leitura/escrita embedded.
  private relationshipFields(fields: IField[]): IField[] {
    return fields.filter((field) => field.type === E_FIELD_TYPE.RELATIONSHIP);
  }

  private sideOf(
    definition: IRelationshipDefinition,
    field: Pick<IField, '_id'>,
  ): RelationshipLinkSide {
    if (definition.source.field._id === field._id) return 'source';
    return 'target';
  }

  // Resolve os campos dos dois endpoints (this + espelho) para derivar a
  // cardinalidade (`multiple`) em canLink.
  private async endpointFields(
    definition: IRelationshipDefinition,
    field: Pick<IField, 'multiple' | 'relationship'>,
    side: RelationshipLinkSide,
  ): Promise<{
    sourceField: Pick<IField, 'multiple' | 'relationship'>;
    targetField: Pick<IField, 'multiple' | 'relationship'>;
  }> {
    let mirrorFieldId = definition.source.field._id;
    if (side === 'source') mirrorFieldId = definition.target.field._id;

    const mirror = await this.fieldRepository.findById(mirrorFieldId);
    const mirrorField: Pick<IField, 'multiple' | 'relationship'> = {
      multiple: Boolean(mirror?.multiple),
      relationship: mirror?.relationship ?? null,
    };

    if (side === 'source') {
      return { sourceField: field, targetField: mirrorField };
    }
    return { sourceField: mirrorField, targetField: field };
  }

  // Multiples dos dois endpoints na ordem source/target, derivados do proprio
  // `field.relationship` (this.multiple + mirror.multiple) — sem ida ao DB.
  // Alimenta `ownerOf` no caminho REVERSE (leitura/escrita).
  private endpointMultiples(field: IField): EndpointMultiples {
    const config = field.relationship;
    const thisField = { multiple: Boolean(field.multiple) };
    const otherField = { multiple: Boolean(config?.mirror?.multiple) };

    if (config?.side === 'target') {
      return { sourceField: otherField, targetField: thisField };
    }
    return { sourceField: thisField, targetField: otherField };
  }

  private toIds(value: unknown): string[] {
    if (value === null || value === undefined) return [];

    let items: unknown[] = [value];
    if (Array.isArray(value)) items = value;

    const ids: string[] = [];
    for (const item of items) {
      if (typeof item === 'string' && item.length > 0) {
        ids.push(item);
        continue;
      }
      if (isRecord(item) && typeof item['_id'] === 'string') {
        ids.push(item['_id']);
      }
    }
    return ids;
  }
}
