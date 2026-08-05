import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import HTTPException from '@application/core/exception.core';
import { SettingContractRepository } from '@application/repositories/setting/setting-contract.repository';
import { SETUP_STEPS } from '@application/services/setup-steps/setup-steps-contract.service';
import { SetupStepsContractService } from '@application/services/setup-steps/setup-steps-contract.service';
import type { SetupStep } from '@application/services/setup-steps/setup-steps-contract.service';

type Input = {
  EMAIL_PROVIDER_HOST?: string | null;
  EMAIL_PROVIDER_PORT?: number | null;
  EMAIL_PROVIDER_USER?: string | null;
  EMAIL_PROVIDER_PASSWORD?: string | null;
  EMAIL_PROVIDER_FROM?: string | null;
};

type SetupStepOutput = {
  completed: boolean;
  currentStep: SetupStep | null;
  hasAdmin: boolean;
  steps: typeof SETUP_STEPS;
};

type Response = Either<HTTPException, SetupStepOutput>;

const CURRENT_STEP: SetupStep = 'email';

@Service()
export default class SetupEmailSubmitUseCase {
  constructor(
    private readonly settingRepository: SettingContractRepository,
    private readonly setupSteps: SetupStepsContractService,
  ) {}

  async execute(payload: Input): Promise<Response> {
    try {
      const guard = await this.setupSteps.guard(CURRENT_STEP);
      if (guard.isLeft()) return left(guard.value);

      const updated = await this.settingRepository.update({
        EMAIL_PROVIDER_HOST: payload.EMAIL_PROVIDER_HOST,
        EMAIL_PROVIDER_PORT: payload.EMAIL_PROVIDER_PORT,
        EMAIL_PROVIDER_USER: payload.EMAIL_PROVIDER_USER,
        EMAIL_PROVIDER_PASSWORD: payload.EMAIL_PROVIDER_PASSWORD,
        EMAIL_PROVIDER_FROM: payload.EMAIL_PROVIDER_FROM,
        SETUP_COMPLETED: true,
        SETUP_CURRENT_STEP: null,
      });

      if (!updated.SETUP_COMPLETED) {
        return left(
          HTTPException.InternalServerError(
            'Falha ao finalizar setup',
            'SETUP_COMPLETE_FAILED',
          ),
        );
      }

      return right({
        completed: updated.SETUP_COMPLETED,
        currentStep: updated.SETUP_CURRENT_STEP,
        hasAdmin: true,
        steps: SETUP_STEPS,
      });
    } catch (error) {
      console.error('[setup > email > submit][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro ao salvar etapa do setup',
          'SETUP_EMAIL_ERROR',
        ),
      );
    }
  }
}
