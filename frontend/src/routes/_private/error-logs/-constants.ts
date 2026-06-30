export const ROUTE_ID = '/_private/error-logs/';

export interface StatusOption {
  id: string;
  label: string;
}

// Status HTTP de erro mais comuns oferecidos no filtro. 401 é excluído de
// propósito (o hook não registra "não autenticado" para evitar poluição).
export const STATUS_OPTIONS: Array<StatusOption> = [
  { id: '400', label: '400 · Requisição inválida' },
  { id: '403', label: '403 · Proibido' },
  { id: '404', label: '404 · Não encontrado' },
  { id: '405', label: '405 · Método não permitido' },
  { id: '409', label: '409 · Conflito' },
  { id: '422', label: '422 · Não processável' },
  { id: '429', label: '429 · Muitas requisições' },
  { id: '500', label: '500 · Erro interno' },
  { id: '502', label: '502 · Bad Gateway' },
  { id: '503', label: '503 · Serviço indisponível' },
];

// 5xx = erro do servidor (vermelho); 4xx = erro do cliente (âmbar).
export function statusClassName(status: number): string {
  if (status >= 500) return 'bg-red-100 text-red-700';
  return 'bg-amber-100 text-amber-700';
}
