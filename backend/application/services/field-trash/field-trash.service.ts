import { Service } from 'fastify-decorators';

import type { IField } from '@application/core/entity.core';
import { buildFieldPermissions } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import type { FieldUpdatePayload } from '@application/repositories/field/field-contract.repository';

import { FieldTrashContractService } from './field-trash-contract.service';

@Service()
export default class FieldTrashService implements FieldTrashContractService {
  guardTrash(field: IField | null): HTTPException | null {
    if (!field) {
      return HTTPException.NotFound('Campo não encontrado', 'FIELD_NOT_FOUND');
    }

    if (field.native) {
      return HTTPException.Forbidden(
        'Campos nativos não podem ser enviados para a lixeira',
        'NATIVE_FIELD_CANNOT_BE_TRASHED',
      );
    }

    if (field.locked) {
      return HTTPException.Forbidden(
        'Campo está bloqueado e não pode ser enviado para a lixeira',
        'FIELD_LOCKED',
      );
    }

    if (field.trashed) {
      return HTTPException.Conflict(
        'Campo já está na lixeira',
        'ALREADY_TRASHED',
      );
    }

    return null;
  }

  guardRestore(field: IField | null): HTTPException | null {
    if (!field) {
      return HTTPException.NotFound('Campo não encontrado', 'FIELD_NOT_FOUND');
    }

    if (!field.trashed) {
      return HTTPException.Conflict('Campo não está na lixeira', 'NOT_TRASHED');
    }

    return null;
  }

  trashPatch(_id: string): FieldUpdatePayload {
    return {
      _id,
      permissions: buildFieldPermissions(false, false, false),
      showInFilter: false,
      required: false,
      trashed: true,
      trashedAt: new Date(),
    };
  }

  restorePatch(_id: string): FieldUpdatePayload {
    return {
      _id,
      permissions: buildFieldPermissions(true, true, true),
      showInFilter: true,
      required: false,
      trashed: false,
      trashedAt: null,
    };
  }
}
