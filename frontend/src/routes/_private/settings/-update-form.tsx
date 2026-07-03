import {
  BotIcon,
  DatabaseIcon,
  EyeClosedIcon,
  EyeIcon,
  FileTextIcon,
  HardDriveIcon,
  ImageIcon,
  Languages,
  MailIcon,
  TypeIcon,
  UploadIcon,
} from 'lucide-react';
import React from 'react';
import { z } from 'zod';

import { FileUploadWithStorage } from '@/components/common/file-upload/file-upload-with-storage';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { withForm } from '@/integrations/tanstack-form/form-hook';
import {
  AI_LLM_PROVIDER_OPTIONS,
  LLM_MODEL_OPTIONS,
  providerRequiresApiKey,
  providerShowsBaseUrl,
} from '@/lib/ai-llm-providers';
import type { AiLlmProvider } from '@/lib/ai-llm-providers';
import { E_AI_LLM_PROVIDER } from '@/lib/constant';
import type { ISetting, IStorage, Merge } from '@/lib/interfaces';

// Schema com campos de UI (logoSmallFile/logoLargeFile são para upload no frontend)
export const SettingUpdateSchema = z.object({
  SYSTEM_NAME: z
    .string()
    .min(1, 'O nome do sistema é obrigatório')
    .max(100, 'O nome do sistema deve ter no máximo 100 caracteres'),
  SYSTEM_DESCRIPTION: z
    .string()
    .max(200, 'A descrição do sistema deve ter no máximo 200 caracteres'),
  LOCALE: z.string().min(1, 'O idioma é obrigatório'),
  STORAGE_DRIVER: z.enum(['local', 's3']),
  STORAGE_ENDPOINT: z.string(),
  STORAGE_REGION: z.string(),
  STORAGE_BUCKET: z.string(),
  STORAGE_ACCESS_KEY: z.string(),
  STORAGE_SECRET_KEY: z.string(),
  LOGO_SMALL_URL: z.string().nullable(),
  LOGO_LARGE_URL: z.string().nullable(),
  LOGO_SMALL_DARK_URL: z.string().nullable(),
  LOGO_LARGE_DARK_URL: z.string().nullable(),
  LOGIN_BACKGROUND_URL: z.string().nullable(),
  FILE_UPLOAD_MAX_SIZE: z
    .string()
    .min(1, 'O tamanho máximo de arquivo é obrigatório'),
  FILE_UPLOAD_MAX_FILES_PER_UPLOAD: z
    .string()
    .min(1, 'O máximo de arquivos por upload é obrigatório'),
  FILE_UPLOAD_ACCEPTED: z
    .string()
    .min(1, 'As extensões aceitas são obrigatórias'),
  PAGINATION_PER_PAGE: z.string().min(1, 'A paginação é obrigatória'),
  MODEL_CLONE_TABLES: z.array(z.string()),
  EMAIL_PROVIDER_HOST: z.string(),
  EMAIL_PROVIDER_PORT: z.string(),
  EMAIL_PROVIDER_USER: z.string(),
  EMAIL_PROVIDER_PASSWORD: z.string(),
  EMAIL_PROVIDER_FROM: z.string(),
  OPENAI_API_KEY: z.string(),
  AI_ASSISTANT_ENABLED: z.boolean(),
  CHAT_HISTORY_ENABLED: z.boolean(),
  MCP_SERVER_URL: z.string(),
  MCP_SERVER_TOKEN: z.string(),
  MCP_LOWCODE_API_URL: z.string(),
  OPENAI_MODEL: z.string(),
  AI_LLM_PROVIDER: z.string(),
  LLM_API_KEY: z.string(),
  LLM_MODEL: z.string(),
  LLM_BASE_URL: z.string(),
  logoSmallFile: z.array(z.instanceof(File)),
  logoLargeFile: z.array(z.instanceof(File)),
  logoSmallDarkFile: z.array(z.instanceof(File)),
  logoLargeDarkFile: z.array(z.instanceof(File)),
  loginBackgroundFile: z.array(z.instanceof(File)),
});

// Form usa string para números (inputs), payload usa number
export type SettingUpdateFormValues = Merge<
  {
    SYSTEM_NAME: string;
    SYSTEM_DESCRIPTION: string;
    LOCALE: string;
    STORAGE_DRIVER: 'local' | 's3';
    STORAGE_ENDPOINT: string;
    STORAGE_REGION: string;
    STORAGE_BUCKET: string;
    STORAGE_ACCESS_KEY: string;
    STORAGE_SECRET_KEY: string;
    LOGO_SMALL_URL: string | null;
    LOGO_LARGE_URL: string | null;
    LOGO_SMALL_DARK_URL: string | null;
    LOGO_LARGE_DARK_URL: string | null;
    LOGIN_BACKGROUND_URL: string | null;
    FILE_UPLOAD_MAX_SIZE: string;
    FILE_UPLOAD_MAX_FILES_PER_UPLOAD: string;
    FILE_UPLOAD_ACCEPTED: string;
    PAGINATION_PER_PAGE: string;
    MODEL_CLONE_TABLES: Array<string>;
    EMAIL_PROVIDER_HOST: string;
    EMAIL_PROVIDER_PORT: string;
    EMAIL_PROVIDER_USER: string;
    EMAIL_PROVIDER_PASSWORD: string;
    EMAIL_PROVIDER_FROM: string;
    OPENAI_API_KEY: string;
    AI_ASSISTANT_ENABLED: boolean;
    CHAT_HISTORY_ENABLED: boolean;
    MCP_SERVER_URL: string;
    MCP_SERVER_TOKEN: string;
    MCP_LOWCODE_API_URL: string;
    OPENAI_MODEL: string;
    AI_LLM_PROVIDER: string;
    LLM_API_KEY: string;
    LLM_MODEL: string;
    LLM_BASE_URL: string;
  },
  {
    logoSmallFile: Array<File>;
    logoLargeFile: Array<File>;
    logoSmallDarkFile: Array<File>;
    logoLargeDarkFile: Array<File>;
    loginBackgroundFile: Array<File>;
  }
>;

export const settingUpdateFormDefaultValues: SettingUpdateFormValues = {
  SYSTEM_NAME: 'LowCodeJs',
  SYSTEM_DESCRIPTION: 'Plataforma Oficial',
  LOCALE: 'pt-br',
  STORAGE_DRIVER: 'local',
  STORAGE_ENDPOINT: '',
  STORAGE_REGION: 'us-east-1',
  STORAGE_BUCKET: '',
  STORAGE_ACCESS_KEY: '',
  STORAGE_SECRET_KEY: '',
  LOGO_SMALL_URL: null,
  LOGO_LARGE_URL: null,
  LOGO_SMALL_DARK_URL: null,
  LOGO_LARGE_DARK_URL: null,
  LOGIN_BACKGROUND_URL: null,
  FILE_UPLOAD_MAX_SIZE: '10485760',
  FILE_UPLOAD_MAX_FILES_PER_UPLOAD: '5',
  FILE_UPLOAD_ACCEPTED: 'pdf;csv;png;jpeg;jpg;webp',
  PAGINATION_PER_PAGE: '50',
  MODEL_CLONE_TABLES: [],
  EMAIL_PROVIDER_HOST: '',
  EMAIL_PROVIDER_PORT: '',
  EMAIL_PROVIDER_USER: '',
  EMAIL_PROVIDER_PASSWORD: '',
  EMAIL_PROVIDER_FROM: '',
  OPENAI_API_KEY: '',
  AI_ASSISTANT_ENABLED: false,
  CHAT_HISTORY_ENABLED: false,
  MCP_SERVER_URL: '',
  MCP_SERVER_TOKEN: '',
  MCP_LOWCODE_API_URL: '',
  OPENAI_MODEL: 'gpt-4.1-nano',
  AI_LLM_PROVIDER: 'openai',
  LLM_API_KEY: '',
  LLM_MODEL: 'gpt-4.1-nano',
  LLM_BASE_URL: 'http://127.0.0.1:11434/v1',
  logoSmallFile: [],
  logoLargeFile: [],
  logoSmallDarkFile: [],
  logoLargeDarkFile: [],
  loginBackgroundFile: [],
};

export const UpdateSettingFormFields = withForm({
  defaultValues: settingUpdateFormDefaultValues,
  props: {
    isPending: false,
    mode: 'show' as 'show' | 'edit',
    settingData: null as ISetting | null,
  },
  render: function Render({ form, isPending, mode, settingData }) {
    const isDisabled = mode === 'show' || isPending;

    const [show, setShow] = React.useState({
      databaseUrl: false,
      emailPassword: false,
      llmApiKey: false,
      mcpToken: false,
      storageAccessKey: false,
      storageSecretKey: false,
    });

    const formatFileSize = (bytes: number): string => {
      if (bytes >= 1048576) {
        return `${(bytes / 1048576).toFixed(1)} MB`;
      }
      if (bytes >= 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
      }
      return `${bytes} bytes`;
    };

    return (
      <section
        data-test-id="settings-update-form-fields"
        className="space-y-4 p-2"
      >
        {/* Nome do Sistema */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TypeIcon className="w-5 h-5" />
              Nome do Sistema
            </CardTitle>
            <CardDescription>
              Configure o nome exibido no título da plataforma
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form.Field
              name="SYSTEM_NAME"
              validators={{
                onChange: ({ value }) => {
                  if (!value || value.trim() === '') {
                    return 'O nome do sistema é obrigatório';
                  }
                  if (value.length > 100) {
                    return {
                      message:
                        'O nome do sistema deve ter no máximo 100 caracteres',
                    };
                  }
                  return undefined;
                },
                onBlur: ({ value }) => {
                  if (!value || value.trim() === '') {
                    return 'O nome do sistema é obrigatório';
                  }
                  if (value.length > 100) {
                    return {
                      message:
                        'O nome do sistema deve ter no máximo 100 caracteres',
                    };
                  }
                  return undefined;
                },
              }}
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;

                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>
                      Nome do sistema
                    </FieldLabel>
                    <InputGroup>
                      <InputGroupInput
                        data-test-id="settings-system-name-input"
                        disabled={isDisabled}
                        id={field.name}
                        name={field.name}
                        type="text"
                        placeholder="LowCodeJs"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        aria-invalid={isInvalid}
                      />
                    </InputGroup>
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                );
              }}
            />

            <form.Field
              name="SYSTEM_DESCRIPTION"
              validators={{
                onChange: ({ value }) => {
                  if (value && value.length > 200) {
                    return {
                      message:
                        'A descrição do sistema deve ter no máximo 200 caracteres',
                    };
                  }
                  return undefined;
                },
                onBlur: ({ value }) => {
                  if (value && value.length > 200) {
                    return {
                      message:
                        'A descrição do sistema deve ter no máximo 200 caracteres',
                    };
                  }
                  return undefined;
                },
              }}
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;

                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>
                      Descrição do sistema
                    </FieldLabel>
                    <InputGroup>
                      <InputGroupInput
                        data-test-id="settings-system-description-input"
                        disabled={isDisabled}
                        id={field.name}
                        name={field.name}
                        type="text"
                        placeholder="Plataforma Oficial"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        aria-invalid={isInvalid}
                      />
                    </InputGroup>
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                );
              }}
            />
          </CardContent>
        </Card>

        {/* Idioma do Sistema */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Languages className="w-5 h-5" />
              Idioma do Sistema
            </CardTitle>
            <CardDescription>
              Configure o idioma padrão da aplicação
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form.Field
              name="LOCALE"
              validators={{
                onChange: ({ value }) => {
                  if (!value) {
                    return 'O idioma é obrigatório';
                  }
                  return undefined;
                },
                onBlur: ({ value }) => {
                  if (!value) {
                    return 'O idioma é obrigatório';
                  }
                  return undefined;
                },
              }}
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;

                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Idioma padrão</FieldLabel>
                    <Select
                      disabled={isDisabled}
                      value={field.state.value}
                      onValueChange={(value) => field.handleChange(value)}
                    >
                      <SelectTrigger
                        data-test-id="settings-locale-select"
                        className="w-full max-w-xs"
                      >
                        <SelectValue placeholder="Selecione um idioma" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pt-br">
                          Português (Brasil)
                        </SelectItem>
                        <SelectItem value="en-us">
                          English (United States)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                );
              }}
            />
          </CardContent>
        </Card>

        {/* Armazenamento */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDriveIcon className="w-5 h-5" />
              Armazenamento
            </CardTitle>
            <CardDescription>
              Configure o driver de armazenamento de arquivos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Toggle S3 */}
            <form.Field
              name="STORAGE_DRIVER"
              children={(field) => {
                const isS3 = field.state.value === 's3';
                return (
                  <Field>
                    <FieldLabel htmlFor={field.name}>Habilitar S3</FieldLabel>
                    <div className="text-sm text-muted-foreground mb-2">
                      Ativa o armazenamento remoto via S3. Alterar o driver
                      requer reinício do servidor para servir arquivos
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">
                        {isS3 && 'Ativo'}
                        {!isS3 && 'Inativo'}
                      </span>
                      <Switch
                        data-test-id="settings-storage-driver-switch"
                        checked={isS3}
                        onCheckedChange={(checked) => {
                          let driver: 'local' | 's3' = 'local';
                          if (checked) driver = 's3';
                          field.handleChange(driver);
                        }}
                        disabled={isDisabled}
                      />
                    </div>
                  </Field>
                );
              }}
            />

            {/* Campos S3 condicionais */}
            <form.Subscribe
              selector={(state) => state.values.STORAGE_DRIVER}
              children={(storageDriver) => {
                if (storageDriver !== 's3') return null;
                return (
                  <div className="space-y-4 border-t pt-4">
                    {/* Endpoint */}
                    <form.Field
                      name="STORAGE_ENDPOINT"
                      children={(field) => {
                        const isInvalid =
                          field.state.meta.isTouched &&
                          !field.state.meta.isValid;
                        return (
                          <Field data-invalid={isInvalid}>
                            <FieldLabel htmlFor={field.name}>
                              Endpoint
                            </FieldLabel>
                            <div className="text-sm text-muted-foreground mb-2">
                              URL do endpoint S3 (ex: https://s3.amazonaws.com)
                            </div>
                            <Input
                              data-test-id="settings-storage-endpoint-input"
                              disabled={isDisabled}
                              id={field.name}
                              name={field.name}
                              placeholder="https://s3.amazonaws.com"
                              value={field.state.value}
                              onBlur={field.handleBlur}
                              onChange={(e) =>
                                field.handleChange(e.target.value)
                              }
                            />
                            {isInvalid && (
                              <FieldError errors={field.state.meta.errors} />
                            )}
                          </Field>
                        );
                      }}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Região */}
                      <form.Field
                        name="STORAGE_REGION"
                        children={(field) => {
                          const isInvalid =
                            field.state.meta.isTouched &&
                            !field.state.meta.isValid;
                          return (
                            <Field data-invalid={isInvalid}>
                              <FieldLabel htmlFor={field.name}>
                                Região
                              </FieldLabel>
                              <Input
                                data-test-id="settings-storage-region-input"
                                disabled={isDisabled}
                                id={field.name}
                                name={field.name}
                                placeholder="us-east-1"
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(e) =>
                                  field.handleChange(e.target.value)
                                }
                              />
                              {isInvalid && (
                                <FieldError errors={field.state.meta.errors} />
                              )}
                            </Field>
                          );
                        }}
                      />

                      {/* Bucket */}
                      <form.Field
                        name="STORAGE_BUCKET"
                        children={(field) => {
                          const isInvalid =
                            field.state.meta.isTouched &&
                            !field.state.meta.isValid;
                          return (
                            <Field data-invalid={isInvalid}>
                              <FieldLabel htmlFor={field.name}>
                                Bucket
                              </FieldLabel>
                              <Input
                                data-test-id="settings-storage-bucket-input"
                                disabled={isDisabled}
                                id={field.name}
                                name={field.name}
                                placeholder="my-bucket"
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(e) =>
                                  field.handleChange(e.target.value)
                                }
                              />
                              {isInvalid && (
                                <FieldError errors={field.state.meta.errors} />
                              )}
                            </Field>
                          );
                        }}
                      />
                    </div>

                    {/* Access Key */}
                    <form.Field
                      name="STORAGE_ACCESS_KEY"
                      children={(field) => {
                        const isInvalid =
                          field.state.meta.isTouched &&
                          !field.state.meta.isValid;
                        return (
                          <Field data-invalid={isInvalid}>
                            <FieldLabel htmlFor={field.name}>
                              Access Key
                            </FieldLabel>
                            <InputGroup>
                              <InputGroupInput
                                data-test-id="settings-storage-access-key-input"
                                disabled={isDisabled}
                                id={field.name}
                                name={field.name}
                                type={
                                  (show.storageAccessKey && 'text') ||
                                  'password'
                                }
                                placeholder="Access Key"
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(e) =>
                                  field.handleChange(e.target.value)
                                }
                                aria-invalid={isInvalid}
                              />
                              <InputGroupAddon align="inline-end">
                                <InputGroupButton
                                  data-test-id="settings-storage-access-key-toggle-btn"
                                  disabled={isDisabled}
                                  type="button"
                                  aria-label="toggle access key visibility"
                                  title="toggle access key visibility"
                                  onClick={() =>
                                    setShow((state) => ({
                                      ...state,
                                      storageAccessKey: !state.storageAccessKey,
                                    }))
                                  }
                                >
                                  {show.storageAccessKey && <EyeClosedIcon />}
                                  {!show.storageAccessKey && <EyeIcon />}
                                </InputGroupButton>
                              </InputGroupAddon>
                            </InputGroup>
                            {isInvalid && (
                              <FieldError errors={field.state.meta.errors} />
                            )}
                          </Field>
                        );
                      }}
                    />

                    {/* Secret Key */}
                    <form.Field
                      name="STORAGE_SECRET_KEY"
                      children={(field) => {
                        const isInvalid =
                          field.state.meta.isTouched &&
                          !field.state.meta.isValid;
                        return (
                          <Field data-invalid={isInvalid}>
                            <FieldLabel htmlFor={field.name}>
                              Secret Key
                            </FieldLabel>
                            <InputGroup>
                              <InputGroupInput
                                data-test-id="settings-storage-secret-key-input"
                                disabled={isDisabled}
                                id={field.name}
                                name={field.name}
                                type={
                                  (show.storageSecretKey && 'text') ||
                                  'password'
                                }
                                placeholder="Secret Key"
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(e) =>
                                  field.handleChange(e.target.value)
                                }
                                aria-invalid={isInvalid}
                              />
                              <InputGroupAddon align="inline-end">
                                <InputGroupButton
                                  data-test-id="settings-storage-secret-key-toggle-btn"
                                  disabled={isDisabled}
                                  type="button"
                                  aria-label="toggle secret key visibility"
                                  title="toggle secret key visibility"
                                  onClick={() =>
                                    setShow((state) => ({
                                      ...state,
                                      storageSecretKey: !state.storageSecretKey,
                                    }))
                                  }
                                >
                                  {show.storageSecretKey && <EyeClosedIcon />}
                                  {!show.storageSecretKey && <EyeIcon />}
                                </InputGroupButton>
                              </InputGroupAddon>
                            </InputGroup>
                            {isInvalid && (
                              <FieldError errors={field.state.meta.errors} />
                            )}
                          </Field>
                        );
                      }}
                    />
                  </div>
                );
              }}
            />
          </CardContent>
        </Card>

        {/* Logos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              Logos do Sistema
            </CardTitle>
            <CardDescription>
              Configure os logos exibidos no sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Logo Pequeno */}
              <form.Field
                name="logoSmallFile"
                children={(field) => {
                  return (
                    <Field>
                      <FieldLabel>Logo Pequeno</FieldLabel>
                      {mode === 'edit' && (
                        <FileUploadWithStorage
                          value={field.state.value}
                          onValueChange={field.handleChange}
                          onStorageChange={(storages: Array<IStorage>) => {
                            if (storages[0]?.url) {
                              form.setFieldValue(
                                'LOGO_SMALL_URL',
                                storages[0].url,
                              );
                            }
                          }}
                          accept="image/*"
                          maxFiles={1}
                          maxSize={4 * 1024 * 1024}
                          placeholder="Arraste ou selecione o logo pequeno"
                          shouldDeleteFromStorage={false}
                          staticName="logo-small"
                        />
                      )}
                      {mode === 'show' && settingData?.LOGO_SMALL_URL && (
                        <div className="mt-2">
                          <img
                            src={settingData.LOGO_SMALL_URL}
                            alt="Logo pequeno atual"
                            className="h-12 w-auto border rounded"
                          />
                        </div>
                      )}
                    </Field>
                  );
                }}
              />

              {/* Logo Grande */}
              <form.Field
                name="logoLargeFile"
                children={(field) => {
                  return (
                    <Field>
                      <FieldLabel>Logo Grande</FieldLabel>
                      {mode === 'edit' && (
                        <FileUploadWithStorage
                          value={field.state.value}
                          onValueChange={field.handleChange}
                          onStorageChange={(storages: Array<IStorage>) => {
                            if (storages[0]?.url) {
                              form.setFieldValue(
                                'LOGO_LARGE_URL',
                                storages[0].url,
                              );
                            }
                          }}
                          accept="image/*"
                          maxFiles={1}
                          maxSize={4 * 1024 * 1024}
                          placeholder="Arraste ou selecione o logo grande"
                          shouldDeleteFromStorage={false}
                          staticName="logo-large"
                        />
                      )}
                      {mode === 'show' && settingData?.LOGO_LARGE_URL && (
                        <div className="mt-2">
                          <img
                            src={settingData.LOGO_LARGE_URL}
                            alt="Logo grande atual"
                            className="h-16 w-auto border rounded"
                          />
                        </div>
                      )}
                    </Field>
                  );
                }}
              />

              {/* Logo Pequeno (Modo Escuro) */}
              <form.Field
                name="logoSmallDarkFile"
                children={(field) => {
                  return (
                    <Field>
                      <FieldLabel>Logo Pequeno (Modo Escuro)</FieldLabel>
                      {mode === 'edit' && (
                        <FileUploadWithStorage
                          value={field.state.value}
                          onValueChange={field.handleChange}
                          onStorageChange={(storages: Array<IStorage>) => {
                            if (storages[0]?.url) {
                              form.setFieldValue(
                                'LOGO_SMALL_DARK_URL',
                                storages[0].url,
                              );
                            }
                          }}
                          accept="image/*"
                          maxFiles={1}
                          maxSize={4 * 1024 * 1024}
                          placeholder="Arraste ou selecione o logo pequeno (modo escuro)"
                          shouldDeleteFromStorage={false}
                          staticName="logo-small-dark"
                        />
                      )}
                      {mode === 'show' && settingData?.LOGO_SMALL_DARK_URL && (
                        <div className="mt-2 rounded border bg-zinc-900 p-2">
                          <img
                            src={settingData.LOGO_SMALL_DARK_URL}
                            alt="Logo pequeno (modo escuro) atual"
                            className="h-12 w-auto"
                          />
                        </div>
                      )}
                    </Field>
                  );
                }}
              />

              {/* Logo Grande (Modo Escuro) */}
              <form.Field
                name="logoLargeDarkFile"
                children={(field) => {
                  return (
                    <Field>
                      <FieldLabel>Logo Grande (Modo Escuro)</FieldLabel>
                      {mode === 'edit' && (
                        <FileUploadWithStorage
                          value={field.state.value}
                          onValueChange={field.handleChange}
                          onStorageChange={(storages: Array<IStorage>) => {
                            if (storages[0]?.url) {
                              form.setFieldValue(
                                'LOGO_LARGE_DARK_URL',
                                storages[0].url,
                              );
                            }
                          }}
                          accept="image/*"
                          maxFiles={1}
                          maxSize={4 * 1024 * 1024}
                          placeholder="Arraste ou selecione o logo grande (modo escuro)"
                          shouldDeleteFromStorage={false}
                          staticName="logo-large-dark"
                        />
                      )}
                      {mode === 'show' && settingData?.LOGO_LARGE_DARK_URL && (
                        <div className="mt-2 rounded border bg-zinc-900 p-2">
                          <img
                            src={settingData.LOGO_LARGE_DARK_URL}
                            alt="Logo grande (modo escuro) atual"
                            className="h-16 w-auto"
                          />
                        </div>
                      )}
                    </Field>
                  );
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Imagem de Fundo do Login */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              Imagem de Fundo do Login
            </CardTitle>
            <CardDescription>
              Imagem exibida na metade ilustrativa da tela de login. Quando
              definida, substitui o painel padrão (gradiente + texto). Use uma
              imagem em alta resolução — ela é redimensionada para cobrir o
              espaço sem distorcer.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form.Field
              name="loginBackgroundFile"
              children={(field) => {
                return (
                  <Field>
                    <FieldLabel>Imagem de Fundo</FieldLabel>
                    {mode === 'edit' && (
                      <FileUploadWithStorage
                        value={field.state.value}
                        onValueChange={field.handleChange}
                        onStorageChange={(storages: Array<IStorage>) => {
                          if (storages[0]?.url) {
                            form.setFieldValue(
                              'LOGIN_BACKGROUND_URL',
                              storages[0].url,
                            );
                          }
                        }}
                        accept="image/*"
                        maxFiles={1}
                        maxSize={8 * 1024 * 1024}
                        placeholder="Arraste ou selecione a imagem de fundo do login"
                        shouldDeleteFromStorage={false}
                        staticName="login-background"
                      />
                    )}
                    {mode === 'show' && settingData?.LOGIN_BACKGROUND_URL && (
                      <div className="mt-2 overflow-hidden rounded border">
                        <img
                          src={settingData.LOGIN_BACKGROUND_URL}
                          alt="Imagem de fundo do login atual"
                          className="h-40 w-full object-cover"
                        />
                      </div>
                    )}
                  </Field>
                );
              }}
            />
          </CardContent>
        </Card>

        {/* Upload de Arquivos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UploadIcon className="w-5 h-5" />
              Configurações de Upload
            </CardTitle>
            <CardDescription>
              Configure opções de upload e armazenamento de arquivos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Tamanho Máximo */}
              <form.Field
                name="FILE_UPLOAD_MAX_SIZE"
                validators={{
                  onChange: ({ value }) => {
                    if (!value) {
                      return 'O tamanho máximo é obrigatório';
                    }
                    const size = Number(value);
                    if (isNaN(size) || size <= 0) {
                      return 'Deve ser um número positivo';
                    }
                    return undefined;
                  },
                  onBlur: ({ value }) => {
                    if (!value) {
                      return 'O tamanho máximo é obrigatório';
                    }
                    const size = Number(value);
                    if (isNaN(size) || size <= 0) {
                      return 'Deve ser um número positivo';
                    }
                    return undefined;
                  },
                }}
                children={(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;

                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>
                        Tamanho máximo do arquivo
                      </FieldLabel>
                      <div className="text-sm text-muted-foreground mb-2">
                        Tamanho em bytes:{' '}
                        {formatFileSize(Number(field.state.value) || 0)}
                      </div>
                      <InputGroup>
                        <InputGroupInput
                          data-test-id="settings-max-file-size-input"
                          disabled={isDisabled}
                          id={field.name}
                          name={field.name}
                          type="number"
                          placeholder="10485760"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          aria-invalid={isInvalid}
                        />
                      </InputGroup>
                      {isInvalid && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </Field>
                  );
                }}
              />

              {/* Máximo de Arquivos */}
              <form.Field
                name="FILE_UPLOAD_MAX_FILES_PER_UPLOAD"
                validators={{
                  onChange: ({ value }) => {
                    if (!value) {
                      return {
                        message: 'O número máximo de arquivos é obrigatório',
                      };
                    }
                    const files = Number(value);
                    if (isNaN(files) || files <= 0) {
                      return 'Deve ser um número positivo';
                    }
                    return undefined;
                  },
                  onBlur: ({ value }) => {
                    if (!value) {
                      return {
                        message: 'O número máximo de arquivos é obrigatório',
                      };
                    }
                    const files = Number(value);
                    if (isNaN(files) || files <= 0) {
                      return 'Deve ser um número positivo';
                    }
                    return undefined;
                  },
                }}
                children={(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;

                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>
                        Máximo de arquivos por upload
                      </FieldLabel>
                      <InputGroup>
                        <InputGroupInput
                          data-test-id="settings-max-files-input"
                          disabled={isDisabled}
                          id={field.name}
                          name={field.name}
                          type="number"
                          placeholder="5"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          aria-invalid={isInvalid}
                        />
                      </InputGroup>
                      {isInvalid && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </Field>
                  );
                }}
              />
            </div>

            {/* Tipos Aceitos */}
            <form.Field
              name="FILE_UPLOAD_ACCEPTED"
              validators={{
                onChange: ({ value }) => {
                  if (!value || value.trim() === '') {
                    return {
                      message: 'Os tipos de arquivo aceitos são obrigatórios',
                    };
                  }
                  return undefined;
                },
                onBlur: ({ value }) => {
                  if (!value || value.trim() === '') {
                    return {
                      message: 'Os tipos de arquivo aceitos são obrigatórios',
                    };
                  }
                  return undefined;
                },
              }}
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;

                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>
                      Tipos de arquivo aceitos
                    </FieldLabel>
                    <div className="text-sm text-muted-foreground mb-2">
                      Liste as extensões separadas por ponto-e-vírgula (ex:
                      pdf;jpg;png)
                    </div>
                    <InputGroup>
                      <InputGroupInput
                        data-test-id="settings-accepted-types-input"
                        disabled={isDisabled}
                        id={field.name}
                        name={field.name}
                        type="text"
                        placeholder="pdf;csv;png;jpeg;jpg;webp"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        aria-invalid={isInvalid}
                      />
                    </InputGroup>
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                );
              }}
            />
          </CardContent>
        </Card>

        {/* Paginação */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileTextIcon className="w-5 h-5" />
              Paginação
            </CardTitle>
            <CardDescription>
              Configure opções de paginação do sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form.Field
              name="PAGINATION_PER_PAGE"
              validators={{
                onChange: ({ value }) => {
                  if (!value) {
                    return {
                      message: 'O número de itens por página é obrigatório',
                    };
                  }
                  const pages = Number(value);
                  if (isNaN(pages) || pages <= 0) {
                    return 'Deve ser um número positivo';
                  }
                  if (pages > 500) {
                    return {
                      message: 'O número máximo de itens por página é 500',
                    };
                  }
                  return undefined;
                },
                onBlur: ({ value }) => {
                  if (!value) {
                    return {
                      message: 'O número de itens por página é obrigatório',
                    };
                  }
                  const pages = Number(value);
                  if (isNaN(pages) || pages <= 0) {
                    return 'Deve ser um número positivo';
                  }
                  if (pages > 500) {
                    return {
                      message: 'O número máximo de itens por página é 500',
                    };
                  }
                  return undefined;
                },
              }}
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;

                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>
                      Itens por página
                    </FieldLabel>
                    <div className="text-sm text-muted-foreground mb-2">
                      Número padrão de itens exibidos por página nas listagens
                    </div>
                    <Select
                      disabled={isDisabled}
                      value={field.state.value}
                      onValueChange={(value) => field.handleChange(value)}
                    >
                      <SelectTrigger
                        data-test-id="settings-pagination-select"
                        className="w-full max-w-xs"
                      >
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="30">30</SelectItem>
                        <SelectItem value="40">40</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                );
              }}
            />
          </CardContent>
        </Card>

        {/* Assistente IA */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BotIcon className="w-5 h-5" />
              Assistente IA
            </CardTitle>
            <CardDescription>
              Configure o assistente de inteligência artificial
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Toggle AI */}
            <form.AppField name="AI_ASSISTANT_ENABLED">
              {(field) => (
                <field.FieldBooleanSwitch
                  label="Habilitar Assistente IA"
                  description="Ativa o chat com inteligência artificial na plataforma"
                  disabled={isDisabled}
                  yesLabel="Ativo"
                  noLabel="Inativo"
                />
              )}
            </form.AppField>

            {/* Toggle Histórico */}
            <form.AppField name="CHAT_HISTORY_ENABLED">
              {(field) => (
                <field.FieldBooleanSwitch
                  label="Salvar histórico do chat"
                  description="Preserva mensagens entre atualizações de página"
                  disabled={isDisabled}
                  yesLabel="Ativo"
                  noLabel="Inativo"
                />
              )}
            </form.AppField>

            {/* Provedor LLM */}
            <form.Field
              name="AI_LLM_PROVIDER"
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;

                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Provedor de IA</FieldLabel>
                    <div className="text-sm text-muted-foreground mb-2">
                      Serviço de linguagem usado pelo assistente no chat
                    </div>
                    <Select
                      disabled={isDisabled}
                      value={field.state.value}
                      onValueChange={(value) => {
                        field.handleChange(value);
                        const models =
                          LLM_MODEL_OPTIONS[value as AiLlmProvider];
                        if (models?.[0]) {
                          form.setFieldValue('LLM_MODEL', models[0].value);
                        }
                      }}
                    >
                      <SelectTrigger
                        data-test-id="settings-llm-provider-select"
                        id={field.name}
                        aria-invalid={isInvalid}
                      >
                        <SelectValue placeholder="Selecione o provedor" />
                      </SelectTrigger>
                      <SelectContent>
                        {AI_LLM_PROVIDER_OPTIONS.map((option) => (
                          <SelectItem
                            key={option.value}
                            value={option.value}
                          >
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                );
              }}
            />

            <form.Subscribe selector={(state) => state.values.AI_LLM_PROVIDER}>
              {(providerRaw) => {
                const provider = (providerRaw ||
                  E_AI_LLM_PROVIDER.OPENAI) as AiLlmProvider;
                const needsKey = providerRequiresApiKey(provider);
                const needsBaseUrl = providerShowsBaseUrl(provider);
                const modelOptions = LLM_MODEL_OPTIONS[provider] ?? [];
                const providerMeta = AI_LLM_PROVIDER_OPTIONS.find(
                  (o) => o.value === provider,
                );

                return (
                  <>
                    {providerMeta && (
                      <p className="text-sm text-muted-foreground -mt-2">
                        {providerMeta.description}
                      </p>
                    )}

                    {needsKey && (
                      <form.Field
                        name="LLM_API_KEY"
                        children={(field) => {
                          const isInvalid =
                            field.state.meta.isTouched &&
                            !field.state.meta.isValid;

                          return (
                            <Field data-invalid={isInvalid}>
                              <FieldLabel htmlFor={field.name}>
                                Chave da API
                              </FieldLabel>
                              <div className="text-sm text-muted-foreground mb-2">
                                Chave do provedor selecionado (
                                {providerMeta?.label})
                              </div>
                              <InputGroup>
                                <InputGroupInput
                                  data-test-id="settings-llm-api-key-input"
                                  disabled={isDisabled}
                                  id={field.name}
                                  name={field.name}
                                  type={
                                    (show.llmApiKey && 'text') || 'password'
                                  }
                                  placeholder="Cole a chave da API..."
                                  value={field.state.value}
                                  onBlur={field.handleBlur}
                                  onChange={(e) =>
                                    field.handleChange(e.target.value)
                                  }
                                  aria-invalid={isInvalid}
                                />
                                <InputGroupAddon align="inline-end">
                                  <InputGroupButton
                                    data-test-id="settings-llm-api-key-toggle-btn"
                                    disabled={isDisabled}
                                    type="button"
                                    aria-label="toggle api key visibility"
                                    onClick={() =>
                                      setShow((state) => ({
                                        ...state,
                                        llmApiKey: !state.llmApiKey,
                                      }))
                                    }
                                  >
                                    {show.llmApiKey && <EyeClosedIcon />}
                                    {!show.llmApiKey && <EyeIcon />}
                                  </InputGroupButton>
                                </InputGroupAddon>
                              </InputGroup>
                              {isInvalid && (
                                <FieldError errors={field.state.meta.errors} />
                              )}
                            </Field>
                          );
                        }}
                      />
                    )}

                    {needsBaseUrl && (
                      <form.Field
                        name="LLM_BASE_URL"
                        children={(field) => {
                          const isInvalid =
                            field.state.meta.isTouched &&
                            !field.state.meta.isValid;

                          return (
                            <Field data-invalid={isInvalid}>
                              <FieldLabel htmlFor={field.name}>
                                URL base do Ollama
                              </FieldLabel>
                              <div className="text-sm text-muted-foreground mb-2">
                                Endpoint OpenAI-compatível do Ollama (ex.:
                                http://127.0.0.1:11434/v1)
                              </div>
                              <Input
                                data-test-id="settings-llm-base-url-input"
                                disabled={isDisabled}
                                id={field.name}
                                name={field.name}
                                type="url"
                                placeholder="http://127.0.0.1:11434/v1"
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(e) =>
                                  field.handleChange(e.target.value)
                                }
                                aria-invalid={isInvalid}
                              />
                              {isInvalid && (
                                <FieldError errors={field.state.meta.errors} />
                              )}
                            </Field>
                          );
                        }}
                      />
                    )}
                  </>
                );
              }}
            </form.Subscribe>

            {/* MCP Server URL */}
            <form.Field
              name="MCP_SERVER_URL"
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;

                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>
                      URL do Servidor MCP
                    </FieldLabel>
                    <div className="text-sm text-muted-foreground mb-2">
                      Endereço do servidor MCP para o assistente IA
                    </div>
                    <Input
                      data-test-id="settings-mcp-server-url-input"
                      disabled={isDisabled}
                      id={field.name}
                      name={field.name}
                      type="url"
                      placeholder="http://localhost:3001/mcp"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                    />
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                );
              }}
            />

            {/* URL da API LowCodeJS para o MCP */}
            <form.Field
              name="MCP_LOWCODE_API_URL"
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;

                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>
                      URL da API (MCP)
                    </FieldLabel>
                    <div className="text-sm text-muted-foreground mb-2">
                      Enviada ao servidor MCP no header{' '}
                      <code>X-Lowcode-Api-Url</code>. Deixe vazio para usar a
                      URL padrão do servidor (<code>APP_SERVER_URL</code>).
                    </div>
                    <Input
                      data-test-id="settings-mcp-lowcode-api-url-input"
                      disabled={isDisabled}
                      id={field.name}
                      name={field.name}
                      type="url"
                      placeholder="https://api.seudominio.com"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                    />
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                );
              }}
            />

            {/* MCP Auth Token */}
            <form.Field
              name="MCP_SERVER_TOKEN"
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;

                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>
                      Token MCP (opcional)
                    </FieldLabel>
                    <div className="text-sm text-muted-foreground mb-2">
                      Enviado como <code>Authorization: Bearer ...</code>
                    </div>
                    <InputGroup>
                      <InputGroupInput
                        data-test-id="settings-mcp-token-input"
                        disabled={isDisabled}
                        id={field.name}
                        name={field.name}
                        type={(show.mcpToken && 'text') || 'password'}
                        placeholder="seu-token-secreto"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        aria-invalid={isInvalid}
                      />
                      <InputGroupAddon align="inline-end">
                        <InputGroupButton
                          disabled={isDisabled}
                          type="button"
                          aria-label="toggle token visibility"
                          onClick={() =>
                            setShow((s) => ({ ...s, mcpToken: !s.mcpToken }))
                          }
                        >
                          {show.mcpToken && <EyeClosedIcon />}
                          {!show.mcpToken && <EyeIcon />}
                        </InputGroupButton>
                      </InputGroupAddon>
                    </InputGroup>
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                );
              }}
            />

            <form.Subscribe selector={(state) => state.values.AI_LLM_PROVIDER}>
              {(providerRaw) => {
                const provider = (providerRaw ||
                  E_AI_LLM_PROVIDER.OPENAI) as AiLlmProvider;
                const modelOptions = LLM_MODEL_OPTIONS[provider] ?? [];
                const useFreeTextModel =
                  provider === E_AI_LLM_PROVIDER.OPENROUTER ||
                  provider === E_AI_LLM_PROVIDER.OLLAMA;

                return (
                  <form.Field
                    name="LLM_MODEL"
                    children={(field) => {
                      const isInvalid =
                        field.state.meta.isTouched && !field.state.meta.isValid;

                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor={field.name}>Modelo</FieldLabel>
                          <div className="text-sm text-muted-foreground mb-2">
                            Identificador do modelo no provedor selecionado
                          </div>
                          {useFreeTextModel && (
                            <Input
                              data-test-id="settings-llm-model-input"
                              disabled={isDisabled}
                              id={field.name}
                              name={field.name}
                              placeholder={
                                (provider === E_AI_LLM_PROVIDER.OLLAMA &&
                                  'llama3.2') ||
                                'openai/gpt-4o-mini'
                              }
                              value={field.state.value}
                              onBlur={field.handleBlur}
                              onChange={(e) =>
                                field.handleChange(e.target.value)
                              }
                              aria-invalid={isInvalid}
                            />
                          )}
                          {!useFreeTextModel && (
                            <Select
                              disabled={isDisabled}
                              value={field.state.value}
                              onValueChange={field.handleChange}
                            >
                              <SelectTrigger
                                data-test-id="settings-llm-model-select"
                                id={field.name}
                                aria-invalid={isInvalid}
                              >
                                <SelectValue placeholder="Selecione um modelo" />
                              </SelectTrigger>
                              <SelectContent>
                                {modelOptions.map((option) => (
                                  <SelectItem
                                    key={option.value}
                                    value={option.value}
                                  >
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          {isInvalid && (
                            <FieldError errors={field.state.meta.errors} />
                          )}
                        </Field>
                      );
                    }}
                  />
                );
              }}
            </form.Subscribe>
          </CardContent>
        </Card>

        {/* Banco de Dados */}
        {settingData && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DatabaseIcon className="w-5 h-5" />
                Banco de Dados
              </CardTitle>
              <CardDescription>
                Configure a conexão com o banco de dados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Field>
                <FieldLabel>Database URL</FieldLabel>
                <div className="text-sm text-muted-foreground mb-2">
                  String de conexão do MongoDB
                </div>
                <InputGroup>
                  <InputGroupInput
                    data-test-id="settings-database-url-input"
                    disabled
                    defaultValue={settingData.DATABASE_URL}
                    value={settingData.DATABASE_URL}
                    type={(show.databaseUrl && 'text') || 'password'}
                    placeholder="mongodb://localhost:27017/lowcodejs"
                  />
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton
                      data-test-id="settings-database-url-toggle-btn"
                      type="button"
                      aria-label="toggle password visibility"
                      title="toggle password visibility"
                      onClick={() =>
                        setShow((state) => ({
                          ...state,
                          databaseUrl: !state.databaseUrl,
                        }))
                      }
                    >
                      {show.databaseUrl && <EyeClosedIcon />}
                      {!show.databaseUrl && <EyeIcon />}
                    </InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
              </Field>
            </CardContent>
          </Card>
        )}

        {/* Modelo de Tabelas para Clones */}
        {settingData && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DatabaseIcon className="w-5 h-5" />
                Modelo de Tabelas
              </CardTitle>
              <CardDescription>
                Defina modelos de tabelas para clonagem
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Field>
                <form.AppField
                  name="MODEL_CLONE_TABLES"
                  validators={{
                    onChange: ({ value }) => {
                      if (!Array.isArray(value) || value.length === 0) {
                        return 'Selecione ao menos uma tabela';
                      }
                    },
                    onBlur: ({ value }) => {
                      if (!Array.isArray(value) || value.length === 0) {
                        return 'Selecione ao menos uma tabela';
                      }
                    },
                  }}
                >
                  {(field) => (
                    <field.FieldTableMultiSelect
                      label="Tabelas"
                      placeholder="Selecione as tabelas..."
                      disabled={isDisabled}
                    />
                  )}
                </form.AppField>
              </Field>
            </CardContent>
          </Card>
        )}

        {/* Servidor de Email */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MailIcon className="w-5 h-5" />
              Servidor de Email
            </CardTitle>
            <CardDescription>
              Configure o servidor de email para notificações
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Host */}
              <form.Field
                name="EMAIL_PROVIDER_HOST"
                children={(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;

                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>SMTP Host</FieldLabel>
                      <InputGroup>
                        <InputGroupInput
                          data-test-id="settings-smtp-host-input"
                          disabled={isDisabled}
                          id={field.name}
                          name={field.name}
                          type="text"
                          placeholder="smtp.gmail.com"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          aria-invalid={isInvalid}
                        />
                      </InputGroup>
                      {isInvalid && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </Field>
                  );
                }}
              />

              {/* Port */}
              <form.Field
                name="EMAIL_PROVIDER_PORT"
                validators={{
                  onChange: ({ value }) => {
                    if (!value) return undefined;
                    const port = Number(value);
                    if (isNaN(port) || port <= 0 || port > 65535) {
                      return {
                        message: 'A porta deve ser um número entre 1 e 65535',
                      };
                    }
                    return undefined;
                  },
                  onBlur: ({ value }) => {
                    if (!value) return undefined;
                    const port = Number(value);
                    if (isNaN(port) || port <= 0 || port > 65535) {
                      return {
                        message: 'A porta deve ser um número entre 1 e 65535',
                      };
                    }
                    return undefined;
                  },
                }}
                children={(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;

                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>SMTP Port</FieldLabel>
                      <InputGroup>
                        <InputGroupInput
                          data-test-id="settings-smtp-port-input"
                          disabled={isDisabled}
                          id={field.name}
                          name={field.name}
                          type="number"
                          placeholder="587"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          aria-invalid={isInvalid}
                        />
                      </InputGroup>
                      {isInvalid && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </Field>
                  );
                }}
              />
            </div>

            {/* User */}
            <form.Field
              name="EMAIL_PROVIDER_USER"
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;

                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Email Username</FieldLabel>
                    <InputGroup>
                      <InputGroupInput
                        data-test-id="settings-email-user-input"
                        disabled={isDisabled}
                        id={field.name}
                        name={field.name}
                        placeholder="user@example.com"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        aria-invalid={isInvalid}
                      />
                    </InputGroup>
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                );
              }}
            />

            {/* From (MAIL FROM) */}
            <form.Field
              name="EMAIL_PROVIDER_FROM"
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;

                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>
                      Remetente (MAIL FROM)
                    </FieldLabel>
                    <div className="text-sm text-muted-foreground mb-2">
                      Usado como remetente dos e-mails. Obrigatório quando o
                      usuário SMTP não é um e-mail válido (ex: AWS SES, SendGrid
                      &quot;apikey&quot;). Se vazio, usa o Email Username.
                    </div>
                    <InputGroup>
                      <InputGroupInput
                        data-test-id="settings-email-from-input"
                        disabled={isDisabled}
                        id={field.name}
                        name={field.name}
                        placeholder="noreply@exemplo.com"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        aria-invalid={isInvalid}
                      />
                    </InputGroup>
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                );
              }}
            />

            {/* Password */}
            <form.Field
              name="EMAIL_PROVIDER_PASSWORD"
              validators={{
                onChange: ({ value }) => {
                  if (!value) return undefined;
                  if (value.length < 6) {
                    return {
                      message: 'A senha deve ter pelo menos 6 caracteres',
                    };
                  }
                  return undefined;
                },
                onBlur: ({ value }) => {
                  if (!value) return undefined;
                  if (value.length < 6) {
                    return {
                      message: 'A senha deve ter pelo menos 6 caracteres',
                    };
                  }
                  return undefined;
                },
              }}
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;

                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Email Password</FieldLabel>
                    <div className="text-sm text-muted-foreground mb-2">
                      Senha ou API key para autenticação de email
                    </div>
                    <InputGroup>
                      <InputGroupInput
                        data-test-id="settings-email-password-input"
                        disabled={isDisabled}
                        id={field.name}
                        name={field.name}
                        type={(show.emailPassword && 'text') || 'password'}
                        placeholder="••••••••"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        aria-invalid={isInvalid}
                      />
                      <InputGroupAddon align="inline-end">
                        <InputGroupButton
                          data-test-id="settings-email-password-toggle-btn"
                          disabled={isDisabled}
                          type="button"
                          aria-label="toggle password visibility"
                          title="toggle password visibility"
                          onClick={() =>
                            setShow((state) => ({
                              ...state,
                              emailPassword: !state.emailPassword,
                            }))
                          }
                        >
                          {show.emailPassword && <EyeClosedIcon />}
                          {!show.emailPassword && <EyeIcon />}
                        </InputGroupButton>
                      </InputGroupAddon>
                    </InputGroup>
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                );
              }}
            />
          </CardContent>
        </Card>
      </section>
    );
  },
});
