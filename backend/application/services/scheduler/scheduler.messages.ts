/**
 * Mensagens de erro do registry (PT-BR). Porta de `base-cron/schedule.messages.ts`
 * — mantidas como funções, igual à fonte.
 */
export function NO_SCHEDULER_FOUND(
  schedulerName: string,
  name?: string,
): string {
  if (name) {
    return `Nenhum ${schedulerName} encontrado com o nome informado (${name}). Verifique se você o criou com um decorator ou pela API de criação.`;
  }
  return `Nenhum ${schedulerName} encontrado. Verifique sua configuração.`;
}

export function DUPLICATE_SCHEDULER(
  schedulerName: string,
  name: string,
): string {
  return `Já existe um ${schedulerName} com o nome informado (${name}). Ignorado.`;
}
