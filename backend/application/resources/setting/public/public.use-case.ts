import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import HTTPException from '@application/core/exception.core';
import { SettingContractRepository } from '@application/repositories/setting/setting-contract.repository';

export type PublicSetting = {
  SYSTEM_NAME: string;
  SYSTEM_DESCRIPTION: string;
  LOGO_SMALL_URL: string | null;
  LOGO_LARGE_URL: string | null;
  LOGO_SMALL_DARK_URL: string | null;
  LOGO_LARGE_DARK_URL: string | null;
  LOGIN_BACKGROUND_URL: string | null;
  AI_ASSISTANT_ENABLED: boolean;
  CHAT_HISTORY_ENABLED: boolean;
  SETUP_COMPLETED: boolean;
  SETUP_CURRENT_STEP: string | null;
};

type Response = Either<HTTPException, PublicSetting>;

const PUBLIC_DEFAULTS: PublicSetting = {
  SYSTEM_NAME: 'LowCodeJs',
  SYSTEM_DESCRIPTION: 'Plataforma Oficial',
  LOGO_SMALL_URL: null,
  LOGO_LARGE_URL: null,
  LOGO_SMALL_DARK_URL: null,
  LOGO_LARGE_DARK_URL: null,
  LOGIN_BACKGROUND_URL: null,
  AI_ASSISTANT_ENABLED: false,
  CHAT_HISTORY_ENABLED: false,
  SETUP_COMPLETED: false,
  SETUP_CURRENT_STEP: 'admin',
};

@Service()
export default class SettingPublicUseCase {
  constructor(private readonly settingRepository: SettingContractRepository) {}

  async execute(): Promise<Response> {
    try {
      const setting = await this.settingRepository.get();

      if (!setting) return right(PUBLIC_DEFAULTS);

      const projection: PublicSetting = {
        SYSTEM_NAME: setting.SYSTEM_NAME ?? PUBLIC_DEFAULTS.SYSTEM_NAME,
        SYSTEM_DESCRIPTION:
          setting.SYSTEM_DESCRIPTION ?? PUBLIC_DEFAULTS.SYSTEM_DESCRIPTION,
        LOGO_SMALL_URL: setting.LOGO_SMALL_URL ?? null,
        LOGO_LARGE_URL: setting.LOGO_LARGE_URL ?? null,
        LOGO_SMALL_DARK_URL: setting.LOGO_SMALL_DARK_URL ?? null,
        LOGO_LARGE_DARK_URL: setting.LOGO_LARGE_DARK_URL ?? null,
        LOGIN_BACKGROUND_URL: setting.LOGIN_BACKGROUND_URL ?? null,
        AI_ASSISTANT_ENABLED: setting.AI_ASSISTANT_ENABLED ?? false,
        CHAT_HISTORY_ENABLED: setting.CHAT_HISTORY_ENABLED ?? false,
        SETUP_COMPLETED: setting.SETUP_COMPLETED ?? false,
        SETUP_CURRENT_STEP: PUBLIC_DEFAULTS.SETUP_CURRENT_STEP,
      };

      if (setting.SETUP_CURRENT_STEP !== undefined) {
        projection.SETUP_CURRENT_STEP = setting.SETUP_CURRENT_STEP;
      }

      return right(projection);
    } catch (error) {
      console.error('[setting > public][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro ao buscar configurações',
          'SETTINGS_READ_ERROR',
        ),
      );
    }
  }
}
