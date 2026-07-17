// Normaliza um termo de busca para um regex case/acento-insensível: escapa os
// metacaracteres e troca cada vogal/consoante acentuável por uma classe que casa
// todas as variantes. Helper puro (sem estado/DI) — usado pelo query-builder e
// pelos repositórios que filtram por nome, sem acoplar ao query-builder inteiro.
export class SearchNormalizer {
  static normalize(search: string): string {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return escaped
      .replace(/a/gi, '[aáàâãä]')
      .replace(/e/gi, '[eéèêë]')
      .replace(/i/gi, '[iíìîï]')
      .replace(/o/gi, '[oóòôõö]')
      .replace(/u/gi, '[uúùûü]')
      .replace(/c/gi, '[cç]')
      .replace(/n/gi, '[nñ]');
  }
}
