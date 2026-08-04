import { Service } from 'fastify-decorators';

import { SearchContractService } from './search-contract.service';

const REGEX_METACHARACTERS = /[.*+?^${}()|[\]\\]/g;

// Cada letra acentuavel vira a classe que casa todas as suas variantes.
const ACCENT_CLASSES: Array<[RegExp, string]> = [
  [/a/gi, '[aáàâãä]'],
  [/e/gi, '[eéèêë]'],
  [/i/gi, '[iíìîï]'],
  [/o/gi, '[oóòôõö]'],
  [/u/gi, '[uúùûü]'],
  [/c/gi, '[cç]'],
  [/n/gi, '[nñ]'],
];

@Service()
export default class SearchService implements SearchContractService {
  escape(value: string): string {
    return value.replace(REGEX_METACHARACTERS, '\\$&');
  }

  normalize(search: string): string {
    let result = this.escape(search);

    for (const [pattern, replacement] of ACCENT_CLASSES) {
      result = result.replace(pattern, replacement);
    }

    return result;
  }
}
