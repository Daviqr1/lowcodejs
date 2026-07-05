import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import { E_ROLE } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { SettingContractRepository } from '@application/repositories/setting/setting-contract.repository';
import { UserContractRepository } from '@application/repositories/user/user-contract.repository';

import { SETUP_STEPS } from '../setup.steps';

type SetupStatusResponse = {
  completed: boolean;
  currentStep: string | null;
  hasAdmin: boolean;
  steps: typeof SETUP_STEPS;
};

type Response = Either<HTTPException, SetupStatusResponse>;

@Service()
export default class SetupStatusUseCase {
  constructor(
    private readonly settingRepository: SettingContractRepository,
    private readonly userRepository: UserContractRepository,
  ) {}

  async execute(): Promise<Response> {
    try {
      const setting = await this.settingRepository.get();

      const users = await this.userRepository.findMany({});
      const hasAdmin = users.some((user) => user.group?.slug === E_ROLE.MASTER);

      if (!setting) {
        return right({
          completed: false,
          currentStep: 'admin',
          hasAdmin,
          steps: SETUP_STEPS,
        });
      }

      return right({
        completed: setting.SETUP_COMPLETED,
        currentStep: setting.SETUP_CURRENT_STEP,
        hasAdmin,
        steps: SETUP_STEPS,
      });
    } catch (error) {
      console.error('[setup > status][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro ao verificar status do setup',
          'SETUP_STATUS_ERROR',
        ),
      );
    }
  }
}
