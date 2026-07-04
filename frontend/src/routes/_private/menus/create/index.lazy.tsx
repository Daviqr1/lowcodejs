import {
  createLazyFileRoute,
  useNavigate,
  useRouter,
} from '@tanstack/react-router';
import { useStore } from '@tanstack/react-store';
import { toast } from 'sonner';

import { parseMenuPosition } from '../-position';

import {
  CreateMenuFormFields,
  MenuCreateSchema,
  menuFormDefaultValues,
} from './-create-form';

import { FormFooter } from '@/components/common/form-footer';
import { PageHeader, PageShell } from '@/components/common/page-shell';
import { useSidebar } from '@/components/ui/sidebar';
import { useCreateMenu } from '@/hooks/tanstack-query/use-menu-create';
import { useAppForm } from '@/integrations/tanstack-form/form-hook';
import { useApiErrorAutoClear } from '@/integrations/tanstack-form/use-api-error-auto-clear';
import type { E_MENU_ITEM_TYPE } from '@/lib/constant';
import { applyApiFieldErrors } from '@/lib/form-utils';
import { handleApiError } from '@/lib/handle-api-error';
import type { ValueOf } from '@/lib/interfaces';

export const Route = createLazyFileRoute('/_private/menus/create/')({
  component: RouteComponent,
});

function RouteComponent(): React.JSX.Element {
  const sidebar = useSidebar();
  const router = useRouter();
  const navigate = useNavigate();

  const _create = useCreateMenu({
    onSuccess() {
      toast.success('Menu criado', {
        description: 'O menu foi criado com sucesso',
      });

      form.reset();
      navigate({ to: '/menus', search: { page: 1, perPage: 50 } });
      sidebar.setOpen(true);
      router.invalidate();
    },
    onError(error) {
      handleApiError(error, {
        context: 'Erro ao criar o menu',
        onFieldErrors: (errors) => applyApiFieldErrors(form, errors),
      });
    },
  });

  const form = useAppForm({
    defaultValues: menuFormDefaultValues,
    // @ts-expect-error Zod Standard Schema type inference
    validators: { onChange: MenuCreateSchema, onSubmit: MenuCreateSchema },
    onSubmit: async ({ value }) => {
      if (_create.status === 'pending') return;

      const order = parseMenuPosition(value.position, value.parent);
      if (order === null) return;

      await _create.mutateAsync({
        name: value.name,
        type: value.type,
        parent: value.parent || null,
        table: value.table || null,
        html: value.html || null,
        url: value.url || null,
        icon: value.icon || null,
        order,
        isInitial: value.type !== 'SEPARATOR' && value.isInitial,
        extension: value.extension ?? null,
        visibility: value.visibility,
      });
    },
  });

  useApiErrorAutoClear(form);

  const isPending = _create.status === 'pending';
  const menuType: ValueOf<typeof E_MENU_ITEM_TYPE> | '' = useStore(
    form.store,
    (state) => state.values.type,
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
    <PageShell data-test-id="create-menu-page">
      <PageShell.Header>
        <PageHeader
          onBack={goBack}
          title="Criar novo menu"
        />
      </PageShell.Header>

      <PageShell.Content>
        <form
          data-test-id="create-menu-form"
          className="flex-1 flex flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <CreateMenuFormFields
            form={form}
            isPending={isPending}
            menuType={menuType}
          />
        </form>
      </PageShell.Content>

      <PageShell.Footer>
        <FormFooter
          form={form}
          onCancel={() =>
            navigate({ to: '/menus', search: { page: 1, perPage: 50 } })
          }
          submitLabel="Criar"
        />
      </PageShell.Footer>
    </PageShell>
  );
}
