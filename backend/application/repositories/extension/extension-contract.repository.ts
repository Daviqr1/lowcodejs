/* eslint-disable no-unused-vars */
import type {
  E_EXTENSION_TYPE,
  IExtension,
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
  slot: string | null;
  route: string | null;
  submenu: string | null;
  manifestSnapshot: Record<string, unknown>;
  requires: IExtensionRequires;
};

export type ExtensionToggleEnabledPayload = {
  _id: string;
  enabled: boolean;
};

export type ExtensionUpdateTableScopePayload = {
  _id: string;
  tableScope: IExtensionTableScope;
};

export type ExtensionQueryPayload = {
  type?: ExtensionType;
  enabled?: boolean;
  slot?: string;
  available?: boolean;
};

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
  abstract upsert(payload: ExtensionUpsertPayload): Promise<IExtension>;
  abstract toggleEnabled(
    payload: ExtensionToggleEnabledPayload,
  ): Promise<IExtension>;
  abstract updateTableScope(
    payload: ExtensionUpdateTableScopePayload,
  ): Promise<IExtension>;
  abstract findActiveForTable(tableId: string): Promise<IExtension[]>;
  /**
   * Marca como `available: false` toda extensão cuja chave (pkg, type, extensionId)
   * NÃO esteja em `presentKeys`. Usado pelo loader para sinalizar manifestos
   * removidos do disco.
   */
  abstract markUnavailableExcept(
    presentKeys: ExtensionAvailabilityKey[],
  ): Promise<number>;
}
