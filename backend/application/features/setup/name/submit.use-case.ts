import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import HTTPException from '@application/core/exception.core';
import { SettingContractRepository } from '@application/repositories/setting/setting-contract.repository';
import type { SetupStep } from '@application/services/setup-steps/setup-steps-contract.service';
import { SETUP_STEPS } from '@application/services/setup-steps/setup-steps-contract.service';
import { SetupStepsContractService } from '@application/services/setup-steps/setup-steps-contract.service';

type Input = {
  SYSTEM_NAME: string;
  LOCALE: 'pt-br' | 'en-us';
};

type SetupStepOutput = {
  completed: boolean;
  currentStep: SetupStep | null;
  hasAdmin: boolean;
  steps: typeof SETUP_STEPS;
};

type Response = Either<HTTPException, SetupStepOutput>;

const CURRENT_STEP: SetupStep = 'name';

@Service()
export default class SetupNameSubmitUseCase {
  constructor(
    private readonly settingRepository: SettingContractRepository,
    private readonly setupSteps: SetupStepsContractService,
  ) {}

  async execute(payload: Input): Promise<Response> {
    try {
      const guard = await this.setupSteps.guard(CURRENT_STEP);
      if (guard.isLeft()) return left(guard.value);

      const next = this.setupSteps.next(CURRENT_STEP);

      const updated = await this.settingRepository.update({
        SYSTEM_NAME: payload.SYSTEM_NAME,
        LOCALE: payload.LOCALE,
        SETUP_CURRENT_STEP: next,
      });

      return right({
        completed: updated.SETUP_COMPLETED,
        currentStep: updated.SETUP_CURRENT_STEP,
        hasAdmin: true,
        steps: SETUP_STEPS,
      });
    } catch (error) {
      console.error('[setup > name > submit][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro ao salvar etapa do setup',
          'SETUP_NAME_ERROR',
        ),
      );
    }
  }
}
