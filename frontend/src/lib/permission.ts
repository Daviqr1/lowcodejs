import {
  E_PERMISSION_TARGET,
  E_ROLE,
  E_TABLE_PERMISSION,
} from '@/lib/constant';
import type {
  IField,
  IGroup,
  IPermissionBinding,
  IUser,
} from '@/lib/interfaces';

export type FieldContext = 'list' | 'form' | 'detail';

// Binding de visibilidade de campo a partir de uma flag (visível = PUBLIC,
// oculto = NOBODY). Espelha o helper do backend.
function fieldVisibilityBinding(visible: boolean): IPermissionBinding {
  if (visible) return { kind: E_PERMISSION_TARGET.PUBLIC, group: null };
  return { kind: E_PERMISSION_TARGET.NOBODY, group: null };
}

// Monta o mapa de permissões de campo por contexto (list/form/detail) a partir
// de flags booleanas. Útil ao criar campos programaticamente no client.
export function buildFieldPermissions(
  list: boolean,
  form: boolean,
  detail: boolean,
): {
  list: IPermissionBinding;
  form: IPermissionBinding;
  detail: IPermissionBinding;
} {
  return {
    list: fieldVisibilityBinding(list),
    form: fieldVisibilityBinding(form),
    detail: fieldVisibilityBinding(detail),
  };
}

/**
 * Fecho transitivo dos grupos que o usuário satisfaz: grupo principal + grupos
 * adicionais + todos os englobados (`encompasses`). Espelha o resolver do
 * backend, porém no client (para esconder opções/colunas por grupo).
 */
export function resolveUserGroupIds(
  user: IUser | null,
  allGroups: Array<IGroup>,
): Set<string> {
  const visited = new Set<string>();
  if (!user) return visited;

  const byId = new Map(allGroups.map((group) => [group._id, group]));

  const queue: Array<string> = [];
  if (user.group?._id) queue.push(user.group._id);
  for (const group of user.groups ?? []) {
    if (group?._id) queue.push(group._id);
  }

  while (queue.length > 0) {
    const id = queue.shift();
    if (!id) continue;
    if (visited.has(id)) continue;

    visited.add(id);

    const group = byId.get(id);
    if (!group) continue;

    for (const encompassedId of group.encompasses ?? []) {
      if (!visited.has(encompassedId)) queue.push(encompassedId);
    }
  }

  return visited;
}

/**
 * União das capacidades (slugs de permissão) de todos os grupos do fecho do
 * usuário (`{group} ∪ groups ∪ encompasses`). Espelha o `resolveCapabilities`
 * do backend, no client, para gating coarse de ações (ex.: CREATE_TABLE e a
 * regra de interseção das ações por tabela).
 */
export function resolveUserCapabilities(
  user: IUser | null,
  allGroups: Array<IGroup>,
): Set<string> {
  const capabilities = new Set<string>();
  if (!user) return capabilities;

  const byId = new Map(allGroups.map((group) => [group._id, group]));

  for (const id of resolveUserGroupIds(user, allGroups)) {
    const group = byId.get(id);
    if (!group) continue;
    for (const permission of group.permissions ?? []) {
      capabilities.add(permission.slug);
    }
  }

  return capabilities;
}

function isPrivilegedSlug(slug: string | null | undefined): boolean {
  // Uppercase espelha a derivação de role do backend (slug.toUpperCase()): os
  // grupos de sistema do seed usam slug MASTER/ADMINISTRATOR.
  const normalized = slug?.toUpperCase();
  return normalized === E_ROLE.MASTER || normalized === E_ROLE.ADMINISTRATOR;
}

/**
 * Usuário privilegiado (acesso total no client; o backend reconfirma): algum
 * grupo do fecho (`{group} ∪ groups` seguindo `encompasses`) tem slug MASTER ou
 * ADMINISTRATOR. Fonte única de verdade no frontend — substitui as checagens
 * espalhadas por `user.group?.slug`, que enxergavam só o grupo principal e
 * ignoravam grupos adicionais/englobados. Espelha o `isPrivileged` do backend.
 */
export function isPrivileged(
  user: IUser | null,
  allGroups: Array<IGroup>,
): boolean {
  if (!user) return false;

  // Caminho rápido: os grupos diretos já vêm com slug populado no usuário, então
  // MASTER/ADMINISTRATOR por grupo principal ou adicional não dependem da lista
  // completa de grupos ter carregado.
  if (isPrivilegedSlug(user.group?.slug)) return true;
  for (const group of user.groups ?? []) {
    if (isPrivilegedSlug(group?.slug)) return true;
  }

  // Fecho transitivo: um grupo custom pode englobar MASTER/ADMINISTRATOR.
  const byId = new Map(allGroups.map((group) => [group._id, group]));
  for (const id of resolveUserGroupIds(user, allGroups)) {
    if (isPrivilegedSlug(byId.get(id)?.slug)) return true;
  }

  return false;
}

/**
 * Usuário MASTER pelo fecho de grupos (slug MASTER no grupo principal, adicional
 * ou englobado). Para gates restritos a MASTER (ex.: exclusão permanente),
 * mantendo a semântica master-only mas corrigindo o fecho. Espelha o `isMaster`
 * do backend.
 */
export function isMaster(
  user: IUser | null,
  allGroups: Array<IGroup>,
): boolean {
  if (!user) return false;

  if (user.group?.slug?.toUpperCase() === E_ROLE.MASTER) return true;
  for (const group of user.groups ?? []) {
    if (group?.slug?.toUpperCase() === E_ROLE.MASTER) return true;
  }

  const byId = new Map(allGroups.map((group) => [group._id, group]));
  for (const id of resolveUserGroupIds(user, allGroups)) {
    if (byId.get(id)?.slug?.toUpperCase() === E_ROLE.MASTER) return true;
  }

  return false;
}

/**
 * Avalia se o usuário (representado pelo fecho de grupos) satisfaz um binding.
 * Binding ausente = comportamento legado (visível). PUBLIC = todos. NOBODY =
 * ninguém. GROUP = precisa ter o grupo no fecho.
 */
export function userSatisfiesBinding(
  binding: IPermissionBinding | null | undefined,
  userGroupIds: Set<string>,
): boolean {
  if (!binding) return true;
  if (binding.kind === E_PERMISSION_TARGET.PUBLIC) return true;
  if (binding.kind === E_PERMISSION_TARGET.GROUP) {
    return Boolean(binding.group && userGroupIds.has(binding.group));
  }
  return false;
}

/**
 * Presença de layout do campo num contexto, independente do usuário: o campo faz
 * parte da lista/formulário/detalhe quando o binding NÃO é NOBODY (oculto para
 * todos). Substitui os antigos booleans showInList/showInForm/showInDetail no
 * código de renderização/layout. Sem binding = presente.
 */
export function isFieldShownInContext(
  field: IField,
  context: FieldContext,
): boolean {
  const binding = field.permissions?.[context];
  if (!binding) return true;
  return binding.kind !== E_PERMISSION_TARGET.NOBODY;
}

/**
 * Visibilidade de um campo num contexto (lista/formulário/detalhe) considerando
 * o binding por grupo. NOBODY = oculto para todos. PUBLIC = todos. GROUP =
 * interseção (membro do grupo E capacidade VIEW_FIELD no fecho); privilegiados
 * (MASTER/ADMINISTRATOR) também enxergam. Sem binding (campo ainda não
 * backfillado) = visível. Espelha o `FieldVisibilityService` do backend.
 */
export function isFieldVisibleInContext(
  field: IField,
  context: FieldContext,
  userGroupIds: Set<string>,
  privileged: boolean,
  capabilities: Set<string>,
): boolean {
  const binding = field.permissions?.[context];
  if (!binding) return true;

  if (binding.kind === E_PERMISSION_TARGET.NOBODY) return false;
  if (binding.kind === E_PERMISSION_TARGET.PUBLIC) return true;
  if (privileged) return true;
  if (!capabilities.has(E_TABLE_PERMISSION.VIEW_FIELD)) return false;
  return Boolean(binding.group && userGroupIds.has(binding.group));
}
