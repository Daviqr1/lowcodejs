export type MonthBucket = {
  key: string;
  label: string;
};

/**
 * Data e hora. Fonte unica — antes a mesma logica aparecia reimplementada em
 * 5 contextos: nome de arquivo CSV, 4 copias identicas de `toISOString()` nos
 * use-cases de export, recorte de dia em UTC no cascade-dropdown, formatacao
 * pt-BR no TaskLogger e os buckets mensais do dashboard.
 */
export abstract class DateContractService {
  /** Agora. */
  abstract now(): Date;

  /** Hoje a meia-noite, no fuso local. */
  abstract today(): Date;

  /** `YYYY-MM-DD` em UTC. */
  abstract isoDate(date: Date): string;

  /** ISO 8601 completo; string vazia quando o valor e nulo ou invalido. */
  abstract toIso(value: Date | string | null | undefined): string;

  /** Inicio do dia (00:00:00.000) em UTC. */
  abstract startOfDay(value: Date | string): Date;

  /** Fim do dia (23:59:59.999) em UTC. */
  abstract endOfDay(value: Date | string): Date;

  /** Formata por mascara (`dd`, `MM`, `yyyy`, `HH`, `mm`, `ss`), fuso local. */
  abstract format(date: Date, mask?: string): string;

  /** Data e hora curtas em pt-BR. */
  abstract formatPtBR(date: Date): string;

  /** Chave `YYYY-MM` do mes de uma data. */
  abstract monthKey(value: Date | string): string;

  /** Os ultimos `count` meses (mais antigo primeiro), com rotulo pt-BR. */
  abstract lastMonths(count: number): MonthBucket[];
}
