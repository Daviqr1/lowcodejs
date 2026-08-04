import { Service } from 'fastify-decorators';

import type {
  EmailSettingSource,
  NodemailerTransportConfig,
} from './email-config-contract.service';
import { EmailConfigContractService } from './email-config-contract.service';

@Service()
export default class EmailConfigService implements EmailConfigContractService {
  buildTransportConfig(
    setting: EmailSettingSource,
  ): NodemailerTransportConfig | null {
    const host = setting.EMAIL_PROVIDER_HOST;
    const port = setting.EMAIL_PROVIDER_PORT;
    const user = setting.EMAIL_PROVIDER_USER;
    const pass = setting.EMAIL_PROVIDER_PASSWORD;

    if (!host) return null;
    if (!port) return null;
    if (!user) return null;
    if (!pass) return null;

    return {
      host,
      port,
      secure: port === 465,
      requireTLS: true,
      auth: { user, pass },
    };
  }

  resolveFrom(setting: EmailSettingSource): string | null {
    if (setting.EMAIL_PROVIDER_FROM) return setting.EMAIL_PROVIDER_FROM;
    if (setting.EMAIL_PROVIDER_USER) return setting.EMAIL_PROVIDER_USER;
    return null;
  }
}
