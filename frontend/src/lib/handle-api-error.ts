import { AxiosError } from 'axios';
import { toast } from 'sonner';

import type { IHTTPExeptionError } from '@/lib/interfaces';

type HandleApiErrorOptions = {
  context: string;
  onFieldErrors?: (errors: Record<string, string>) => void;
  causeHandlers?: Record<
    string,
    (errorData: IHTTPExeptionError<Record<string, string>>) => void
  >;
};

export function handleApiError(
  error: unknown,
  options: HandleApiErrorOptions,
): void {
  if (!(error instanceof AxiosError) || !error.response?.data) {
    toast.error(options.context, { description: 'Erro inesperado' });
    return;
  }

  // error.response.data é `any` do Axios; assumimos o contrato de erro do backend.
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const errorData = error.response.data as IHTTPExeptionError<
    Record<string, string>
  >;
  const cause = errorData.cause;

  if (errorData.errors && options.onFieldErrors) {
    options.onFieldErrors(errorData.errors);
    return;
  }

  if (options.causeHandlers?.[cause]) {
    options.causeHandlers[cause](errorData);
    return;
  }

  const titleMap: Record<string, string> = {
    TABLE_PRIVATE: 'Tabela privada',
    ACCESS_DENIED: 'Acesso negado',
    OWNER_OR_ADMIN_REQUIRED: 'Acesso negado',
    RESTRICTED_CREATE: 'Criacao restrita',
  };

  const title = titleMap[cause] ?? options.context;
  toast.error(title, { description: errorData.message ?? options.context });
}
