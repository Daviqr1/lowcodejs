import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import type { ISetting } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { SettingContractRepository } from '@application/repositories/setting/setting-contract.repository';

import type { SetupStep } from './setup-steps-contract.service';
import { SetupStepsContractService } from './setup-steps-contract.service';

const NEXT_STEP: Record<SetupStep, SetupStep | null> = {
  admin: 'name',
  name: 'storage',
  storage: 'logos',
  logos: 'upload',
  upload: 'paging',
  paging: 'email',
  email: null,
};

@Service()
export default class SetupStepsService implements SetupStepsContractService {
  constructor(private readonly settingRepository: SettingContractRepository) {}

  next(step: SetupStep): SetupStep | null {
    return NEXT_STEP[step];
  }

  async guard(
    step: SetupStep,
  ): Promise<Either<HTTPException, ISetting | null>> {
    const setting = await this.settingRepository.get();

    if (setting?.SETUP_COMPLETED) {
      return left(
        HTTPException.Conflict(
          'O setup já foi concluído',
          'SETUP_ALREADY_COMPLETED',
        ),
      );
    }

    if (setting && setting.SETUP_CURRENT_STEP !== step) {
      return left(
        HTTPException.PreconditionFailed(
          'Etapa incorreta do setup',
          'SETUP_WRONG_STEP',
          { expected: setting.SETUP_CURRENT_STEP ?? 'admin' },
        ),
      );
    }

    return right(setting);
  }
}
