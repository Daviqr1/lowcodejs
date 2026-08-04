import { Service } from 'fastify-decorators';
import slugify from 'slugify';

import {
  SLUG_MAX_LENGTH,
  SLUG_MIN_LENGTH,
  SLUG_REGEX,
} from '@application/core/field-rules.core';

import type {
  SlugResolveInput,
  SlugResolveResult,
} from './slug-contract.service';
import { SlugContractService } from './slug-contract.service';

const MAX_UNIQUE_ATTEMPTS = 1000;

@Service()
export default class SlugService implements SlugContractService {
  normalize(value: string): string {
    return slugify(value, {
      lower: true,
      strict: true,
      trim: true,
    })
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, SLUG_MAX_LENGTH)
      .replace(/^-|-$/g, '');
  }

  getError(slug: string): string | null {
    if (slug.length < SLUG_MIN_LENGTH) {
      return `O slug deve ter no mínimo ${SLUG_MIN_LENGTH} caracteres`;
    }

    if (slug.length > SLUG_MAX_LENGTH) {
      return `O slug deve ter no máximo ${SLUG_MAX_LENGTH} caracteres`;
    }

    if (!SLUG_REGEX.test(slug)) {
      return 'Use apenas letras minúsculas, números e hífens, sem acentos ou caracteres especiais';
    }

    return null;
  }

  resolve(payload: SlugResolveInput): SlugResolveResult {
    const raw = payload.slug?.trim() || payload.name;
    const slug = this.normalize(raw);

    return { slug, error: this.getError(slug) };
  }

  unique(
    name: string,
    existingSlugs: string[],
    fallback: string = 'campo',
  ): string {
    const base = this.normalize(name) || fallback;
    const used = new Set(existingSlugs);

    if (!used.has(base)) return base;

    for (let index = 2; index < MAX_UNIQUE_ATTEMPTS; index++) {
      const suffix = `-${index}`;
      const head = base
        .slice(0, SLUG_MAX_LENGTH - suffix.length)
        .replace(/-$/g, '');
      const candidate = `${head}${suffix}`;

      if (!used.has(candidate)) return candidate;
    }

    const head = base.slice(0, SLUG_MAX_LENGTH - 5).replace(/-$/g, '');
    return `${head}-${Date.now().toString().slice(-4)}`;
  }

  toKey(slug: string): string {
    return slug.replace(/-/g, '_');
  }

  toAscii(value: string): string {
    return value
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^ -~]/g, '_')
      .replace(/"/g, '');
  }
}
