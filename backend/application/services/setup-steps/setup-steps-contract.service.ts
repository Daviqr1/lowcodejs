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
}
