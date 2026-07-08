import { DropdownMenuTrigger } from '@radix-ui/react-dropdown-menu';
import { useParams, useRouter } from '@tanstack/react-router';
import {
  ArrowUpDownIcon,
  CodeIcon,
  CodepenIcon,
  InfoIcon,
  PencilIcon,
  PlusIcon,
  SendToBackIcon,
  Settings2Icon,
} from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';

import { ApiEndpointsModal } from './-api-endpoints-modal';

import { TableFieldManagementSheet } from '@/components/common/dynamic-table/field-management/table-field-management-sheet';
import { GroupFieldManagementSheet } from '@/components/common/dynamic-table/group-rows/group-field-management-sheet';
import { ExtensionSlot } from '@/components/common/extension-slot/extension-slot';
import { FieldTitle } from '@/components/common/field-title';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import { useReadTable } from '@/hooks/tanstack-query/use-table-read';
import { useTablePermission } from '@/hooks/use-table-permission';
import { E_FIELD_TYPE, E_TABLE_TYPE } from '@/lib/constant';
import type { IField, ITable } from '@/lib/interfaces';
import { resolveFieldLabel } from '@/lib/table';
import { cn } from '@/lib/utils';

type FieldGroupSubMenuProps = {
  field: IField;
  originSlug: string;
  parentTable: ITable;
  onNavigate: () => void;
  onManageGroup: (groupSlug: string) => void;
};

function FieldGroupSubMenu({
  field,
  originSlug,
  parentTable,
  onNavigate,
  onManageGroup,
}: FieldGroupSubMenuProps): React.JSX.Element {
  const router = useRouter();
  const permission = useTablePermission(parentTable);

  const group = (parentTable.groups ?? []).find(
    (g) => g.slug === field.group?.slug,
  );

  const activeFields =
    group?.fields.filter((f) => !f.trashed && !f.native) ?? [];

  const groupSlug = field.group?.slug ?? field.slug;

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <span className="inline-flex min-w-0 gap-1">
          <span>Gerenciar</span>
          <FieldTitle value={resolveFieldLabel(field)} />
        </span>
      </DropdownMenuSubTrigger>
      <DropdownMenuPortal>
        <DropdownMenuSubContent>
          {permission.can('CREATE_FIELD') && (
            <DropdownMenuItem
              className="inline-flex space-x-1 w-full"
              onClick={() => {
                onNavigate();
                router.navigate({
                  to: '/tables/$slug/field/create',
                  params: { slug: originSlug },
                  search: { group: groupSlug },
                });
              }}
            >
              <PlusIcon className="size-4" />
              <span>Novo campo</span>
            </DropdownMenuItem>
          )}

          {permission.can('UPDATE_FIELD') && (
            <DropdownMenuItem
              className="inline-flex space-x-1 w-full"
              onClick={() => {
                onNavigate();
                onManageGroup(groupSlug);
              }}
            >
              <ArrowUpDownIcon className="size-4" />
              <span>Gerenciar</span>
            </DropdownMenuItem>
          )}

          {permission.can('UPDATE_FIELD') && <DropdownMenuSeparator />}

          {permission.can('UPDATE_FIELD') &&
            activeFields.map((groupField) => (
              <DropdownMenuItem
                key={groupField._id}
                className="inline-flex space-x-1 w-full"
                onClick={() => {
                  onNavigate();
                  router.navigate({
                    to: '/tables/$slug/field/$fieldId',
                    params: { slug: originSlug, fieldId: groupField._id },
                    search: { group: groupSlug },
                  });
                }}
              >
                <PencilIcon className="size-4" />
                <span className="inline-flex min-w-0 gap-1">
                  <span>Editar</span>
                  <FieldTitle value={resolveFieldLabel(groupField)} />
                </span>
              </DropdownMenuItem>
            ))}
        </DropdownMenuSubContent>
      </DropdownMenuPortal>
    </DropdownMenuSub>
  );
}

type TableConfigurationProps = {
  tableSlug: string;
};

export function TableConfigurationDropdown({
  tableSlug,
}: TableConfigurationProps): React.JSX.Element {
  const { slug } = useParams({
    from: '/_private/tables/$slug/',
  });

  const router = useRouter();
  const table = useReadTable({ slug: tableSlug });
  const permission = useTablePermission(table.data);

  const [apiModalOpen, setApiModalOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const fieldTriggerRef = React.useRef<HTMLButtonElement | null>(null);
  // alvo de gerenciamento de grupo: slug + nonce. O nonce força remontar o Sheet
  // (chave) e reabrir o mesmo grupo, mantendo o Sheet uncontrolled (abre via
  // ref clicada a partir do menu — ver dialog/sheet-pattern).
  const [groupTarget, setGroupTarget] = useState<{
    slug: string;
    nonce: number;
  } | null>(null);
  const groupTriggerRef = React.useRef<HTMLButtonElement | null>(null);

  React.useEffect(
    function openGroupManagement() {
      if (groupTarget) groupTriggerRef.current?.click();
    },
    [groupTarget],
  );

  const closeMenu = (): void => setOpen(false);

  const activeFields =
    table.data?.fields.filter(
      (f) => f.type !== E_FIELD_TYPE.FIELD_GROUP && !f.trashed && !f.native,
    ) ?? [];

  const fieldGroups =
    table.data?.fields.filter(
      (f) => f.type === E_FIELD_TYPE.FIELD_GROUP && !f.trashed,
    ) ?? [];

  const canManage =
    permission.can('CREATE_FIELD') ||
    permission.can('UPDATE_FIELD') ||
    permission.can('UPDATE_TABLE');

  if (!canManage) {
    return <></>;
  }

  return (
    <>
      <DropdownMenu
        dir="ltr"
        modal={false}
        open={open}
        onOpenChange={setOpen}
      >
        <DropdownMenuTrigger asChild>
          <Button
            disabled={table.status === 'pending'}
            className={cn('shadow-none p-1 h-auto')}
            variant="outline"
            data-test-id="table-config-btn"
          >
            <Settings2Icon className="size-4" />
            <span>Configuração</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="mr-12 max-w-xs w-full"
          data-test-id="table-config-dropdown"
        >
          {(permission.can('CREATE_FIELD') ||
            permission.can('UPDATE_FIELD')) && (
            <DropdownMenuLabel>Campos</DropdownMenuLabel>
          )}

          <DropdownMenuGroup>
            {permission.can('CREATE_FIELD') && (
              <DropdownMenuItem
                className="inline-flex space-x-1 w-full"
                onClick={() => {
                  closeMenu();
                  router.navigate({
                    to: '/tables/$slug/field/create',
                    params: { slug },
                  });
                }}
              >
                <PlusIcon className="size-4" />
                <span>Novo campo</span>
              </DropdownMenuItem>
            )}

            {permission.can('UPDATE_FIELD') && (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="inline-flex space-x-1 w-full">
                  <SendToBackIcon className="size-4" />
                  <span>Gerenciar campos</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem
                      className="inline-flex space-x-1 w-full"
                      onClick={() => {
                        closeMenu();
                        fieldTriggerRef.current?.click();
                      }}
                    >
                      <Settings2Icon className="size-4" />
                      <span>Gerenciar</span>
                    </DropdownMenuItem>

                    <div className="overflow-y-auto max-h-60">
                      {activeFields.map((field) => (
                        <DropdownMenuItem
                          key={field._id}
                          onClick={() => {
                            closeMenu();
                            router.navigate({
                              to: '/tables/$slug/field/$fieldId',
                              params: { slug, fieldId: field._id },
                            });
                          }}
                        >
                          <PencilIcon className="size-4" />
                          <span className="inline-flex min-w-0 gap-1">
                            <span>Editar</span>
                            <FieldTitle value={resolveFieldLabel(field)} />
                          </span>
                        </DropdownMenuItem>
                      ))}
                    </div>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
            )}
          </DropdownMenuGroup>

          {table.data?.type === E_TABLE_TYPE.TABLE &&
            (permission.can('CREATE_FIELD') ||
              permission.can('UPDATE_FIELD')) && (
              <React.Fragment>
                <DropdownMenuSeparator />

                <DropdownMenuLabel>Grupo de campos</DropdownMenuLabel>
                <DropdownMenuGroup>
                  {permission.can('CREATE_FIELD') && (
                    <DropdownMenuItem
                      className="inline-flex space-x-1 w-full"
                      onClick={() => {
                        closeMenu();
                        router.navigate({
                          to: '/tables/$slug/field/create',
                          params: { slug },
                          search: { 'field-type': E_FIELD_TYPE.FIELD_GROUP },
                        });
                      }}
                    >
                      <PlusIcon className="size-4" />
                      <span>Novo grupo</span>
                    </DropdownMenuItem>
                  )}

                  {permission.can('UPDATE_FIELD') &&
                    table.status === 'success' &&
                    fieldGroups.map((field) => (
                      <FieldGroupSubMenu
                        key={field._id}
                        field={field}
                        originSlug={slug}
                        parentTable={table.data}
                        onNavigate={closeMenu}
                        onManageGroup={(gSlug) => {
                          closeMenu();
                          setGroupTarget((previous) => ({
                            slug: gSlug,
                            nonce: (previous?.nonce ?? 0) + 1,
                          }));
                        }}
                      />
                    ))}
                </DropdownMenuGroup>
              </React.Fragment>
            )}

          {permission.can('UPDATE_FIELD') && table.data && (
            <React.Fragment>
              <DropdownMenuSeparator />

              <DropdownMenuGroup>
                <ExtensionSlot
                  id="table.fields.manage"
                  context={{ table: table.data, slug }}
                />
              </DropdownMenuGroup>
            </React.Fragment>
          )}

          {permission.can('UPDATE_TABLE') && (
            <React.Fragment>
              <DropdownMenuSeparator />

              <DropdownMenuLabel>Geral</DropdownMenuLabel>

              <DropdownMenuGroup>
                <DropdownMenuItem
                  className="inline-flex space-x-1 w-full"
                  onClick={() => {
                    closeMenu();
                    router.navigate({
                      to: '/tables/$slug/detail',
                      params: { slug },
                    });
                  }}
                >
                  <PencilIcon className="size-4" />
                  {table.data?.type === E_TABLE_TYPE.TABLE && (
                    <span>Editar tabela</span>
                  )}
                  {table.data?.type === E_TABLE_TYPE.FIELD_GROUP && (
                    <span>Editar grupo</span>
                  )}
                </DropdownMenuItem>

                <DropdownMenuItem
                  className="inline-flex space-x-1 w-full"
                  onClick={() => {
                    closeMenu();
                    router.navigate({
                      to: '/tables/$slug/methods',
                      params: { slug },
                    });
                  }}
                >
                  <CodepenIcon className="size-4" />
                  <span>Métodos</span>
                </DropdownMenuItem>

                {table.data?.type === E_TABLE_TYPE.TABLE && (
                  <DropdownMenuItem
                    className="inline-flex space-x-1 w-full"
                    data-test-id="api-endpoints-btn"
                    onClick={() => {
                      closeMenu();
                      setApiModalOpen(true);
                    }}
                  >
                    <InfoIcon className="size-4" />
                    <span>Informações da API</span>
                  </DropdownMenuItem>
                )}

                {table.data?.type === E_TABLE_TYPE.TABLE && (
                  <DropdownMenuItem
                    className="inline-flex space-x-1 w-full"
                    onClick={() => {
                      closeMenu();
                      const embedUrl = window.location.href;
                      const iframeCode = `<iframe src="${embedUrl}" width="100%" height="600" frameborder="0"></iframe>`;
                      navigator.clipboard.writeText(iframeCode);
                      toast.info('Código embed copiado', {
                        description:
                          'O código iframe foi copiado para a área de transferência',
                      });
                    }}
                  >
                    <CodeIcon className="size-4" />
                    <span>Gerar código embed</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuGroup>
            </React.Fragment>
          )}
        </DropdownMenuContent>

        <ApiEndpointsModal
          tableSlug={tableSlug}
          open={apiModalOpen}
          onOpenChange={setApiModalOpen}
        />
      </DropdownMenu>

      {table.data && (
        <TableFieldManagementSheet
          ref={fieldTriggerRef}
          asChild
          table={table.data}
        >
          <button
            type="button"
            className="hidden"
            aria-hidden
          />
        </TableFieldManagementSheet>
      )}

      {table.data && groupTarget && (
        <GroupFieldManagementSheet
          key={groupTarget.nonce}
          ref={groupTriggerRef}
          asChild
          table={table.data}
          groupSlug={groupTarget.slug}
        >
          <button
            type="button"
            className="hidden"
            aria-hidden
          />
        </GroupFieldManagementSheet>
      )}
    </>
  );
}
