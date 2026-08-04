import type { ISetting } from '@application/core/entity.core';

export type EmailSettingSource = Pick<
  ISetting,
  | 'EMAIL_PROVIDER_HOST'
  | 'EMAIL_PROVIDER_PORT'
  | 'EMAIL_PROVIDER_USER'
  | 'EMAIL_PROVIDER_PASSWORD'
  | 'EMAIL_PROVIDER_FROM'
>;

export type NodemailerTransportConfig = {
  host: string;
  port: number;
  secure: boolean;
  requireTLS: boolean;
  auth: { user: string; pass: string };
};

/**
 * Configuracao de SMTP derivada do documento Setting. Nao ha env var de e-mail:
 * o MASTER edita pela UI `/settings` e o service le a cada envio.
 */
export abstract class EmailConfigContractService {
  /**
   * Config do transporter, ou `null` quando falta credencial essencial
   * (HOST / PORT / USER / PASSWORD).
   */
  abstract buildTransportConfig(
    setting: EmailSettingSource,
  ): NodemailerTransportConfig | null;

  /** Endereco do remetente, com fallback. */
  abstract resolveFrom(setting: EmailSettingSource): string | null;
}
