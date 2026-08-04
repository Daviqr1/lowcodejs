export type SlugResolveInput = {
  name: string;
  slug?: string | null;
};

export type SlugResolveResult = {
  slug: string;
  error: string | null;
};

/**
 * Geracao e validacao de slug/chave textual. Fonte unica — antes o backend
 * tinha `FieldSlug` (core) mais 7 combinacoes diferentes de options do
 * `slugify()` inline espalhadas por 17 arquivos, 6 delas sem `strict: true`
 * (deixando passar `. : $ * _ ~ ( ) ' " ! @` — o defeito que a migration 29
 * repara).
 */
export abstract class SlugContractService {
  /** Slug canonico: minusculo, `strict`, hifens colapsados, clamp em 80. */
  abstract normalize(value: string): string;

  /** Mensagem de erro em PT-BR, ou `null` quando o slug e valido. */
  abstract getError(slug: string): string | null;

  /** Deriva o slug de `{ name, slug? }` e ja valida. */
  abstract resolve(payload: SlugResolveInput): SlugResolveResult;

  /** Desambigua contra uma lista existente com sufixo `-N`. */
  abstract unique(
    name: string,
    existingSlugs: string[],
    fallback?: string,
  ): string;

  /** Chave de acesso a documento: hifen vira underscore. */
  abstract toKey(slug: string): string;

  /** Fallback ASCII para header/nome de arquivo (NFKD + remove diacriticos). */
  abstract toAscii(value: string): string;
}
