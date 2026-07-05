/* eslint-disable no-unused-vars */
import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import {
  type ITable as Entity,
  type Merge,
} from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { FieldContractRepository } from '@application/repositories/field/field-contract.repository';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';
import { UserContractRepository } from '@application/repositories/user/user-contract.repository';
import { GroupResolverContractService } from '@application/services/group-resolver/group-resolver-contract.service';
import { ModelBuilderContractService } from '@application/services/table/model-builder-contract.service';

import type { TableUpdatePayload } from './update.validator';

type Response = Either<HTTPException, Entity>;

// Identidade do ator (resolvida no controller a partir de request.user +
// request.ownership) usada para autorizar a troca de dono.
type Payload = Merge<
  TableUpdatePayload,
  {
    actorId?: string;
    actorIsOwner?: boolean;
  }
>;

@Service()
export default class TableUpdateUseCase {
  constructor(
    private readonly tableRepository: TableContractRepository,
    private readonly fieldRepository: FieldContractRepository,
    private readonly modelBuilder: ModelBuilderContractService,
    private readonly userRepository: UserContractRepository,
    private readonly groupResolver: GroupResolverContractService,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      const table = await this.tableRepository.findBySlug(payload.routeSlug);

      if (!table)
        return left(
          HTTPException.NotFound('Tabela não encontrada', 'TABLE_NOT_FOUND'),
        );

      // Troca de dono so e permitida ao dono atual ou a um privilegiado
      // (MASTER/ADMINISTRATOR resolvido pelo fecho de grupos, nao pelo role do
      // JWT — assim um privilegiado por grupo adicional/englobado tambem vale).
      const isOwnerChange =
        payload.owner !== undefined &&
        payload.owner !== table.owner._id.toString();

      if (isOwnerChange) {
        let actorIsPrivileged = false;
        if (payload.actorId) {
          const actor = await this.userRepository.findById(payload.actorId);
          actorIsPrivileged = await this.groupResolver.isPrivileged(actor);
        }

        const canReassignOwner =
          actorIsPrivileged || payload.actorIsOwner === true;

        if (!canReassignOwner)
          return left(
            HTTPException.Forbidden(
              'Apenas o dono atual ou um administrador pode trocar o dono da tabela',
              'OWNER_CHANGE_FORBIDDEN',
            ),
          );
      }

      const oldSlug = table.slug;
      const newSlug = payload.slug;
      const slugChanged = newSlug !== oldSlug;

      // Verificar unicidade do novo slug
      if (slugChanged) {
        const existingTable = await this.tableRepository.findBySlug(newSlug);

        if (existingTable) {
          return left(
            HTTPException.Conflict('Tabela já existe', 'TABLE_ALREADY_EXISTS', {
              name: 'Tabela já existe',
            }),
          );
        }
      }

      // Renomear coleção e atualizar referências nos campos RELATIONSHIP
      if (slugChanged) {
        await this.tableRepository.renameSlug(oldSlug, newSlug);
        await this.fieldRepository.updateRelationshipTableSlug(
          table._id,
          newSlug,
        );
      }

      let rowSlugFieldId = table.rowSlugFieldId;
      if (payload.rowSlugFieldId !== undefined) {
        rowSlugFieldId = payload.rowSlugFieldId;
      }

      // Mapear propriedades populadas para strings (IDs)
      let order = table.order;
      if (payload.order !== undefined) {
        order = payload.order;
      }

      const updated = await this.tableRepository.update({
        _id: table._id,
        ...payload,
        slug: newSlug,
        // Troca de dono: aceita payload.owner; caso contrario preserva o atual.
        owner: payload.owner ?? table.owner._id,
        // Permissoes/convidados: preserva o existente quando o cliente nao envia.
        permissions: payload.permissions ?? table.permissions,
        members: payload.members ?? table.members,
        rowSlugFieldId,
        style: payload.style ?? table.style,
        fieldOrderList: payload.fieldOrderList ?? table.fieldOrderList,
        fieldOrderForm: payload.fieldOrderForm ?? table.fieldOrderForm,
        fieldOrderFilter: payload.fieldOrderFilter ?? table.fieldOrderFilter,
        fieldOrderDetail: payload.fieldOrderDetail ?? table.fieldOrderDetail,
        order,
        layoutFields: payload.layoutFields ?? table.layoutFields,
      });

      await this.modelBuilder.build(updated);

      // Reconstruir tabelas que têm RELATIONSHIP apontando para esta
      if (slugChanged) {
        const pointingFields =
          await this.fieldRepository.findByRelationshipTableId(table._id);

        if (pointingFields.length > 0) {
          const pointingFieldIds = pointingFields.flatMap((f) => f._id);
          const relatedTables =
            await this.tableRepository.findByFieldIds(pointingFieldIds);

          for (const relatedTable of relatedTables) {
            await this.modelBuilder.build(relatedTable);
          }
        }
      }

      return right(updated);
    } catch (error) {
      console.error('[table-base > update][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'UPDATE_TABLE_ERROR',
        ),
      );
    }
  }
}
