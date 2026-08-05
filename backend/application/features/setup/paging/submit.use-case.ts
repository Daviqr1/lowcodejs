import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import { BUILTIN_TABLE_TEMPLATE_IDS } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { SettingContractRepository } from '@application/repositories/setting/setting-contract.repository';
import { IdentifierContractService } from '@application/services/identifier/identifier-contract.service';
import type { SetupStep } from '@application/services/setup-steps/setup-steps-contract.service';
import { SETUP_STEPS } from '@application/services/setup-steps/setup-steps-contract.service';
import { SetupStepsContractService } from '@application/services/setup-steps/setup-steps-contract.service';

type Input = {
  PAGINATION_PER_PAGE: number;
  MODEL_CLONE_TABLES?: string[];
};

type SetupStepOutput = {
  completed: boolean;
  currentStep: SetupStep | null;
  hasAdmin: boolean;
  steps: typeof SETUP_STEPS;
};

type Response = Either<HTTPException, SetupStepOutput>;

const CURRENT_STEP: SetupStep = 'paging';

@Service()
export default class SetupPagingSubmitUseCase {
  constructor(
    private readonly settingRepository: SettingContractRepository,
    private readonly identifier: IdentifierContractService,
    private readonly setupSteps: SetupStepsContractService,
  ) {}

  async execute(payload: Input): Promise<Response> {
    try {
      const guard = await this.setupSteps.guard(CURRENT_STEP);
      if (guard.isLeft()) return left(guard.value);

      const next = this.setupSteps.next(CURRENT_STEP);

      let filteredCloneTables: string[] = [];
      if (payload.MODEL_CLONE_TABLES) {
        filteredCloneTables = payload.MODEL_CLONE_TABLES.filter((id) => {
          if (BUILTIN_TABLE_TEMPLATE_IDS.has(id)) return false;
          if (!this.identifier.isValid(id)) return false;
          return true;
        });
      }

      const updated = await this.settingRepository.update({
        PAGINATION_PER_PAGE: payload.PAGINATION_PER_PAGE,
        MODEL_CLONE_TABLES: filteredCloneTables,
        SETUP_CURRENT_STEP: next,
      });

      return right({
        completed: updated.SETUP_COMPLETED,
        currentStep: updated.SETUP_CURRENT_STEP,
        hasAdmin: true,
        steps: SETUP_STEPS,
      });
    } catch (error) {
      console.error('[setup > paging > submit][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro ao salvar etapa do setup',
          'SETUP_PAGING_ERROR',
        ),
      );
    }
  }
}
