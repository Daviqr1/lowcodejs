import { beforeEach, describe, expect, it, vi } from 'vitest';

import { E_TABLE_STYLE } from '@application/core/entity.core';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';
import type { ModelBuilderContractService } from '@application/services/table/model-builder-contract.service';

import GenerateTestDataUseCase from './generate-test-data.use-case';
import GenerationJobRegistryService from './generation-job-registry.service';
import { HARD_REAL_CAP } from './test-data-estimate-contract.service';
import TestDataEstimateService from './test-data-estimate.service';

describe('Generate Test Data Use Case', () => {
  let tableRepository: TableInMemoryRepository;
  let modelBuilder: ModelBuilderContractService;
  let registry: GenerationJobRegistryService;
  const estimateService = new TestDataEstimateService();
  let sut: GenerateTestDataUseCase;

  beforeEach(() => {
    tableRepository = new TableInMemoryRepository();
    // model builder mockado: build() retorna um model fake só com insertMany
    // (o use-case só chama isso). Mock parcial exige asserção — inevitável aqui.
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    modelBuilder = {
      build: vi.fn().mockResolvedValue({
        insertMany: vi.fn().mockResolvedValue([]),
      }),
    } as unknown as ModelBuilderContractService;
    registry = new GenerationJobRegistryService();
    sut = new GenerateTestDataUseCase(
      tableRepository,
      modelBuilder,
      registry,
      estimateService,
    );
  });

  it('deve retornar TABLE_NOT_FOUND se a tabela alvo não existir', async () => {
    const result = await sut.execute({
      tableId: 'non-existent-id',
      quantity: 100,
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected Left');
    expect(result.value.cause).toBe('TABLE_NOT_FOUND');
  });

  it('deve iniciar o job de geração com sucesso quando a tabela existir', async () => {
    const table = await tableRepository.create({
      name: 'Clientes',
      slug: 'clientes',
      _schema: {},
      fields: [],
      owner: 'owner-id',
      style: E_TABLE_STYLE.LIST,
      fieldOrderList: [],
      fieldOrderForm: [],
    });

    const result = await sut.execute({
      tableId: table._id,
      quantity: 50,
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected Right');

    expect(result.value.jobId).toBeDefined();
    expect(result.value.message).toContain(
      'Geração de dados de teste iniciada',
    );

    // Aguarda o job em background (roda via setTimeout) concluir
    await new Promise((resolve) => setTimeout(resolve, 150));

    const job = registry.getJob(result.value.jobId);
    expect(job).toBeDefined();
    expect(job?.status).toBe('completed');
    expect(job?.total).toBe(50);
    expect(job?.processed).toBe(50);
    expect(modelBuilder.build).toHaveBeenCalled();
  });

  describe('estimate', () => {
    it('deve retornar TABLE_NOT_FOUND quando a tabela não existir', async () => {
      const result = await sut.estimate({ tableId: 'nope', quantity: 100 });
      expect(result.isLeft()).toBe(true);
      if (!result.isLeft()) throw new Error('Expected Left');
      expect(result.value.cause).toBe('TABLE_NOT_FOUND');
    });

    it('deve marcar willSimulate e limitar o teto real para quantidades enormes', async () => {
      const table = await tableRepository.create({
        name: 'Big',
        slug: 'big',
        _schema: {},
        fields: [],
        owner: 'owner-id',
        style: E_TABLE_STYLE.LIST,
        fieldOrderList: [],
        fieldOrderForm: [],
      });

      const result = await sut.estimate({
        tableId: table._id,
        quantity: 5_000_000,
      });

      expect(result.isRight()).toBe(true);
      if (!result.isRight()) throw new Error('Expected Right');

      const estimate = result.value;
      expect(estimate.requested).toBe(5_000_000);
      expect(estimate.realTargetQuantity).toBeLessThanOrEqual(HARD_REAL_CAP);
      expect(estimate.realTargetQuantity).toBeLessThan(5_000_000);
      expect(estimate.willSimulate).toBe(true);
      expect(estimate.simulatedQuantity).toBe(
        5_000_000 - estimate.realTargetQuantity,
      );
      expect(estimate.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('helpers de estimativa', () => {
    it('estimateRowSizeBytes cresce com campos não-nativos', () => {
      const empty = estimateService.estimateRowSizeBytes({ fields: [] });
      const withFields = estimateService.estimateRowSizeBytes({
        fields: [
          { type: 'TEXT_SHORT', format: 'EMAIL', slug: 'email' },
          { type: 'TEXT_LONG', slug: 'bio' },
          { type: 'DATE', slug: 'nascimento' },
        ],
      });
      expect(withFields).toBeGreaterThan(empty);
    });

    it('resolveRealTargetQuantity respeita o orçamento de bytes', () => {
      const prev = process.env.GENERATE_TEST_DATA_MAX_BYTES;
      // Orçamento minúsculo: 1 KB. Com ~250 bytes/linha cabem poucas linhas.
      process.env.GENERATE_TEST_DATA_MAX_BYTES = String(1024);
      try {
        const cap = estimateService.resolveRealTargetQuantity(250, 1_000_000);
        expect(cap).toBeLessThan(1_000_000);
        expect(cap).toBeGreaterThanOrEqual(1);
      } finally {
        if (prev === undefined) delete process.env.GENERATE_TEST_DATA_MAX_BYTES;
        else process.env.GENERATE_TEST_DATA_MAX_BYTES = prev;
      }
    });

    it('buildEstimate não simula quando a quantidade cabe no teto', () => {
      const estimate = estimateService.buildEstimate({ fields: [] }, 100);
      expect(estimate.realTargetQuantity).toBe(100);
      expect(estimate.willSimulate).toBe(false);
      expect(estimate.simulatedQuantity).toBe(0);
    });
  });
});
