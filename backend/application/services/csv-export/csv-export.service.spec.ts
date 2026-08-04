import { describe, expect, it } from 'vitest';

import DateService from '@application/services/date/date.service';
import SlugService from '@application/services/slug/slug.service';

import { ExportLimitExceededError } from './csv-export-contract.service';
import CsvExportService from './csv-export.service';

function makeSut(): CsvExportService {
  return new CsvExportService(new SlugService(), new DateService());
}

async function collect<T>(source: AsyncGenerator<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const item of source) out.push(item);
  return out;
}

describe('CsvExportService', () => {
  describe('filename', () => {
    it('monta prefixo normalizado com a data em ISO', () => {
      expect(
        makeSut().filename(
          'Grupos de Usuários',
          new Date('2026-03-07T12:00:00Z'),
        ),
      ).toBe('grupos-de-usuarios-2026-03-07.csv');
    });

    it('cai para `export` quando o prefixo normaliza para vazio', () => {
      expect(makeSut().filename('!!!', new Date('2026-03-07T12:00:00Z'))).toBe(
        'export-2026-03-07.csv',
      );
    });
  });

  describe('iterateInBatches', () => {
    it('pagina ate o batch vir incompleto', async () => {
      const pages: number[] = [];
      const items = await collect(
        makeSut().iterateInBatches<null, number>({
          payload: null,
          batchSize: 2,
          fetchBatch: async (_payload, page) => {
            pages.push(page);
            if (page === 1) return [1, 2];
            if (page === 2) return [3];
            return [];
          },
        }),
      );

      expect(items).toEqual([1, 2, 3]);
      expect(pages).toEqual([1, 2]);
    });

    it('para na primeira pagina vazia', async () => {
      const items = await collect(
        makeSut().iterateInBatches<null, number>({
          payload: null,
          fetchBatch: async () => [],
        }),
      );
      expect(items).toEqual([]);
    });

    it('estoura ExportLimitExceededError ao passar do teto', async () => {
      const source = makeSut().iterateInBatches<null, number>({
        payload: null,
        batchSize: 2,
        limit: 3,
        fetchBatch: async (_payload, page) => {
          if (page > 3) return [];
          return [page * 2 - 1, page * 2];
        },
      });

      await expect(collect(source)).rejects.toBeInstanceOf(
        ExportLimitExceededError,
      );
    });
  });

  describe('buildStream', () => {
    it('emite BOM, cabecalho e linhas', async () => {
      const stream = makeSut().buildStream({
        source: (async function* (): AsyncGenerator<{
          nome: string;
          email: string;
        }> {
          yield { nome: 'Ana', email: 'ana@x.com' };
          yield { nome: 'Bruno', email: 'bruno@x.com' };
        })(),
        fields: [
          { label: 'Nome', value: 'nome' },
          { label: 'Email', value: 'email' },
        ],
      });

      let csv = '';
      for await (const chunk of stream) csv += String(chunk);

      expect(csv.startsWith('﻿')).toBe(true);
      expect(csv).toContain('"Nome","Email"');
      expect(csv).toContain('"Ana","ana@x.com"');
      expect(csv).toContain('"Bruno","bruno@x.com"');
    });
  });
});
