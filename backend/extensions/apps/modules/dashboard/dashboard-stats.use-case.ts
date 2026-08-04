import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import { E_USER_STATUS } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';
import { UserContractRepository } from '@application/repositories/user/user-contract.repository';
import { DateContractService } from '@application/services/date/date-contract.service';
import { getDataConnection } from '@config/database.config';

export type DashboardStatsResponse = {
  totals: {
    tables: number;
    users: number;
    records: number;
    activeUsers: number;
  };
  tablesPerMonth: Array<{ month: string; tables: number }>;
  usersByStatus: Array<{ status: string; value: number; fill: string }>;
  recentActivity: Array<{
    id: string;
    type: 'table_created' | 'user_created';
    description: string;
    time: string;
  }>;
};

@Service()
export default class DashboardStatsUseCase {
  constructor(
    private readonly tableRepository: TableContractRepository,
    private readonly userRepository: UserContractRepository,
    private readonly dateService: DateContractService,
  ) {}

  async execute(): Promise<Either<HTTPException, DashboardStatsResponse>> {
    try {
      const tables = await this.tableRepository.findMany({});
      const users = await this.userRepository.findMany({});

      const totalTables = tables.length;
      const totalUsers = users.length;
      const activeUsers = users.filter(
        (u) => u.status === E_USER_STATUS.ACTIVE,
      ).length;

      // Total de registros: itera collections dinâmicas em paralelo.
      const dataConn = getDataConnection();
      const recordCounts = await Promise.all(
        tables.map(async (table) => {
          try {
            return await dataConn.collection(table.slug).countDocuments({
              trashedAt: null,
            });
          } catch {
            // Tabela cadastrada mas sem collection ainda (zero registros)
            return 0;
          }
        }),
      );
      const totalRecords = recordCounts.reduce((acc, n) => acc + n, 0);

      // Tabelas por mês (últimos 6)
      const months = this.dateService.lastMonths(6);
      const tablesPerMonth = months.map(({ key, label }) => ({
        month: label,
        tables: tables.filter(
          (t) => this.dateService.monthKey(t.createdAt) === key,
        ).length,
      }));

      // Usuários por status
      const usersByStatus = [
        {
          status: 'Ativos',
          value: activeUsers,
          fill: 'var(--chart-1)',
        },
        {
          status: 'Inativos',
          value: totalUsers - activeUsers,
          fill: 'var(--chart-2)',
        },
      ];

      // Atividade recente: últimas 5 tabelas + últimos 5 usuários, ordenados por createdAt
      const tableActivities = [...tables]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        .slice(0, 5)
        .map((t) => ({
          id: `table-${t._id}`,
          type: 'table_created' as const,
          description: `Tabela "${t.name}" criada`,
          time: new Date(t.createdAt).toISOString(),
        }));

      const userActivities = [...users]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        .slice(0, 5)
        .map((u) => ({
          id: `user-${u._id}`,
          type: 'user_created' as const,
          description: `Usuário "${u.name}" cadastrado`,
          time: new Date(u.createdAt).toISOString(),
        }));

      const recentActivity = [...tableActivities, ...userActivities]
        .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
        .slice(0, 10);

      return right({
        totals: {
          tables: totalTables,
          users: totalUsers,
          records: totalRecords,
          activeUsers,
        },
        tablesPerMonth,
        usersByStatus,
        recentActivity,
      });
    } catch (error) {
      console.error('[apps/dashboard > stats][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro ao calcular estatísticas do dashboard',
          'DASHBOARD_STATS_ERROR',
        ),
      );
    }
  }
}
