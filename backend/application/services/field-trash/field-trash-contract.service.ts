import type { IField } from '@application/core/entity.core';
import type HTTPException from '@application/core/exception.core';
import type { FieldUpdatePayload } from '@application/repositories/field/field-contract.repository';

/**
 * Guardas e patch de lixeira de campo, iguais para campo top-level e campo
 * dentro de `FIELD_GROUP`. Os quatro use-cases (`table-fields` e
 * `table-group-fields` x `send-to-trash`/`remove-from-trash`) compartilhavam
 * ~60 linhas identicas: so a busca do grupo antes e a reconstrucao do schema
 * depois e que diferem entre eles.
 */
export abstract class FieldTrashContractService {
  /**
   * Recusa campo inexistente, nativo, bloqueado ou ja na lixeira. `null`
   * libera o envio.
   */
  abstract guardTrash(field: IField | null): HTTPException | null;

  /** Recusa campo inexistente ou que nao esta na lixeira. `null` libera. */
  abstract guardRestore(field: IField | null): HTTPException | null;

  /** Patch que envia o campo para a lixeira (some das tres visoes). */
  abstract trashPatch(_id: string): FieldUpdatePayload;

  /** Patch que restaura o campo (volta as tres visoes). */
  abstract restorePatch(_id: string): FieldUpdatePayload;
}
