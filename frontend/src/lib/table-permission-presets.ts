import {
  E_PERMISSION_TARGET,
  E_TABLE_PERMISSION,
  TABLE_PERMISSION_ACTIONS,
} from '@/lib/constant';
import type { IPermissionBinding, ValueOf } from '@/lib/interfaces';

// Presets de colaboração (atalho que preenche os 10 bindings da tabela). Deriva
// da planilha "Colaboração" da especificação:
// - "dono e convidados" → NOBODY (acesso vem dos perfis de membro)
// - "usuário logado / todos os grupos" → GROUP(Registered)
// - "visitante" → PUBLIC
export const E_COLLABORATION_PRESET = {
  PRIVATE: 'PRIVATE',
  RESTRICTED: 'RESTRICTED',
  OPEN: 'OPEN',
  PUBLIC: 'PUBLIC',
  SURVEY: 'SURVEY',
  CUSTOM: 'CUSTOM',
} as const;

export type CollaborationPreset = ValueOf<typeof E_COLLABORATION_PRESET>;

export const COLLABORATION_PRESET_LABEL: Record<CollaborationPreset, string> = {
  [E_COLLABORATION_PRESET.PRIVATE]: 'Privada',
  [E_COLLABORATION_PRESET.RESTRICTED]: 'Restrita',
  [E_COLLABORATION_PRESET.OPEN]: 'Aberta',
  [E_COLLABORATION_PRESET.PUBLIC]: 'Pública',
  [E_COLLABORATION_PRESET.SURVEY]: 'Pesquisa',
  [E_COLLABORATION_PRESET.CUSTOM]: 'Personalizado',
};

// Presets selecionáveis (CUSTOM não é aplicável: representa "não bate com nenhum").
export const COLLABORATION_PRESET_OPTIONS: Array<CollaborationPreset> = [
  E_COLLABORATION_PRESET.PRIVATE,
  E_COLLABORATION_PRESET.RESTRICTED,
  E_COLLABORATION_PRESET.OPEN,
  E_COLLABORATION_PRESET.PUBLIC,
  E_COLLABORATION_PRESET.SURVEY,
];

function nobodyBinding(): IPermissionBinding {
  return { kind: E_PERMISSION_TARGET.NOBODY, group: null };
}

function publicBinding(): IPermissionBinding {
  return { kind: E_PERMISSION_TARGET.PUBLIC, group: null };
}

function groupBinding(groupId: string | null): IPermissionBinding {
  return { kind: E_PERMISSION_TARGET.GROUP, group: groupId };
}

// Constrói o mapa das 10 ações a partir de um preset. Começa tudo em NOBODY e
// sobrescreve apenas View/Create conforme o preset.
export function applyCollaborationPreset(
  preset: CollaborationPreset,
  registeredGroupId: string | null,
): Record<string, IPermissionBinding> {
  const permissions: Record<string, IPermissionBinding> = {};
  for (const action of TABLE_PERMISSION_ACTIONS) {
    permissions[action] = nobodyBinding();
  }

  if (preset === E_COLLABORATION_PRESET.RESTRICTED) {
    permissions[E_TABLE_PERMISSION.VIEW_TABLE] =
      groupBinding(registeredGroupId);
    permissions[E_TABLE_PERMISSION.VIEW_ROW] = groupBinding(registeredGroupId);
  }

  if (preset === E_COLLABORATION_PRESET.OPEN) {
    permissions[E_TABLE_PERMISSION.VIEW_TABLE] =
      groupBinding(registeredGroupId);
    permissions[E_TABLE_PERMISSION.VIEW_ROW] = groupBinding(registeredGroupId);
    permissions[E_TABLE_PERMISSION.CREATE_ROW] =
      groupBinding(registeredGroupId);
  }

  if (preset === E_COLLABORATION_PRESET.PUBLIC) {
    permissions[E_TABLE_PERMISSION.VIEW_TABLE] = publicBinding();
    permissions[E_TABLE_PERMISSION.VIEW_ROW] = publicBinding();
    permissions[E_TABLE_PERMISSION.CREATE_ROW] =
      groupBinding(registeredGroupId);
  }

  if (preset === E_COLLABORATION_PRESET.SURVEY) {
    permissions[E_TABLE_PERMISSION.CREATE_ROW] = publicBinding();
  }

  return permissions;
}

function bindingsEqual(
  a: IPermissionBinding | undefined,
  b: IPermissionBinding,
): boolean {
  if (!a) return false;
  if (a.kind !== b.kind) return false;
  return (a.group ?? null) === (b.group ?? null);
}

// Detecta a qual preset o mapa atual corresponde (para refletir a seleção). Se
// não bater com nenhum, retorna CUSTOM.
export function detectCollaborationPreset(
  permissions: Record<string, IPermissionBinding> | null | undefined,
  registeredGroupId: string | null,
): CollaborationPreset {
  if (!permissions) return E_COLLABORATION_PRESET.CUSTOM;

  for (const preset of COLLABORATION_PRESET_OPTIONS) {
    const expected = applyCollaborationPreset(preset, registeredGroupId);
    const matches = TABLE_PERMISSION_ACTIONS.every((action) =>
      bindingsEqual(permissions[action], expected[action]),
    );
    if (matches) return preset;
  }

  return E_COLLABORATION_PRESET.CUSTOM;
}
