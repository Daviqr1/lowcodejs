import { Pie, PieChart } from 'recharts';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';

const chartConfig = {
  value: {
    label: 'Usuários',
  },
  Ativos: {
    label: 'Ativos',
    color: 'var(--chart-1)',
  },
  Inativos: {
    label: 'Inativos',
    color: 'var(--chart-2)',
  },
} satisfies ChartConfig;

type ChartUsersProps = {
  data: Array<{ status: string; value: number; fill: string }>;
};

export function ChartUsers({ data }: ChartUsersProps): React.JSX.Element {
  return (
    <Card data-test-id="chart-users">
      <CardHeader>
        <CardTitle>Usuários por Status</CardTitle>
        <CardDescription>
          Distribuição de usuários ativos e inativos
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="h-[200px] w-full"
        >
          <PieChart accessibilityLayer>
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <Pie
              data={data}
              dataKey="value"
              nameKey="status"
              innerRadius={50}
              strokeWidth={5}
            />
            <ChartLegend
              content={<ChartLegendContent nameKey="status" />}
              className="-translate-y-2 flex-wrap gap-2 [&>*]:justify-center"
            />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
