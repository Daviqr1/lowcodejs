import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import type {
  IField,
  IRelationshipDefinition,
  IRelationshipLink,
  ValueOf,
} from '@application/core/entity.core';
import {
  E_RELATIONSHIP_CARDINALITY,
  E_RELATIONSHIP_STORAGE,
} from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { FieldContractRepository } from '@application/repositories/field/field-contract.repository';
import {
  RelationshipLinkContractRepository,
  type RelationshipLinkSide,
} from '@application/repositories/relationship-link/relationship-link-contract.repository';

import type {
  RelationshipCanLinkParams,
  RelationshipContractService,
  RelationshipLinkParams,
  RelationshipOwner,
  RelationshipReplaceParams,
} from './relationship-contract.service';

// Cardinalidade derivada dos dois `field.multiple` (nao persistida, §5.2).
export class RelationshipCardinality {
  static of(
    sourceField: Pick<IField, 'multiple'>,
    targetField: Pick<IField, 'multiple'>,
  ): ValueOf<typeof E_RELATIONSHIP_CARDINALITY> {
    const a = sourceField.multiple;
    const b = targetField.multiple;
    if (!a && !b) return E_RELATIONSHIP_CARDINALITY.ONE_TO_ONE;
    if (a && b) return E_RELATIONSHIP_CARDINALITY.MANY_TO_MANY;
    return E_RELATIONSHIP_CARDINALITY.ONE_TO_MANY;
  }
}

// Papel de armazenamento de cada lado, derivado da cardinalidade + side (nao
// persistido). Caminho unico reusado por schema/escrita/leitura/filtro/cascade.
export class RelationshipStorage {
  // OWNS_FK: grava FK single na propria row. REVERSE: nada gravado, resolvido
  // por query reversa na colecao do dono. PIVOT: N:N via RelationshipLink.
  static storageRoleOf(
    side: RelationshipLinkSide,
    sourceField: Pick<IField, 'multiple'>,
    targetField: Pick<IField, 'multiple'>,
  ): ValueOf<typeof E_RELATIONSHIP_STORAGE> {
    const cardinality = RelationshipCardinality.of(sourceField, targetField);

    if (cardinality === E_RELATIONSHIP_CARDINALITY.MANY_TO_MANY) {
      return E_RELATIONSHIP_STORAGE.PIVOT;
    }

    // 1:1 — dono por convencao e o lado source; target e o reverso.
    if (cardinality === E_RELATIONSHIP_CARDINALITY.ONE_TO_ONE) {
      if (side === 'source') return E_RELATIONSHIP_STORAGE.OWNS_FK;
      return E_RELATIONSHIP_STORAGE.REVERSE;
    }

    // 1:N — o lado nao-multiplo (o "1") guarda a FK; o lado multiplo e reverso.
    let sideField = sourceField;
    if (side === 'target') sideField = targetField;
    if (!sideField.multiple) return E_RELATIONSHIP_STORAGE.OWNS_FK;
    return E_RELATIONSHIP_STORAGE.REVERSE;
  }

  // Role derivado direto de um campo RELATIONSHIP, usando o `field.relationship`
  // (side + mirror.multiple) denormalizado — sem lookup no DB. Retorna null
  // quando a config esta incompleta (dados legados antes da migration 16); o
  // caller deve cair no caminho legado (array transiente / links).
  static roleOfField(
    field: Pick<IField, 'multiple' | 'relationship'>,
  ): ValueOf<typeof E_RELATIONSHIP_STORAGE> | null {
    const config = field.relationship;
    if (!config) return null;
    if (!config.side) return null;
    if (!config.mirror) return null;

    const thisField = { multiple: Boolean(field.multiple) };
    const otherField = { multiple: Boolean(config.mirror.multiple) };

    let sourceField = thisField;
    let targetField = otherField;
    if (config.side === 'target') {
      sourceField = otherField;
      targetField = thisField;
    }

    return this.storageRoleOf(config.side, sourceField, targetField);
  }

  // Endpoint dono da FK (lado OWNS_FK). null em N:N (sem dono single — pivo).
  // O lado REVERSE usa `tableSlug` + `fieldSlug` para a query reversa.
  static ownerOf(
    definition: IRelationshipDefinition,
    sourceField: Pick<IField, 'multiple'>,
    targetField: Pick<IField, 'multiple'>,
  ): RelationshipOwner | null {
    const sourceRole = this.storageRoleOf('source', sourceField, targetField);

    if (sourceRole === E_RELATIONSHIP_STORAGE.PIVOT) return null;

    if (sourceRole === E_RELATIONSHIP_STORAGE.OWNS_FK) {
      return {
        side: 'source',
        tableId: definition.source.table._id,
        tableSlug: definition.source.table.slug,
        fieldSlug: definition.source.field.slug,
      };
    }

    return {
      side: 'target',
      tableId: definition.target.table._id,
      tableSlug: definition.target.table.slug,
      fieldSlug: definition.target.field.slug,
    };
  }
}

@Service()
export default class RelationshipService implements RelationshipContractService {
  constructor(
    private readonly linkRepository: RelationshipLinkContractRepository,
    private readonly fieldRepository: FieldContractRepository,
  ) {}

  belongsToTable(definition: IRelationshipDefinition, slug: string): boolean {
    return (
      definition.source?.table?.slug === slug ||
      definition.target?.table?.slug === slug
    );
  }

  // Erro de dominio: desvincular deixaria um lado obrigatorio sem vinculo (§5.6).
  requiredError(): HTTPException {
    return HTTPException.BadRequest(
      'Campo obrigatório: vincule outro registro antes de desvincular',
      'RELATIONSHIP_REQUIRED',
    );
  }

  cardinalityOf(
    sourceField: Pick<IField, 'multiple'>,
    targetField: Pick<IField, 'multiple'>,
  ): ValueOf<typeof E_RELATIONSHIP_CARDINALITY> {
    return RelationshipCardinality.of(sourceField, targetField);
  }

  async isPivot(definition: IRelationshipDefinition): Promise<boolean> {
    const sourceField = await this.fieldRepository.findById(
      definition.source.field._id,
    );
    const targetField = await this.fieldRepository.findById(
      definition.target.field._id,
    );
    const cardinality = RelationshipCardinality.of(
      { multiple: Boolean(sourceField?.multiple) },
      { multiple: Boolean(targetField?.multiple) },
    );
    return cardinality === E_RELATIONSHIP_CARDINALITY.MANY_TO_MANY;
  }

  storageRoleOf(
    side: RelationshipLinkSide,
    sourceField: Pick<IField, 'multiple'>,
    targetField: Pick<IField, 'multiple'>,
  ): ValueOf<typeof E_RELATIONSHIP_STORAGE> {
    return RelationshipStorage.storageRoleOf(side, sourceField, targetField);
  }

  roleOfField(
    field: Pick<IField, 'multiple' | 'relationship'>,
  ): ValueOf<typeof E_RELATIONSHIP_STORAGE> | null {
    return RelationshipStorage.roleOfField(field);
  }

  ownerOf(
    definition: IRelationshipDefinition,
    sourceField: Pick<IField, 'multiple'>,
    targetField: Pick<IField, 'multiple'>,
  ): RelationshipOwner | null {
    return RelationshipStorage.ownerOf(definition, sourceField, targetField);
  }

  async canLink(
    params: RelationshipCanLinkParams,
  ): Promise<Either<HTTPException, true>> {
    const { definition, sourceField, targetField, sourceId, targetId } = params;

    // Auto-relacionamento (§4.5): bloquear vinculo trivial consigo mesmo.
    if (sourceId === targetId) {
      return left(
        HTTPException.BadRequest(
          'Um registro nao pode se vincular a si mesmo',
          'RELATIONSHIP_SELF_LINK',
        ),
      );
    }

    const duplicate = await this.linkRepository.exists({
      relationshipId: definition._id,
      sourceId,
      targetId,
    });
    if (duplicate) {
      return left(
        HTTPException.Conflict(
          'Vinculo ja existe',
          'RELATIONSHIP_LINK_DUPLICATE',
        ),
      );
    }

    if (!sourceField.multiple) {
      const used = await this.linkRepository.count(definition._id, {
        sourceId,
      });
      if (used > 0) {
        return left(
          HTTPException.Conflict(
            'Este lado nao aceita multiplos vinculos',
            'RELATIONSHIP_SOURCE_LIMIT',
          ),
        );
      }
    }

    if (!targetField.multiple) {
      const used = await this.linkRepository.count(definition._id, {
        targetId,
      });
      if (used > 0) {
        return left(
          HTTPException.Conflict(
            'Este lado nao aceita multiplos vinculos',
            'RELATIONSHIP_TARGET_LIMIT',
          ),
        );
      }
    }

    // Cardinalidade numerica no lado source (so aplica em campos multiplos).
    if (sourceField.multiple && sourceField.relationship?.max != null) {
      const used = await this.linkRepository.count(definition._id, {
        sourceId,
      });
      if (used >= sourceField.relationship.max) {
        return left(
          HTTPException.Conflict(
            'Limite máximo de vínculos atingido neste lado',
            'RELATIONSHIP_SOURCE_MAX',
          ),
        );
      }
    }

    // Cardinalidade numerica no lado target.
    if (targetField.multiple && targetField.relationship?.max != null) {
      const used = await this.linkRepository.count(definition._id, {
        targetId,
      });
      if (used >= targetField.relationship.max) {
        return left(
          HTTPException.Conflict(
            'Limite máximo de vínculos atingido neste lado',
            'RELATIONSHIP_TARGET_MAX',
          ),
        );
      }
    }

    return right(true);
  }

  async link(
    params: RelationshipLinkParams,
  ): Promise<Either<HTTPException, IRelationshipLink>> {
    const allowed = await this.canLink(params);
    if (allowed.isLeft()) return left(allowed.value);

    const order = await this.linkRepository.count(params.definition._id, {
      sourceId: params.sourceId,
    });

    const created = await this.linkRepository.create({
      relationshipId: params.definition._id,
      sourceId: params.sourceId,
      targetId: params.targetId,
      order,
      metadata: params.metadata ?? null,
    });

    return right(created);
  }

  async unlink(linkId: string): Promise<Either<HTTPException, true>> {
    const link = await this.linkRepository.findById(linkId);
    if (!link) {
      return left(
        HTTPException.NotFound(
          'Vinculo nao encontrado',
          'RELATIONSHIP_LINK_NOT_FOUND',
        ),
      );
    }

    await this.linkRepository.delete(linkId);
    return right(true);
  }

  // Bloqueia o unlink (N:N/PIVOT) quando deixaria um lado `required` sem nenhum
  // vinculo (RELATIONSHIP_REQUIRED, §5.6). Lados nao-obrigatorios passam direto.
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

    const link = await this.linkRepository.findById(linkId);
    if (!link) return right(true);

    if (sourceRequired) {
      const used = await this.linkRepository.count(definition._id, {
        sourceId: link.sourceId,
      });
      if (used <= 1) return left(this.requiredError());
    }

    if (targetRequired) {
      const used = await this.linkRepository.count(definition._id, {
        targetId: link.targetId,
      });
      if (used <= 1) return left(this.requiredError());
    }

    return right(true);
  }

  async resolveLinkedIds(
    definition: IRelationshipDefinition,
    recordId: string,
    side: RelationshipLinkSide,
  ): Promise<string[]> {
    if (side === 'source') {
      const found = await this.linkRepository.findBySource(
        definition._id,
        recordId,
      );
      return found.map((link) => link.targetId);
    }

    const found = await this.linkRepository.findByTarget(
      definition._id,
      recordId,
    );
    return found.map((link) => link.sourceId);
  }

  async resolveLinkedIdsBatch(
    definition: IRelationshipDefinition,
    recordIds: string[],
    side: RelationshipLinkSide,
  ): Promise<Map<string, string[]>> {
    const result = new Map<string, string[]>();
    if (recordIds.length === 0) return result;

    const links = await this.linkRepository.findManyBySide(
      definition._id,
      side,
      recordIds,
    );

    for (const link of links) {
      let recordId = link.sourceId;
      let otherId = link.targetId;
      if (side === 'target') {
        recordId = link.targetId;
        otherId = link.sourceId;
      }

      const current = result.get(recordId) ?? [];
      current.push(otherId);
      result.set(recordId, current);
    }

    return result;
  }

  async resolveOwningIds(
    relationshipId: string,
    side: RelationshipLinkSide,
    otherIds: string[],
  ): Promise<string[]> {
    if (otherIds.length === 0) return [];

    // Vinculos cuja ponta oposta cai em `otherIds`; deles extraio o meu lado.
    const links = await this.linkRepository.findManyBySide(
      relationshipId,
      this.oppositeSide(side),
      otherIds,
    );

    const ids: string[] = [];
    for (const link of links) {
      let myId = link.targetId;
      if (side === 'source') myId = link.sourceId;
      if (!ids.includes(myId)) ids.push(myId);
    }
    return ids;
  }

  private oppositeSide(side: RelationshipLinkSide): RelationshipLinkSide {
    if (side === 'source') return 'target';
    return 'source';
  }

  async replaceLinks(
    params: RelationshipReplaceParams,
  ): Promise<Either<HTTPException, true>> {
    const { definition, recordId, side, desiredIds, sourceField, targetField } =
      params;

    // Conjunto desejado deduplicado, preservando a ordem de entrada.
    const desired: string[] = [];
    for (const id of desiredIds) {
      if (id && !desired.includes(id)) desired.push(id);
    }

    const existing = await this.resolveLinkedIds(definition, recordId, side);
    const existingSet = new Set(existing);
    const desiredSet = new Set(desired);

    // Remove os vinculos que sairam do conjunto desejado.
    const links = await this.linksOnSide(definition._id, recordId, side);
    for (const link of links) {
      let otherId = link.sourceId;
      if (side === 'source') otherId = link.targetId;
      if (!desiredSet.has(otherId)) {
        await this.linkRepository.delete(link._id);
      }
    }

    // Adiciona os vinculos novos (na ordem desejada), aplicando canLink.
    for (const otherId of desired) {
      if (existingSet.has(otherId)) continue;

      let sourceId = otherId;
      let targetId = recordId;
      if (side === 'source') {
        sourceId = recordId;
        targetId = otherId;
      }

      const linked = await this.link({
        definition,
        sourceField,
        targetField,
        sourceId,
        targetId,
      });
      if (linked.isLeft()) return left(linked.value);
    }

    return right(true);
  }

  private async linksOnSide(
    relationshipId: string,
    recordId: string,
    side: RelationshipLinkSide,
  ): Promise<IRelationshipLink[]> {
    if (side === 'source') {
      return this.linkRepository.findBySource(relationshipId, recordId);
    }
    return this.linkRepository.findByTarget(relationshipId, recordId);
  }
}
