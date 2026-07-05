import {
  BotIcon,
  DatabaseIcon,
  FileTextIcon,
  HardDriveIcon,
  ImageIcon,
  Languages,
  MailIcon,
  TypeIcon,
  UploadIcon,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { getLlmProviderLabel } from '@/lib/ai-llm-providers';
import type { ISetting } from '@/lib/interfaces';

type SettingViewProps = {
  data: ISetting;
};

function formatFileSize(bytes: number): string {
  if (bytes >= 1048576) {
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${bytes} bytes`;
}

function getLocaleLabel(locale: string): string {
  switch (locale) {
    case 'pt-br':
      return 'Português (Brasil)';
    case 'en-us':
      return 'English (United States)';
    default:
      return locale;
  }
}

export function SettingView({ data }: SettingViewProps): React.JSX.Element {
  return (
    <section
      className="space-y-4 p-2"
      data-test-id="settings-view"
    >
      {/* Nome do Sistema */}
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TypeIcon className="w-5 h-5" />
            Nome do Sistema
          </CardTitle>
          <CardDescription>
            Nome exibido no título da plataforma
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">Nome do sistema</p>
              <p className="text-sm text-muted-foreground">
                {data.SYSTEM_NAME || 'LowCodeJs'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Descrição do sistema</p>
              <p className="text-sm text-muted-foreground">
                {data.SYSTEM_DESCRIPTION || 'Plataforma Oficial'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Idioma do Sistema */}
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Languages className="w-5 h-5" />
            Idioma do Sistema
          </CardTitle>
          <CardDescription>
            Configuração do idioma padrão da aplicação
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <p className="text-sm font-medium">Idioma padrão</p>
            <p className="text-sm text-muted-foreground">
              {getLocaleLabel(data.LOCALE)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Armazenamento */}
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDriveIcon className="w-5 h-5" />
            Armazenamento
          </CardTitle>
          <CardDescription>
            Configuração do driver de armazenamento de arquivos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <p className="text-sm font-medium">Driver</p>
            {data.STORAGE_DRIVER === 's3' && (
              <Badge variant="default">S3</Badge>
            )}
            {data.STORAGE_DRIVER !== 's3' && (
              <Badge variant="secondary">Local</Badge>
            )}
          </div>
          {data.STORAGE_DRIVER === 's3' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Endpoint</p>
                  <p className="text-sm text-muted-foreground">
                    {data.STORAGE_ENDPOINT || '-'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Região</p>
                  <p className="text-sm text-muted-foreground">
                    {data.STORAGE_REGION || 'us-east-1'}
                  </p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Bucket</p>
                <p className="text-sm text-muted-foreground">
                  {data.STORAGE_BUCKET || '-'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Credenciais</p>
                <p className="text-sm text-muted-foreground font-mono">
                  {data.STORAGE_ACCESS_KEY && '••••••••'}
                  {!data.STORAGE_ACCESS_KEY && '-'}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Logos */}
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            Logos do Sistema
          </CardTitle>
          <CardDescription>Logos exibidos no sistema</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">Logo Pequeno</p>
              {data.LOGO_SMALL_URL && (
                <img
                  src={data.LOGO_SMALL_URL}
                  alt="Logo pequeno"
                  className="h-12 w-auto border rounded"
                />
              )}
              {!data.LOGO_SMALL_URL && (
                <p className="text-sm text-muted-foreground">-</p>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Logo Grande</p>
              {data.LOGO_LARGE_URL && (
                <img
                  src={data.LOGO_LARGE_URL}
                  alt="Logo grande"
                  className="h-16 w-auto border rounded"
                />
              )}
              {!data.LOGO_LARGE_URL && (
                <p className="text-sm text-muted-foreground">-</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload de Arquivos */}
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UploadIcon className="w-5 h-5" />
            Configurações de Upload
          </CardTitle>
          <CardDescription>
            Opções de upload e armazenamento de arquivos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">Tamanho máximo do arquivo</p>
              <p className="text-sm text-muted-foreground">
                {formatFileSize(data.FILE_UPLOAD_MAX_SIZE)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">
                Máximo de arquivos por upload
              </p>
              <p className="text-sm text-muted-foreground">
                {data.FILE_UPLOAD_MAX_FILES_PER_UPLOAD}
              </p>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">Tipos de arquivo aceitos</p>
            <p className="text-sm text-muted-foreground">
              {data.FILE_UPLOAD_ACCEPTED.join('; ')}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Paginação */}
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileTextIcon className="w-5 h-5" />
            Paginação
          </CardTitle>
          <CardDescription>Opções de paginação do sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <p className="text-sm font-medium">Itens por página</p>
            <p className="text-sm text-muted-foreground">
              {data.PAGINATION_PER_PAGE}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Modelo de Tabelas */}
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DatabaseIcon className="w-5 h-5" />
            Modelo de Tabelas
          </CardTitle>
          <CardDescription>
            Tabelas permitidas para clonagem de modelos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <p className="text-sm font-medium">Tabelas selecionadas</p>
            {data.MODEL_CLONE_TABLES.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-1">
                {data.MODEL_CLONE_TABLES.map((table) => (
                  <Badge
                    key={table._id}
                    variant="secondary"
                  >
                    {table.name}
                  </Badge>
                ))}
              </div>
            )}
            {data.MODEL_CLONE_TABLES.length === 0 && (
              <p className="text-sm text-muted-foreground">-</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Assistente IA */}
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BotIcon className="w-5 h-5" />
            Assistente IA
          </CardTitle>
          <CardDescription>
            Configurações do assistente de inteligência artificial
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <p className="text-sm font-medium">Status</p>
            {data.AI_ASSISTANT_ENABLED && (
              <Badge variant="default">Habilitado</Badge>
            )}
            {!data.AI_ASSISTANT_ENABLED && (
              <Badge variant="destructive">Desabilitado</Badge>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">Histórico do Chat</p>
            {data.CHAT_HISTORY_ENABLED && (
              <Badge variant="default">Habilitado</Badge>
            )}
            {!data.CHAT_HISTORY_ENABLED && (
              <Badge variant="secondary">Desabilitado</Badge>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">Provedor de IA</p>
            <p className="text-sm text-muted-foreground">
              {getLlmProviderLabel(data.AI_LLM_PROVIDER || 'openai')}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">Chave da API</p>
            <p className="text-sm text-muted-foreground font-mono">
              {(data.LLM_API_KEY || data.OPENAI_API_KEY) && '••••••••'}
              {!(data.LLM_API_KEY || data.OPENAI_API_KEY) && '-'}
            </p>
          </div>
          {data.AI_LLM_PROVIDER === 'ollama' && (
            <div className="space-y-1">
              <p className="text-sm font-medium">URL base (Ollama)</p>
              <p className="text-sm text-muted-foreground font-mono">
                {data.LLM_BASE_URL || '-'}
              </p>
            </div>
          )}
          <div className="space-y-1">
            <p className="text-sm font-medium">URL do Servidor MCP</p>
            <p className="text-sm text-muted-foreground font-mono">
              {data.MCP_SERVER_URL || '-'}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">URL da API (header MCP)</p>
            <p className="text-sm text-muted-foreground font-mono">
              {data.MCP_LOWCODE_API_URL ||
                'Padrão do servidor (APP_SERVER_URL)'}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">Token MCP</p>
            <p className="text-sm text-muted-foreground font-mono">
              {data.MCP_SERVER_TOKEN && '••••••••'}
              {!data.MCP_SERVER_TOKEN && '-'}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">Modelo</p>
            <p className="text-sm text-muted-foreground font-mono">
              {data.LLM_MODEL || data.OPENAI_MODEL || 'gpt-4.1-nano'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Banco de Dados */}
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DatabaseIcon className="w-5 h-5" />
            Banco de Dados
          </CardTitle>
          <CardDescription>Conexão com o banco de dados</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <p className="text-sm font-medium">Database URL</p>
            <p className="text-sm text-muted-foreground font-mono">
              {data.DATABASE_URL && '••••••••••••••••'}
              {!data.DATABASE_URL && '-'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Servidor de Email */}
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MailIcon className="w-5 h-5" />
            Servidor de Email
          </CardTitle>
          <CardDescription>
            Servidor SMTP usado para envio de e-mails. Opcional — se não
            configurado, as notificações por e-mail ficam desativadas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">SMTP Host</p>
              <p className="text-sm text-muted-foreground">
                {data.EMAIL_PROVIDER_HOST || 'Não configurado'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">SMTP Port</p>
              <p className="text-sm text-muted-foreground">
                {data.EMAIL_PROVIDER_PORT ?? 'Não configurado'}
              </p>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">Email Username</p>
            <p className="text-sm text-muted-foreground">
              {data.EMAIL_PROVIDER_USER || 'Não configurado'}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">Email Password</p>
            <p className="text-sm text-muted-foreground">
              {data.EMAIL_PROVIDER_PASSWORD && '••••••••'}
              {!data.EMAIL_PROVIDER_PASSWORD && 'Não configurado'}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">Remetente (MAIL FROM)</p>
            <p className="text-sm text-muted-foreground">
              {data.EMAIL_PROVIDER_FROM || 'Não configurado'}
            </p>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
