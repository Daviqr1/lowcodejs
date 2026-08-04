import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import HTTPException from '@application/core/exception.core';
import { SettingContractRepository } from '@application/repositories/setting/setting-contract.repository';
import type { SetupStep } from '@application/services/setup-steps/setup-steps-contract.service';
import { SETUP_STEPS } from '@application/services/setup-steps/setup-steps-contract.service';
import { SetupStepsContractService } from '@application/services/setup-steps/setup-steps-contract.service';

type Input = {
  FILE_UPLOAD_MAX_SIZE: number;
  FILE_UPLOAD_ACCEPTED: string;
  FILE_UPLOAD_MAX_FILES_PER_UPLOAD: number;
};

type SetupStepOutput = {
  completed: boolean;
  currentStep: SetupStep | null;
  hasAdmin: boolean;
  steps: typeof SETUP_STEPS;
};

type Response = Either<HTTPException, SetupStepOutput>;

const CURRENT_STEP: SetupStep = 'upload';

@Service()
export default class SetupUploadSubmitUseCase {
  constructor(
    private readonly settingRepository: SettingContractRepository,
    private readonly setupSteps: SetupStepsContractService,
  ) {}

  async execute(payload: Input): Promise<Response> {
    try {
      const setting = await this.settingRepository.get();

      if (setting?.SETUP_COMPLETED) {
        return left(
          HTTPException.Conflict(
            'O setup já foi concluído',
            'SETUP_ALREADY_COMPLETED',
          ),
        );
      }

      if (setting && setting.SETUP_CURRENT_STEP !== CURRENT_STEP) {
        return left(
          HTTPException.PreconditionFailed(
            'Etapa incorreta do setup',
            'SETUP_WRONG_STEP',
            { expected: setting.SETUP_CURRENT_STEP ?? 'admin' },
          ),
        );
      }

      const next = this.setupSteps.next(CURRENT_STEP);

      const updated = await this.settingRepository.update({
        FILE_UPLOAD_MAX_SIZE: payload.FILE_UPLOAD_MAX_SIZE,
        FILE_UPLOAD_ACCEPTED: payload.FILE_UPLOAD_ACCEPTED,
        FILE_UPLOAD_MAX_FILES_PER_UPLOAD:
          payload.FILE_UPLOAD_MAX_FILES_PER_UPLOAD,
        SETUP_CURRENT_STEP: next,
      });

      return right({
        completed: updated.SETUP_COMPLETED,
        currentStep: updated.SETUP_CURRENT_STEP,
        hasAdmin: true,
        steps: SETUP_STEPS,
      });
    } catch (error) {
      console.error('[setup > upload > submit][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro ao salvar etapa do setup',
          'SETUP_UPLOAD_ERROR',
        ),
      );
    }
  }
}
