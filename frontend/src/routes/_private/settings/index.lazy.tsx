import { useSuspenseQuery } from '@tanstack/react-query';
import { createLazyFileRoute, useRouter } from '@tanstack/react-router';
import { PencilIcon } from 'lucide-react';
import React from 'react';
import { toast } from 'sonner';

import { StorageMigrationCard } from './-storage-migration-card';
import type { SettingUpdateFormValues } from './-update-form';
import { SettingUpdateSchema, UpdateSettingFormFields } from './-update-form';
import { SettingView } from './-view';

import {
  UploadingProvider,
  useIsUploading,
} from '@/components/common/file-upload/uploading-context';
import { FormFooter } from '@/components/common/form-footer';
import { PageHeader, PageShell } from '@/components/common/page-shell';
import { Button } from '@/components/ui/button';
import { settingOptions } from '@/hooks/tanstack-query/_query-options';
import { useUpdateSetting } from '@/hooks/tanstack-query/use-setting-update';
import { useAppForm } from '@/integrations/tanstack-form/form-hook';
import { useApiErrorAutoClear } from '@/integrations/tanstack-form/use-api-error-auto-clear';
import { applyApiFieldErrors } from '@/lib/form-utils';
import { handleApiError } from '@/lib/handle-api-error';
import type { ISetting } from '@/lib/interfaces';

export const Route = createLazyFileRoute('/_private/settings/')({
  component: RouteComponent,
});

function resolveStringDefault(value: string | null | undefined): string {
  if (value === null || value === undefined) return '';
  return value;
}

function resolveNumberDefault(value: number | null | undefined): string {
  if (value === null || value === undefined) return '';
  return String(value);
}

function stringOrNull(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  return trimmed;
}

function numberOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  const parsed = Number(trimmed);
  if (isNaN(parsed)) return null;
  return parsed;
}

function secretOrUndefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (trimmed) return trimmed;
  return undefined;
}

function buildSettingFormValues(data: ISetting): SettingUpdateFormValues {
  return {
    SYSTEM_NAME: data.SYSTEM_NAME || 'LowCodeJs',
    SYSTEM_DESCRIPTION: data.SYSTEM_DESCRIPTION || 'Plataforma Oficial',
    LOCALE: data.LOCALE,
    STORAGE_DRIVER: data.STORAGE_DRIVER || 'local',
    STORAGE_ENDPOINT: data.STORAGE_ENDPOINT || '',
    STORAGE_REGION: data.STORAGE_REGION || 'us-east-1',
    STORAGE_BUCKET: data.STORAGE_BUCKET || '',
    STORAGE_ACCESS_KEY: data.STORAGE_ACCESS_KEY || '',
    STORAGE_SECRET_KEY: data.STORAGE_SECRET_KEY || '',
    LOGO_SMALL_URL: data.LOGO_SMALL_URL,
    LOGO_LARGE_URL: data.LOGO_LARGE_URL,
    LOGO_SMALL_DARK_URL: data.LOGO_SMALL_DARK_URL ?? null,
    LOGO_LARGE_DARK_URL: data.LOGO_LARGE_DARK_URL ?? null,
    LOGIN_BACKGROUND_URL: data.LOGIN_BACKGROUND_URL ?? null,
    FILE_UPLOAD_MAX_SIZE: String(data.FILE_UPLOAD_MAX_SIZE),
    FILE_UPLOAD_MAX_FILES_PER_UPLOAD: String(
      data.FILE_UPLOAD_MAX_FILES_PER_UPLOAD,
    ),
    FILE_UPLOAD_ACCEPTED: data.FILE_UPLOAD_ACCEPTED.join(';'),
    PAGINATION_PER_PAGE: String(data.PAGINATION_PER_PAGE),
    MODEL_CLONE_TABLES: data.MODEL_CLONE_TABLES.flatMap((t) => t._id),
    EMAIL_PROVIDER_HOST: resolveStringDefault(data.EMAIL_PROVIDER_HOST),
    EMAIL_PROVIDER_PORT: resolveNumberDefault(data.EMAIL_PROVIDER_PORT),
    EMAIL_PROVIDER_USER: resolveStringDefault(data.EMAIL_PROVIDER_USER),
    EMAIL_PROVIDER_PASSWORD: resolveStringDefault(data.EMAIL_PROVIDER_PASSWORD),
    EMAIL_PROVIDER_FROM: resolveStringDefault(data.EMAIL_PROVIDER_FROM),
    OPENAI_API_KEY: data.LLM_API_KEY || data.OPENAI_API_KEY || '',
    AI_ASSISTANT_ENABLED: data.AI_ASSISTANT_ENABLED ?? false,
    CHAT_HISTORY_ENABLED: data.CHAT_HISTORY_ENABLED ?? false,
    MCP_SERVER_URL: data.MCP_SERVER_URL || '',
    MCP_SERVER_TOKEN: data.MCP_SERVER_TOKEN || '',
    MCP_LOWCODE_API_URL: data.MCP_LOWCODE_API_URL || '',
    OPENAI_MODEL: data.LLM_MODEL || data.OPENAI_MODEL || 'gpt-4.1-nano',
    AI_LLM_PROVIDER: data.AI_LLM_PROVIDER || 'openai',
    LLM_API_KEY: data.LLM_API_KEY || data.OPENAI_API_KEY || '',
    LLM_MODEL: data.LLM_MODEL || data.OPENAI_MODEL || 'gpt-4.1-nano',
    LLM_BASE_URL: data.LLM_BASE_URL || 'http://127.0.0.1:11434/v1',
    logoSmallFile: [],
    logoLargeFile: [],
    logoSmallDarkFile: [],
    logoLargeDarkFile: [],
    loginBackgroundFile: [],
  };
}

function RouteComponent(): React.JSX.Element {
  const { data } = useSuspenseQuery(settingOptions());

  const [mode, setMode] = React.useState<'show' | 'edit'>('show');

  return (
    <PageShell data-test-id="settings-page">
      {/* Header */}
      <PageShell.Header borderBottom={false}>
        <PageHeader title="Configurações do Sistema">
          {mode === 'show' && (
            <Button
              type="button"
              className="px-2 cursor-pointer max-w-40 w-full"
              size="sm"
              onClick={() => setMode('edit')}
              data-test-id="settings-edit-btn"
            >
              <PencilIcon className="size-4 mr-1" />
              <span>Editar</span>
            </Button>
          )}
        </PageHeader>
      </PageShell.Header>

      {/* Content */}
      <PageShell.Content className="overflow-hidden">
        <StorageMigrationCard />
        <UploadingProvider>
          <SettingUpdateContent
            data={data}
            mode={mode}
            setMode={setMode}
          />
        </UploadingProvider>
      </PageShell.Content>
    </PageShell>
  );
}

type SettingUpdateContentProps = {
  data: ISetting;
  mode: 'show' | 'edit';
  setMode: React.Dispatch<React.SetStateAction<'show' | 'edit'>>;
};

function SettingUpdateContent({
  data,
  mode,
  setMode,
}: SettingUpdateContentProps): React.JSX.Element {
  const router = useRouter();
  const isUploading = useIsUploading();

  const _update = useUpdateSetting({
    onSuccess(updated) {
      toast.success('Configurações atualizadas', {
        description:
          'As configurações do sistema foram atualizadas com sucesso',
      });

      form.reset(buildSettingFormValues(updated));
      setMode('show');
      router.invalidate();
    },
    onError(error) {
      handleApiError(error, {
        context: 'Erro ao atualizar configurações',
        onFieldErrors: (errors) => applyApiFieldErrors(form, errors),
      });
    },
  });

  const form = useAppForm({
    defaultValues: buildSettingFormValues(data),
    validators: {
      onChange: SettingUpdateSchema,
      onSubmit: SettingUpdateSchema,
    },
    onSubmit: async ({ value }) => {
      if (_update.status === 'pending') return;

      const isS3 = value.STORAGE_DRIVER === 's3';
      const payload = {
        SYSTEM_NAME: value.SYSTEM_NAME.trim(),
        SYSTEM_DESCRIPTION: value.SYSTEM_DESCRIPTION.trim(),
        LOCALE: value.LOCALE.trim(),
        STORAGE_DRIVER: value.STORAGE_DRIVER,
        STORAGE_ENDPOINT:
          (isS3 && (value.STORAGE_ENDPOINT?.trim() || undefined)) || undefined,
        STORAGE_REGION:
          (isS3 && (value.STORAGE_REGION?.trim() || 'us-east-1')) || undefined,
        STORAGE_BUCKET:
          (isS3 && (value.STORAGE_BUCKET?.trim() || undefined)) || undefined,
        STORAGE_ACCESS_KEY:
          (isS3 && (value.STORAGE_ACCESS_KEY?.trim() || undefined)) ||
          undefined,
        STORAGE_SECRET_KEY:
          (isS3 && (value.STORAGE_SECRET_KEY?.trim() || undefined)) ||
          undefined,
        LOGO_SMALL_URL: value.LOGO_SMALL_URL ?? undefined,
        LOGO_LARGE_URL: value.LOGO_LARGE_URL ?? undefined,
        LOGO_SMALL_DARK_URL: value.LOGO_SMALL_DARK_URL ?? undefined,
        LOGO_LARGE_DARK_URL: value.LOGO_LARGE_DARK_URL ?? undefined,
        LOGIN_BACKGROUND_URL: value.LOGIN_BACKGROUND_URL ?? undefined,
        FILE_UPLOAD_MAX_SIZE: Number(value.FILE_UPLOAD_MAX_SIZE),
        FILE_UPLOAD_MAX_FILES_PER_UPLOAD: Number(
          value.FILE_UPLOAD_MAX_FILES_PER_UPLOAD,
        ),
        FILE_UPLOAD_ACCEPTED: value.FILE_UPLOAD_ACCEPTED.split(';')
          .map((s) => s.trim())
          .filter(Boolean)
          .join(';'),
        PAGINATION_PER_PAGE: Number(value.PAGINATION_PER_PAGE),
        MODEL_CLONE_TABLES: value.MODEL_CLONE_TABLES,
        EMAIL_PROVIDER_HOST: stringOrNull(value.EMAIL_PROVIDER_HOST),
        EMAIL_PROVIDER_PORT: numberOrNull(value.EMAIL_PROVIDER_PORT),
        EMAIL_PROVIDER_USER: stringOrNull(value.EMAIL_PROVIDER_USER),
        EMAIL_PROVIDER_PASSWORD: stringOrNull(value.EMAIL_PROVIDER_PASSWORD),
        EMAIL_PROVIDER_FROM: stringOrNull(value.EMAIL_PROVIDER_FROM),
        OPENAI_API_KEY: secretOrUndefined(value.LLM_API_KEY),
        AI_ASSISTANT_ENABLED: value.AI_ASSISTANT_ENABLED,
        CHAT_HISTORY_ENABLED: value.CHAT_HISTORY_ENABLED,
        MCP_SERVER_URL: value.MCP_SERVER_URL?.trim() || null,
        MCP_SERVER_TOKEN: secretOrUndefined(value.MCP_SERVER_TOKEN),
        MCP_LOWCODE_API_URL: value.MCP_LOWCODE_API_URL?.trim() || null,
        OPENAI_MODEL: value.LLM_MODEL?.trim() || 'gpt-4.1-nano',
        AI_LLM_PROVIDER: value.AI_LLM_PROVIDER?.trim() || 'openai',
        LLM_API_KEY: secretOrUndefined(value.LLM_API_KEY),
        LLM_MODEL: value.LLM_MODEL?.trim() || 'gpt-4.1-nano',
        LLM_BASE_URL:
          (value.AI_LLM_PROVIDER === 'ollama' &&
            (value.LLM_BASE_URL?.trim() || null)) ||
          null,
      };

      await _update.mutateAsync(payload);
    },
  });

  useApiErrorAutoClear(form);

  React.useEffect(() => {
    if (mode !== 'edit') return;
    form.reset(buildSettingFormValues(data));
    // Recarrega o form só ao entrar em modo edição — não quando `data` muda
    // durante a edição (evita apagar o provedor selecionado antes de salvar).
  }, [mode]);

  const isPending = _update.status === 'pending';

  return (
    <>
      {mode === 'show' && (
        <div className="flex-1 flex flex-col min-h-0 overflow-auto">
          <SettingView data={data} />
        </div>
      )}

      {mode === 'edit' && (
        <form
          className="flex-1 flex flex-col min-h-0 overflow-auto"
          data-test-id="settings-update-form"
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <UpdateSettingFormFields
            form={form}
            isPending={isPending}
            mode={mode}
            settingData={data}
          />
        </form>
      )}

      {/* Footer */}
      {mode === 'edit' && (
        <PageShell.Footer className="bg-sidebar">
          <FormFooter
            form={form}
            cancelTestId="settings-update-cancel-btn"
            submitTestId="settings-update-submit-btn"
            submitDisabled={isUploading}
            onCancel={() => {
              form.reset();
              setMode('show');
            }}
          />
        </PageShell.Footer>
      )}
    </>
  );
}
