import type { Either } from '@application/core/either.core';
import type { ISetting } from '@application/core/entity.core';
import type HTTPException from '@application/core/exception.core';

export const SETUP_STEPS = [
  'admin',
  'name',
  'storage',
  'logos',
  'upload',
  'paging',
  'email',
] as const;

export type SetupStep = (typeof SETUP_STEPS)[number];

/** Ordem dos passos do Setup Wizard da primeira execucao. */
export abstract class SetupStepsContractService {
  /** Proximo passo, ou `null` quando `step` e o ultimo. */
  abstract next(step: SetupStep): SetupStep | null;

  /**
   * Guarda comum dos seis `submit`: recusa se o setup ja foi concluido
   * (`SETUP_ALREADY_COMPLETED`) ou se o wizard esta em outra etapa
   * (`SETUP_WRONG_STEP`). Devolve o Setting lido para o chamador nao buscar de
   * novo — `null` quando ainda nao existe documento.
   */
  abstract guard(
    step: SetupStep,
  ): Promise<Either<HTTPException, ISetting | null>>;
}
