import { useSuspenseQuery } from '@tanstack/react-query';
import {
  createLazyFileRoute,
  useParams,
  useRouter,
  useSearch,
} from '@tanstack/react-router';
import { useStore } from '@tanstack/react-store';
import { ArchiveRestoreIcon, PencilIcon, TrashIcon } from 'lucide-react';
import React from 'react';
import { toast } from 'sonner';

import { parseMenuPosition } from '../-position';

import type { MenuUpdateFormValues } from './-update-form';
import { MenuUpdateSchema, UpdateMenuFormFields } from './-update-form';
import { MenuView } from './-view';

import { ActionDialog } from '@/components/common/action-dialog';
import { FormFooter } from '@/components/common/form-footer';
import { PageHeader, PageShell } from '@/components/common/page-shell';
import { Button } from '@/components/ui/button';
import { useSidebar } from '@/components/ui/sidebar';
import { queryKeys } from '@/hooks/tanstack-query/_query-keys';
import { menuDetailOptions } from '@/hooks/tanstack-query/_query-options';
import { useUpdateMenu } from '@/hooks/tanstack-query/use-menu-update';
import { useAppForm } from '@/integrations/tanstack-form/form-hook';
import { useApiErrorAutoClear } from '@/integrations/tanstack-form/use-api-error-auto-clear';
import { API } from '@/lib/api';
import type { E_MENU_ITEM_TYPE } from '@/lib/constant';
import { applyApiFieldErrors } from '@/lib/form-utils';
import { handleApiError } from '@/lib/handle-api-error';
import type { IMenu, ValueOf } from '@/lib/interfaces';

export const Route = createLazyFileRoute('/_private/menus/$menuId/')({
  component: RouteComponent,
});

function RouteComponent(): React.JSX.Element {
  const { menuId } = useParams({
    from: '/_private/menus/$menuId/',
  });

  const sidebar = useSidebar();
  const router = useRouter();

  const { data } = useSuspenseQuery(menuDetailOptions(menuId));

  const search = useSearch({ from: '/_private/menus/$menuId/' });
  const [mode, setMode] = React.useState<'show' | 'edit'>(
    search.mode === 'edit' ? 'edit' : 'show',
  );

  const goBack = (): void => {
    sidebar.setOpen(true);
    router.navigate({
      to: '/menus',
      replace: true,
      search: { page: 1, perPage: 50 },
    });
  };

  return (
    <PageShell data-test-id="menu-detail-page">
      <PageShell.Header borderBottom={false}>
        <PageHeader
          onBack={goBack}
          title="Detalhes do menu"
        />
      </PageShell.Header>

      <MenuUpdateContent
        data={data}
        mode={mode}
        setMode={setMode}
      />
    </PageShell>
  );
}

interface MenuUpdateContentProps {
  data: IMenu;
  mode: 'show' | 'edit';
  setMode: React.Dispatch<React.SetStateAction<'show' | 'edit'>>;
}

function MenuUpdateContent({
  data,
  mode,
  setMode,
}: MenuUpdateContentProps): React.JSX.Element {
  const sidebar = useSidebar();
  const router = useRouter();

  const goBack = (): void => {
    sidebar.setOpen(true);
    router.navigate({
      to: '/menus',
      replace: true,
      search: { page: 1, perPage: 50 },
    });
  };

  const _update = useUpdateMenu({
    onSuccess() {
      toast.success('Menu atualizado', {
        description: 'Os dados do menu foram atualizados com sucesso',
      });

      form.reset();
      setMode('show');
      router.invalidate();
    },
    onError(error) {
      handleApiError(error, {
        context: 'Erro ao atualizar o menu',
        onFieldErrors: (errors) => applyApiFieldErrors(form, errors),
      });
    },
  });

  const form = useAppForm({
    defaultValues: {
      name: data.name,
      type: data.type,
      table: data.table?._id ?? '',
      html: data.html ?? '',
      url: data.url ?? '',
      icon: data.icon ?? null,
      parent: data.parent?._id ?? '',
      position: data.parent
        ? String((data.order ?? 0) + 1)
        : String(data.order ?? 0),
      isInitial: data.isInitial ?? false,
      extension: data.extension ?? null,
      iconFile: [] as Array<File>,
    } satisfies MenuUpdateFormValues,
    // @ts-expect-error Zod Standard Schema type inference
    validators: { onChange: MenuUpdateSchema, onSubmit: MenuUpdateSchema },
    onSubmit: async ({ value }) => {
      if (_update.status === 'pending') return;

      const order = parseMenuPosition(value.position, value.parent);
      if (order === null) return;

      await _update.mutateAsync({
        _id: data._id,
        name: value.name,
        type: value.type,
        parent: value.parent || null,
        table: value.table || null,
        html: value.html || null,
        url: value.url || null,
        icon: value.icon || null,
        order,
        isInitial: value.type === 'SEPARATOR' ? false : value.isInitial,
        extension: value.extension ?? null,
      });
    },
  });

  useApiErrorAutoClear(form);

  const isPending = _update.status === 'pending';
  const menuType = useStore(form.store, (state) => state.values.type) as
    | ValueOf<typeof E_MENU_ITEM_TYPE>
    | '';

  return (
    <>
      {mode === 'show' && (
        <div className="shrink-0 px-2 pb-2 flex flex-row justify-end gap-1">
          {!data.trashed && (
            <ActionDialog
              asChild
              config={{
                mutationFn: async function () {
                  await API.patch('/menu/'.concat(data._id).concat('/trash'));
                },
                invalidateKeys: [queryKeys.menus.all],
                toast: {
                  title: 'Menu enviado para lixeira!',
                  description: 'O menu foi movido para a lixeira',
                },
                navigation: {
                  to: '/menus',
                  search: { page: 1, perPage: 50 },
                },
                errorContext: 'Erro ao enviar menu para lixeira',
                title: 'Enviar menu para a lixeira',
                description:
                  'Ao confirmar essa ação, o menu será enviado para a lixeira',
                testId: 'trash-menu-dialog',
                confirmTestId: 'trash-menu-confirm-btn',
              }}
            >
              <Button
                data-test-id="menu-trash-btn"
                type="button"
                className="px-2 cursor-pointer"
                size="sm"
                variant="outline"
              >
                <TrashIcon className="size-4 mr-1" />
                <span>Enviar para lixeira</span>
              </Button>
            </ActionDialog>
          )}
          {data.trashed && (
            <ActionDialog
              asChild
              config={{
                mutationFn: async function () {
                  await API.patch('/menu/'.concat(data._id).concat('/restore'));
                },
                invalidateKeys: [queryKeys.menus.all],
                toast: {
                  title: 'Menu restaurado!',
                  description: 'O menu foi restaurado da lixeira',
                },
                errorContext: 'Erro ao restaurar menu da lixeira',
                title: 'Restaurar menu da lixeira',
                description:
                  'Ao confirmar essa ação, o menu será restaurado da lixeira',
                testId: 'restore-menu-dialog',
                confirmTestId: 'restore-menu-confirm-btn',
              }}
            >
              <Button
                type="button"
                className="px-2 cursor-pointer"
                size="sm"
                variant="outline"
              >
                <ArchiveRestoreIcon className="size-4 mr-1" />
                <span>Restaurar</span>
              </Button>
            </ActionDialog>
          )}
          {data.trashed && (
            <ActionDialog
              asChild
              config={{
                mutationFn: async function () {
                  await API.delete('/menu/'.concat(data._id));
                },
                invalidateKeys: [queryKeys.menus.all],
                toast: {
                  title: 'Menu excluído permanentemente!',
                  description: 'O menu foi excluído permanentemente',
                },
                navigation: {
                  to: '/menus',
                  search: { page: 1, perPage: 50 },
                },
                errorContext: 'Erro ao excluir menu',
                title: 'Excluir menu permanentemente',
                description:
                  'Essa ação é irreversível. O menu será excluído permanentemente e não poderá ser recuperado.',
                testId: 'delete-menu-dialog',
                confirmTestId: 'delete-menu-confirm-btn',
              }}
            >
              <Button
                data-test-id="menu-delete-btn"
                type="button"
                className="px-2 cursor-pointer"
                size="sm"
                variant="destructive"
              >
                <TrashIcon className="size-4 mr-1" />
                <span>Excluir permanentemente</span>
              </Button>
            </ActionDialog>
          )}
          <Button
            data-test-id="menu-edit-btn"
            type="button"
            className="px-2 cursor-pointer max-w-40 w-full"
            size="sm"
            onClick={() => setMode('edit')}
          >
            <PencilIcon className="size-4 mr-1" />
            <span>Editar</span>
          </Button>
        </div>
      )}

      {mode === 'show' && (
        <PageShell.Content>
          <MenuView data={data} />
        </PageShell.Content>
      )}

      {mode === 'show' && (
        <PageShell.Footer className="bg-sidebar">
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="px-2 cursor-pointer max-w-40 w-full"
              onClick={goBack}
            >
              <span>Voltar</span>
            </Button>
          </div>
        </PageShell.Footer>
      )}

      {mode === 'edit' && (
        <PageShell.Content>
          <form
            data-test-id="menu-update-form"
            className="flex-1 flex flex-col min-h-0 overflow-auto"
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit();
            }}
          >
            <UpdateMenuFormFields
              form={form}
              isPending={isPending}
              mode={mode}
              menuType={menuType}
              originalType={data.type}
              hasChildren={(data.children?.length ?? 0) > 0}
              menuId={data._id}
            />
          </form>
        </PageShell.Content>
      )}

      {mode === 'edit' && (
        <PageShell.Footer className="bg-sidebar">
          <FormFooter
            form={form}
            onCancel={() => {
              form.reset();
              setMode('show');
            }}
            submitTestId="menu-update-submit-btn"
            cancelTestId="menu-update-cancel-btn"
          />
        </PageShell.Footer>
      )}
    </>
  );
}
