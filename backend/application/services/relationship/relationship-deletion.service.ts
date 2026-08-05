import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import type {
  IRelationshipDefinition,
  IRow,
  ITable,
} from '@application/core/entity.core';
import {
  E_RELATIONSHIP_CARDINALITY,
  E_RELATIONSHIP_ON_DELETE,
  E_RELATIONSHIP_STORAGE,
} from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { FieldContractRepository } from '@application/repositories/field/field-contract.repository';
import { RelationshipDefinitionContractRepository } from '@application/repositories/relationship-definition/relationship-definition-contract.repository';
import { RelationshipLinkContractRepository } from '@application/repositories/relationship-link/relationship-link-contract.repository';
import type { RelationshipLinkSide } from '@application/repositories/relationship-link/relationship-link-contract.repository';
import { RowContractRepository } from '@application/repositories/row/row-contract.repository';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';

import { RelationshipContractService } from './relationship-contract.service';
import { RelationshipDeletionContractService } from './relationship-deletion-contract.service';

@Service()
export default class RelationshipDeletionService implements RelationshipDeletionContractService {
  constructor(
    private readonly relationship: RelationshipContractService,
    private readonly definitionRepository: RelationshipDefinitionContractRepository,
    private readonly linkRepository: RelationshipLinkContractRepository,
    private readonly fieldRepository: FieldContractRepository,
    private readonly tableRepository: TableContractRepository,
    private readonly rowRepository: RowContractRepository,
  ) {}

  async applyOnDelete(
    table: ITable,
    recordId: string,
  ): Promise<Either<HTTPException, true>> {
    return this.cascade(table, recordId, new Set<string>());
  }

  async cleanupTable(tableId: string): Promise<void> {
    const definitions = await this.definitionRepository.findByTable(tableId);
    const now = new Date();

    for (const definition of definitions) {
      // Auto-relacionamento (§4.5): source e target são a mesma tabela, então
      // ambos os campos (original + espelho) já saem no deleteMany da exclusão
      // da tabela. Não há espelho em outra tabela para limpar — só os
      // links/definition.
      if (
        definition.source.table._id === tableId &&
        definition.target.table._id === tableId
      ) {
        await this.linkRepository.deleteByRelationship(definition._id);
        await this.definitionRepository.delete(definition._id);
        continue;
      }

      let mirrorFieldId: string | null = null;
      let mirrorTableId: string | null = null;

      if (
        definition.source.table._id === tableId &&
        definition.target.table._id !== tableId
      ) {
        mirrorFieldId = definition.target.field._id;
        mirrorTableId = definition.target.table._id;
      }
      if (
        definition.target.table._id === tableId &&
        definition.source.table._id !== tableId
      ) {
        mirrorFieldId = definition.source.field._id;
        mirrorTableId = definition.source.table._id;
      }

      if (mirrorFieldId !== null && mirrorTableId !== null) {
        const mirrorField = await this.fieldRepository.findById(mirrorFieldId);
        const mirrorTable = await this.tableRepository.findById(mirrorTableId);

        if (mirrorField !== null && mirrorTable !== null) {
          await this.fieldRepository.update({
            _id: mirrorField._id,
            trashed: true,
            trashedAt: now,
          });

          const _schema = Object.fromEntries(
            Object.entries(mirrorTable._schema ?? {}).filter(
              ([key]) => key !== mirrorField.slug,
            ),
          );

          await this.tableRepository.update({
            _id: mirrorTable._id,
            fields: (mirrorTable.fields ?? [])
              .map((f) => f._id)
              .filter((id) => id !== mirrorField._id),
            fieldOrderList: (mirrorTable.fieldOrderList ?? []).filter(
              (id) => id !== mirrorField._id,
            ),
            fieldOrderForm: (mirrorTable.fieldOrderForm ?? []).filter(
              (id) => id !== mirrorField._id,
            ),
            fieldOrderFilter: (mirrorTable.fieldOrderFilter ?? []).filter(
              (id) => id !== mirrorField._id,
            ),
            fieldOrderDetail: (mirrorTable.fieldOrderDetail ?? []).filter(
              (id) => id !== mirrorField._id,
            ),
            _schema,
          });
        }
      }

      await this.linkRepository.deleteByRelationship(definition._id);
      await this.definitionRepository.delete(definition._id);
    }
  }

  // ── interno ───────────────────────────────────────────────

  private async cascade(
    table: ITable,
    recordId: string,
    visited: Set<string>,
  ): Promise<Either<HTTPException, true>> {
    const key = `${table._id}:${recordId}`;
    if (visited.has(key)) return right(true);
    visited.add(key);

    const definitions = await this.definitionRepository.findByTable(table._id);

    // Pass 1 — RESTRICT bloqueia antes de qualquer remocao.
    for (const definition of definitions) {
      if (definition.onDelete !== E_RELATIONSHIP_ON_DELETE.RESTRICT) continue;
      const blocked = await this.hasRelations(definition, table, recordId);
      if (blocked) {
        return left(
          HTTPException.Conflict(
            'Não é possível excluir: existe vínculo que impede a remoção',
            'RELATIONSHIP_DELETE_RESTRICT',
          ),
        );
      }
    }

    // Pass 2 — aplica SET_NULL / CASCADE.
    for (const definition of definitions) {
      if (definition.onDelete === E_RELATIONSHIP_ON_DELETE.SET_NULL) {
        await this.applySetNull(definition, table, recordId);
        continue;
      }
      if (definition.onDelete === E_RELATIONSHIP_ON_DELETE.CASCADE) {
        const applied = await this.applyCascade(
          definition,
          table,
          recordId,
          visited,
        );
        if (applied.isLeft()) return applied;
      }
    }

    return right(true);
  }

  // Existe vinculo que impede a remoção? N:N olha os links; 1:1/1:N olha a FK:
  // lado REVERSE (pai) tem filhos apontando; lado OWNS_FK (filho) tem FK setada.
  private async hasRelations(
    definition: IRelationshipDefinition,
    table: ITable,
    recordId: string,
  ): Promise<boolean> {
    const meta = await this.loadCardinality(definition);

    if (meta.cardinality === E_RELATIONSHIP_CARDINALITY.MANY_TO_MANY) {
      const count = await this.linkRepository.countByRecord(
        definition._id,
        recordId,
      );
      return count > 0;
    }

    for (const side of this.sidesOf(definition, table._id)) {
      const role = this.relationship.storageRoleOf(
        side,
        { multiple: meta.sourceMultiple },
        { multiple: meta.targetMultiple },
      );

      if (role === E_RELATIONSHIP_STORAGE.REVERSE) {
        const other = this.endpointOf(definition, this.opposite(side));
        const childTable = await this.tableRepository.findById(other.table._id);
        if (!childTable) continue;
        const count = await this.rowRepository.count(childTable, {
          [other.field.slug]: recordId,
        });
        if (count > 0) return true;
      }

      if (role === E_RELATIONSHIP_STORAGE.OWNS_FK) {
        const self = this.endpointOf(definition, side);
        const row = await this.rowRepository.findOne({
          table,
          query: { _id: recordId },
          populate: false,
          // A row alvo pode ja estar na lixeira quando a exclusao e definitiva.
          includeTrashed: true,
        });
        if (this.fkIsSet(row, self.field.slug)) return true;
      }
    }

    return false;
  }

  // SET_NULL: N:N apaga os links; 1:1/1:N orfana (null) a FK dos filhos no lado
  // REVERSE (pai removido). O lado OWNS_FK some com a propria row — nada a fazer.
  private async applySetNull(
    definition: IRelationshipDefinition,
    table: ITable,
    recordId: string,
  ): Promise<void> {
    const meta = await this.loadCardinality(definition);

    if (meta.cardinality === E_RELATIONSHIP_CARDINALITY.MANY_TO_MANY) {
      await this.linkRepository.deleteByRecord(definition._id, recordId);
      return;
    }

    for (const side of this.sidesOf(definition, table._id)) {
      const role = this.relationship.storageRoleOf(
        side,
        { multiple: meta.sourceMultiple },
        { multiple: meta.targetMultiple },
      );
      if (role !== E_RELATIONSHIP_STORAGE.REVERSE) continue;

      const other = this.endpointOf(definition, this.opposite(side));
      const childTable = await this.tableRepository.findById(other.table._id);
      if (!childTable) continue;
      await this.rowRepository.clearFieldValue(
        childTable,
        other.field.slug,
        recordId,
      );
    }
  }

  private async applyCascade(
    definition: IRelationshipDefinition,
    table: ITable,
    recordId: string,
    visited: Set<string>,
  ): Promise<Either<HTTPException, true>> {
    const meta = await this.loadCardinality(definition);

    // N:N — sem pai/filho: remove apenas os links do registro.
    if (meta.cardinality === E_RELATIONSHIP_CARDINALITY.MANY_TO_MANY) {
      await this.linkRepository.deleteByRecord(definition._id, recordId);
      return right(true);
    }

    // Só o lado REVERSE (pai) cascateia: apaga os filhos (FK == meuId) na colação
    // do dono. O lado OWNS_FK (filho) some com a propria row, sem subir.
    for (const side of this.sidesOf(definition, table._id)) {
      const role = this.relationship.storageRoleOf(
        side,
        { multiple: meta.sourceMultiple },
        { multiple: meta.targetMultiple },
      );
      if (role !== E_RELATIONSHIP_STORAGE.REVERSE) continue;

      const other = this.endpointOf(definition, this.opposite(side));
      const childTable = await this.tableRepository.findById(other.table._id);
      if (!childTable) continue;

      const children = await this.rowRepository.findMany({
        table: childTable,
        rawFilters: { [other.field.slug]: recordId },
        skip: 0,
        limit: 0,
      });

      for (const child of children) {
        const childKey = `${childTable._id}:${child._id}`;
        if (visited.has(childKey)) continue;

        const cascaded = await this.cascade(childTable, child._id, visited);
        if (cascaded.isLeft()) return cascaded;
        await this.rowRepository.deleteOne(childTable, child._id);
      }
    }

    return right(true);
  }

  // ── helpers ───────────────────────────────────────────────

  private async loadCardinality(definition: IRelationshipDefinition): Promise<{
    cardinality: ReturnType<RelationshipContractService['cardinalityOf']>;
    sourceMultiple: boolean;
    targetMultiple: boolean;
  }> {
    const sourceField = await this.fieldRepository.findById(
      definition.source.field._id,
    );
    const targetField = await this.fieldRepository.findById(
      definition.target.field._id,
    );
    const sourceMultiple = Boolean(sourceField?.multiple);
    const targetMultiple = Boolean(targetField?.multiple);
    return {
      cardinality: this.relationship.cardinalityOf(
        { multiple: sourceMultiple },
        { multiple: targetMultiple },
      ),
      sourceMultiple,
      targetMultiple,
    };
  }

  // Lados que o registro ocupa (ambos em auto-relacionamento, §4.5).
  private sidesOf(
    definition: IRelationshipDefinition,
    tableId: string,
  ): RelationshipLinkSide[] {
    const sides: RelationshipLinkSide[] = [];
    if (definition.source.table._id === tableId) sides.push('source');
    if (definition.target.table._id === tableId) sides.push('target');
    return sides;
  }

  private endpointOf(
    definition: IRelationshipDefinition,
    side: RelationshipLinkSide,
  ): IRelationshipDefinition['source'] {
    if (side === 'source') return definition.source;
    return definition.target;
  }

  private opposite(side: RelationshipLinkSide): RelationshipLinkSide {
    if (side === 'source') return 'target';
    return 'source';
  }

  private fkIsSet(row: IRow | null, slug: string): boolean {
    if (!row) return false;
    const value = Reflect.get(row, slug);
    if (value === null || value === undefined) return false;
    if (Array.isArray(value)) return value.length > 0;
    return true;
  }
}
