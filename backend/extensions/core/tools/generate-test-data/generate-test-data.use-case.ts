import { Service } from 'fastify-decorators';
import mongoose from 'mongoose';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import HTTPException from '@application/core/exception.core';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';
import { ModelBuilderContractService } from '@application/services/table/model-builder-contract.service';

import {
  BATCH_SIZE,
  buildEstimate,
  estimateRowSizeBytes,
  resolveRealTargetQuantity,
  type TestDataEstimate,
} from './generate-test-data.estimate';
import type { GenerateTestDataPayload } from './generate-test-data.types';
import { GenerationJobRegistry } from './generation-job-registry';

type MockField = {
  native?: boolean;
  type?: string;
  format?: string | null;
  slug: string;
  name?: string;
  dropdown?: Array<{ id: string }>;
};

@Service()
export default class GenerateTestDataUseCase {
  constructor(
    private readonly tableRepository: TableContractRepository,
    private readonly modelBuilder: ModelBuilderContractService,
  ) {}

  /**
   * Estimativa (bytes/linha, quanto será real x simulado, avisos de impacto)
   * apresentada ao usuário ANTES de disparar a geração.
   */
  async estimate(
    payload: GenerateTestDataPayload,
  ): Promise<Either<HTTPException, TestDataEstimate>> {
    try {
      const table = await this.tableRepository.findById(payload.tableId);

      if (!table) {
        return left(
          HTTPException.NotFound('Tabela não encontrada', 'TABLE_NOT_FOUND'),
        );
      }

      return right(buildEstimate(table, payload.quantity));
    } catch (error) {
      console.error('[generate-test-data][estimate][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'GENERATE_TEST_DATA_ERROR',
        ),
      );
    }
  }

  async execute(
    payload: GenerateTestDataPayload,
  ): Promise<Either<HTTPException, { jobId: string; message: string }>> {
    try {
      const table = await this.tableRepository.findById(payload.tableId);

      if (!table) {
        return left(
          HTTPException.NotFound('Tabela não encontrada', 'TABLE_NOT_FOUND'),
        );
      }

      const jobId = new mongoose.Types.ObjectId().toString();
      const registry = GenerationJobRegistry.getInstance();

      registry.setJob(jobId, {
        status: 'pending',
        processed: 0,
        total: payload.quantity,
        error: null,
      });

      // Roda em background para não bloquear a request.
      this.runGeneration(jobId, payload.tableId, payload.quantity).catch(
        (err) => {
          console.error(
            `[generate-test-data][job ${jobId}] background error:`,
            err,
          );
          registry.failJob(
            jobId,
            err?.message || 'Erro interno na geração de dados',
          );
        },
      );

      return right({
        jobId,
        message: 'Geração de dados de teste iniciada com sucesso.',
      });
    } catch (error) {
      console.error('[generate-test-data][execute][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'GENERATE_TEST_DATA_ERROR',
        ),
      );
    }
  }

  private async runGeneration(
    jobId: string,
    tableId: string,
    quantity: number,
  ): Promise<void> {
    const registry = GenerationJobRegistry.getInstance();
    registry.updateProgress(jobId, 0, 'processing');

    const table = await this.tableRepository.findById(tableId);
    if (!table) {
      throw new Error('Tabela não encontrada');
    }

    // Teto de inserção física derivado do orçamento de bytes (disco/Mongo) e do
    // tamanho médio da linha desta tabela — em vez de um número fixo. Acima do
    // teto, insere o máximo real possível e simula o progresso restante até 100%.
    const rowBytes = estimateRowSizeBytes(table);
    const realTargetQuantity = resolveRealTargetQuantity(rowBytes, quantity);

    // 1. Trata o primeiro campo RELATIONSHIP (se houver) gerando registros relacionados.
    const relFields = (table.fields || []).filter(
      (f) => f.type === 'RELATIONSHIP' && !f.trashed,
    );

    let relatedIds: string[] = [];
    let firstRelFieldSlug: string | null = null;

    if (relFields.length > 0) {
      const firstRelField = relFields[0];
      firstRelFieldSlug = firstRelField.slug;
      const relatedTableSlug = firstRelField.relationship?.table?.slug;

      if (relatedTableSlug) {
        const relatedTable =
          await this.tableRepository.findBySlug(relatedTableSlug);
        if (relatedTable) {
          // Gera 20x menos itens na tabela relacionada (min 1, máx 500 reais).
          const relatedTotalQuantity = Math.max(1, Math.floor(quantity / 20));
          const relatedRealQuantity = Math.min(relatedTotalQuantity, 500);

          const relatedModel = await this.modelBuilder.build(relatedTable);
          const relatedPayloads: Record<string, unknown>[] = [];

          for (let i = 0; i < relatedRealQuantity; i++) {
            relatedPayloads.push(this.generateMockRow(relatedTable, null, []));
          }

          if (relatedPayloads.length > 0) {
            const createdDocs = await relatedModel.insertMany(relatedPayloads);
            relatedIds = createdDocs.map((doc) => String(doc._id));
          }
        }
      }
    }

    // 2. Gera os registros da tabela alvo em lotes.
    const model = await this.modelBuilder.build(table);
    const batchSize = BATCH_SIZE;
    let processed = 0;

    while (processed < realTargetQuantity) {
      const currentBatchSize = Math.min(
        batchSize,
        realTargetQuantity - processed,
      );
      const batchPayloads: Record<string, unknown>[] = [];

      for (let i = 0; i < currentBatchSize; i++) {
        batchPayloads.push(
          this.generateMockRow(table, firstRelFieldSlug, relatedIds),
        );
      }

      if (batchPayloads.length > 0) {
        await model.insertMany(batchPayloads);
      }

      processed += currentBatchSize;

      const progressScaled = Math.round(
        (processed / realTargetQuantity) * quantity,
      );
      registry.updateProgress(
        jobId,
        Math.min(progressScaled, quantity - 1),
        'processing',
      );

      // Cede o event loop (sem delay fixo) para o polling de status responder.
      // Um setTimeout de 50ms por lote somaria ~50s só dormindo em 1M de linhas.
      await new Promise((resolve) => setImmediate(resolve));
    }

    // 3. Simula o progresso restante quando a quantidade pedida excede o teto físico.
    if (quantity > realTargetQuantity) {
      let currentProgress = realTargetQuantity;
      const steps = 10;
      const increment = Math.floor((quantity - realTargetQuantity) / steps);

      for (let s = 0; s < steps; s++) {
        currentProgress += increment;
        registry.updateProgress(
          jobId,
          Math.min(currentProgress, quantity - 1),
          'processing',
        );
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    registry.completeJob(jobId);
  }

  private generateMockRow(
    table: { fields?: MockField[] },
    firstRelFieldSlug: string | null,
    relatedIds: string[],
  ): Record<string, unknown> {
    const data: Record<string, unknown> = {};

    for (const f of table.fields ?? []) {
      if (f.native) continue;

      const randomVal = Math.floor(Math.random() * 100000);

      switch (f.type) {
        case 'TEXT_SHORT': {
          const mockByFormat: Record<string, string> = {
            EMAIL: `teste_${randomVal}@exemplo.com`,
            URL: `https://exemplo.com/teste_${randomVal}`,
            INTEGER: `${randomVal}`,
            DECIMAL: `${randomVal}.50`,
            PHONE: `(11) 99999-9999`,
            CNPJ: `12.345.678/0001-95`,
            CPF: `123.456.789-01`,
          };
          data[f.slug] =
            mockByFormat[f.format ?? ''] ??
            `${f.name ?? 'Campo'} Mock ${randomVal}`;
          break;
        }

        case 'TEXT_LONG':
          if (f.format === 'RICH_TEXT') {
            data[f.slug] =
              `<p>Parágrafo longo gerado para testes do campo ${f.name ?? ''} (valor ${randomVal}).</p>`;
          } else {
            data[f.slug] =
              `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Campo ${f.name ?? ''} com valor mockado ${randomVal}.`;
          }
          break;

        case 'DATE':
          data[f.slug] = new Date().toISOString();
          break;

        case 'DROPDOWN':
          if (f.dropdown && f.dropdown.length > 0) {
            const idx = Math.floor(Math.random() * f.dropdown.length);
            data[f.slug] = [f.dropdown[idx].id];
          } else {
            data[f.slug] = [`opcao_${randomVal}`];
          }
          break;

        case 'RELATIONSHIP':
          if (f.slug === firstRelFieldSlug && relatedIds.length > 0) {
            const idx = Math.floor(Math.random() * relatedIds.length);
            data[f.slug] = [relatedIds[idx]];
          } else {
            data[f.slug] = [new mongoose.Types.ObjectId().toString()];
          }
          break;

        case 'USER':
        case 'USER_GROUP':
        case 'FILE':
          data[f.slug] = [new mongoose.Types.ObjectId().toString()];
          break;

        case 'FIELD_GROUP':
          data[f.slug] = [];
          break;

        default:
          break;
      }
    }

    return data;
  }
}
