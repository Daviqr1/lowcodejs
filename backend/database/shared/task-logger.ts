/**
 * Logger compartilhado por migrations e seeders.
 *
 * Padroniza o vocabulário e o formato da saída do boot (migrations + seeders),
 * em PT-BR humano. Cada etapa imprime o título exatamente uma vez:
 *
 *   - Estado idempotente / sem trabalho / falha são terminais e imprimem o
 *     título sozinhos (`skipped`, `noop`, `failed`).
 *   - Quando a etapa realmente roda, `running()` imprime o título, seguido de
 *     `item()` por entidade e `done(summary)` com o resumo indentado.
 */

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

export class TaskLogger {
  private readonly title: string;

  constructor(title: string) {
    this.title = title;
  }

  /** Etapa começou a rodar de fato. */
  running(): void {
    console.info(`  ${DIM}↻${RESET} ${this.title} — aplicando…`);
  }

  /** Etapa já aplicada antes (idempotente). Imprime o título. */
  skipped(at?: Date): void {
    let when = '';
    if (at) when = ` em ${this.formatDate(at)}`;
    console.info(`  ${GREEN}✓${RESET} ${this.title} — já aplicado${when}`);
  }

  /** Linha de detalhe por entidade (ex.: uma por tabela). */
  item(line: string): void {
    console.info(`      ${DIM}•${RESET} ${line}`);
  }

  /** Etapa concluída com sucesso. Resumo indentado, sem repetir o título. */
  done(summary?: string): void {
    let tail = '';
    if (summary) tail = ` ${summary}`;
    console.info(`      ${GREEN}✓${RESET}${tail}`);
  }

  /** Concluído numa linha só, com o título (usado por seeders). */
  ok(detail?: string): void {
    let tail = '';
    if (detail) tail = ` — ${detail}`;
    console.info(`  ${GREEN}✓${RESET} ${this.title}${tail}`);
  }

  /** Nada a fazer / ignorado. Imprime o título. */
  noop(reason: string): void {
    console.info(`  ${DIM}•${RESET} ${this.title} — ${reason}`);
  }

  /** Etapa falhou. Imprime o título. */
  failed(error: unknown): void {
    let message = String(error);
    if (error instanceof Error) message = error.message;
    console.error(`  ${RED}✗${RESET} ${this.title} — falhou: ${message}`);
  }

  private formatDate(date: Date): string {
    return dateFormatter.format(date);
  }
}
