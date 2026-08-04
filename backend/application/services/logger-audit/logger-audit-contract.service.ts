import type mongoose from 'mongoose';

/**
 * Campos de auditoria do REGISTRO referenciado por um log
 * (creator/updater/createdAt/updatedAt), lidos da propria ROW.
 */
export type LoggerObjectAudit = {
  creator: mongoose.Types.ObjectId | null;
  updater: mongoose.Types.ObjectId | null;
  objectCreatedAt: Date | null;
  objectUpdatedAt: Date | null;
};

export const EMPTY_OBJECT_AUDIT: LoggerObjectAudit = {
  creator: null,
  updater: null,
  objectCreatedAt: null,
  objectUpdatedAt: null,
};

export type LoggerAuditParams = {
  systemDb: mongoose.mongo.Db;
  dataDb: mongoose.mongo.Db;
  object: string | null;
  objectId: string | null;
  url: string;
};

/**
 * Resolucao da auditoria da ROW referenciada por um log.
 *
 * As conexoes chegam por parametro de metodo, nao por constructor: o mesmo
 * service e usado pelo hook em runtime e pela migration 13, que roda como
 * script standalone e abre as proprias conexoes.
 */
export abstract class LoggerAuditContractService {
  /** Slug da tabela em uma URL no padrao `/tables/:slug/rows/...`. */
  abstract tableSlugFromRowUrl(url: string | null | undefined): string | null;

  /**
   * So resolve objetos do tipo ROW — as unicas entidades com CREATOR e UPDATER.
   * Para TABLE, FIELD, USER, MENU e afins devolve tudo null.
   */
  abstract resolve(params: LoggerAuditParams): Promise<LoggerObjectAudit>;
}
