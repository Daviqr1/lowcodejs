import type {
  E_EXTENSION_TYPE,
  IExtension,
  IExtensionPermissions,
  IExtensionRequires,
  IExtensionTableScope,
  ValueOf,
} from '@application/core/entity.core';

export type ExtensionType = ValueOf<typeof E_EXTENSION_TYPE>;

export type ExtensionUpsertPayload = {
  pkg: string;
  type: ExtensionType;
  extensionId: string;
  name: string;
  description: string | null;
  version: string;
  author: string | null;
  icon: string | null;
  image: string | null;
  slots: string[];
  route: string | null;
  configRoute: string | null;
  submenu: string | null;
  manifestSnapshot: Record<string, unknown>;
  requires: IExtensionRequires;
  permissions: IExtensionPermissions;
};

export type ExtensionUpsertOptions = {
  /**
   * Define `enabled: true` quando o registro é criado pela primeira vez.
   * Não afeta registros existentes — preserva o estado atual.
   */
  enabledOnInsert?: boolean;
};

export type ExtensionToggleEnabledPayload = {
  _id: string;
  enabled: boolean;
};

export type ExtensionUpdateTableScopePayload = {
  _id: string;
  tableScope: IExtensionTableScope;
};

export type ExtensionUpdateTableSettingsPayload = {
  _id: string;
  tableId: string;
  settings: Record<string, unknown>;
};

export type ExtensionQueryPayload = {
  type?: ExtensionType;
  enabled?: boolean;
  slot?: string;
  available?: boolean;
};

// Nota: o campo `slot` em ExtensionQueryPayload aceita um único slot e
// busca por presença no array `slots` (multikey index do Mongo).

export type ExtensionAvailabilityKey = {
  pkg: string;
  type: ExtensionType;
  extensionId: string;
};

export abstract class ExtensionContractRepository {
  abstract findById(_id: string): Promise<IExtension | null>;
  abstract findByKey(
    pkg: string,
    type: ExtensionType,
    extensionId: string,
  ): Promise<IExtension | null>;
  abstract findMany(payload?: ExtensionQueryPayload): Promise<IExtension[]>;
  abstract upsert(
    payload: ExtensionUpsertPayload,
    options?: ExtensionUpsertOptions,
  ): Promise<IExtension>;
  abstract toggleEnabled(
    payload: ExtensionToggleEnabledPayload,
  ): Promise<IExtension>;
  abstract updateTableScope(
    payload: ExtensionUpdateTableScopePayload,
  ): Promise<IExtension>;
  /**
   * Persiste `settings` para uma tabela especifica no campo `tableSettings[tableId]`.
   * Usado pelo configure-table-scope quando o plugin e um row-access-guard.
   */
  abstract updateTableSettings(
    payload: ExtensionUpdateTableSettingsPayload,
  ): Promise<IExtension>;
  /**
   * Marca como `available: false` toda extensão cuja chave (pkg, type, extensionId)
   * NÃO esteja em `presentKeys`. Usado pelo loader para sinalizar manifestos
   * removidos do disco.
   */
  abstract markUnavailableExcept(
    presentKeys: ExtensionAvailabilityKey[],
  ): Promise<number>;
  /**
   * Retorna extensões enabled e available cujo tableScope cobre tableId.
   * Usado por RowAccessGuardService para descobrir os guards ativos da tabela.
   */
  abstract findActiveForTable(tableId: string): Promise<IExtension[]>;
}
