import { useMutation } from '@tanstack/react-query';
import { Trash2Icon } from 'lucide-react';
import React from 'react';
import { toast } from 'sonner';

import { PermanentDeleteConfirmDialog } from '@/components/common/permanent-delete-confirm-dialog';
import { Button } from '@/components/ui/button';
import { queryKeys } from '@/hooks/tanstack-query/_query-keys';
import { API } from '@/lib/api';
import { handleApiError } from '@/lib/handle-api-error';
import { getQueryClient } from '@/lib/query-client';

export function TableEmptyTrashDialog(): React.JSX.Element {
  const emptyTrash = useMutation({
    mutationFn: async function () {
      const response = await API.delete<{ deleted: number }>(
        '/tables/empty-trash',
      );
      return response.data;
    },
    onSuccess(result) {
      getQueryClient().invalidateQueries({
        queryKey: queryKeys.tables.lists(),
      });

      let description = result.deleted
        .toString()
        .concat(' tabelas excluídas permanentemente');
      if (result.deleted === 1)
        description = '1 tabela excluída permanentemente';
      toast.success('Lixeira esvaziada!', { description });
    },
    onError(error) {
      handleApiError(error, { context: 'Erro ao esvaziar lixeira' });
    },
  });

  return (
    <PermanentDeleteConfirmDialog
      asChild
      title="Esvaziar lixeira"
      description="Essa ação é irreversível. Todas as tabelas na lixeira serão excluídas permanentemente, incluindo seus campos e registros."
      itemsCount={0}
      isPending={emptyTrash.isPending}
      onConfirm={(close) => {
        emptyTrash.mutateAsync(undefined, { onSuccess: close });
      }}
      testId="empty-trash-tables-dialog"
    >
      <Button
        variant="destructive"
        size="sm"
        className="py-1 px-2 h-auto inline-flex gap-1"
      >
        <Trash2Icon className="size-4" />
        <span>Esvaziar lixeira</span>
      </Button>
    </PermanentDeleteConfirmDialog>
  );
}
