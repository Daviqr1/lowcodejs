import type { FieldVisibilityInput } from './field-visibility-contract.service';
import { FieldVisibilityContractService } from './field-visibility-contract.service';

// Implementacao de teste: por padrao nao oculta nada (preserva o comportamento
// anterior dos specs). `setHidden` permite forcar campos ocultos.
export default class InMemoryFieldVisibilityService implements FieldVisibilityContractService {
  private _hidden = new Set<string>();

  setHidden(slugs: string[]): void {
    this._hidden = new Set(slugs);
  }

  async hiddenSlugs(_input: FieldVisibilityInput): Promise<Set<string>> {
    return new Set(this._hidden);
  }

  project<T extends Record<string, unknown>>(
    target: T,
    hidden: Set<string>,
  ): T {
    for (const slug of hidden) {
      if (slug in target) delete target[slug];
    }

    return target;
  }
}
