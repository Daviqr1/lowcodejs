import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import {
  buildDefaultTablePermissions,
  buildFieldPermissions,
  E_FIELD_FORMAT,
  E_FIELD_TYPE,
  E_ROLE,
  E_TABLE_PROFILE,
  E_TABLE_STYLE,
  E_TABLE_TYPE,
  FIELD_NATIVE_LIST,
  type ITable as Entity,
} from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { FieldContractRepository } from '@application/repositories/field/field-contract.repository';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';
import { UserGroupContractRepository } from '@application/repositories/user-group/user-group-contract.repository';
import { SchemaBuilderContractService } from '@application/services/table/schema-builder-contract.service';

import type { TableCreatePayload } from './create.validator';

type Response = Either<HTTPException, Entity>;
type Payload = TableCreatePayload;

@Service()
export default class TableCreateUseCase {
  constructor(
    private readonly tableRepository: TableContractRepository,
    private readonly fieldRepository: FieldContractRepository,
    private readonly userGroupRepository: UserGroupContractRepository,
    private readonly schemaBuilder: SchemaBuilderContractService,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      if (!payload.owner)
        return left(
          HTTPException.BadRequest(
            'Proprietário é obrigatório',
            'OWNER_REQUIRED',
          ),
        );

      const slug = payload.slug;

      const existingTable = await this.tableRepository.findBySlug(slug, {
        // Slug e a chave da colecao dinamica: precisa ser unico inclusive contra
        // tabelas na lixeira, senao a nova tabela mesclaria os registros dela.
        includeTrashed: true,
      });

      if (existingTable)
        return left(
          HTTPException.Conflict('Tabela já existe', 'TABLE_ALREADY_EXISTS', {
            name: 'Tabela já existe',
          }),
        );

      const nativeFields = await this.fieldRepository.createMany([
        ...FIELD_NATIVE_LIST,
        {
          name: 'Nome',
          slug: 'nome',
          type: E_FIELD_TYPE.TEXT_SHORT,
          native: false,
          locked: false,
          required: true,
          multiple: false,
          format: E_FIELD_FORMAT.ALPHA_NUMERIC,
          showInFilter: true,
          permissions: buildFieldPermissions(true, true, true),
          widthInForm: 50,
          widthInList: 10,
          widthInDetail: null,
          defaultValue: null,
          relationship: null,
          dropdown: [],
          category: [],
          group: null,
        },
      ]);

      const nativeFieldIds = nativeFields.flatMap((f) => f._id);

      const _schema = this.schemaBuilder.build(nativeFields);

      // Tabela nova nasce ja no modelo de permissoes: preset RESTRICTED (logados
      // veem) + dono como membro OWNER. Nunca `permissions: null`.
      const registeredGroup = await this.userGroupRepository.findBySlug(
        E_ROLE.REGISTERED,
      );

      const created = await this.tableRepository.create({
        ...payload,
        _schema,
        slug,
        fields: [],
        type: E_TABLE_TYPE.TABLE,
        owner: payload.owner,
        permissions: buildDefaultTablePermissions(registeredGroup?._id ?? null),
        members: [{ user: payload.owner, profile: E_TABLE_PROFILE.OWNER }],
        style: payload.style ?? E_TABLE_STYLE.LIST,
        fieldOrderForm: [],
        fieldOrderList: [],
        fieldOrderFilter: [],
        fieldOrderDetail: [],
      });

      await this.tableRepository.update({
        _id: created._id,
        fields: nativeFieldIds,
        fieldOrderList: nativeFieldIds,
        fieldOrderForm: nativeFieldIds,
        fieldOrderFilter: nativeFieldIds,
        fieldOrderDetail: nativeFieldIds,
      });

      return right({
        ...created,
        fields: nativeFields,
      });
    } catch (error) {
      console.error('[table-base > create][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'CREATE_TABLE_ERROR',
        ),
      );
    }
  }
}
