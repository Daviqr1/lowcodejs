import { ScanTextIcon, Settings2Icon } from 'lucide-react';
import React, { Suspense } from 'react';

import { ConfigTab } from './-config-tab';
import { FillButton } from './-fill-button';
import { TranscriptionTab } from './-transcription-tab';

import { PageHeader, PageShell } from '@/components/common/page-shell';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ITable } from '@/lib/interfaces';

function TabSkeleton(): React.JSX.Element {
  return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}

type Props = {
  slot?: string;
  table?: ITable;
  slug?: string;
  onFillFields?: (data: Record<string, string | null>) => void;
};

export default function DocTranscriptionTool({
  slot,
  onFillFields,
}: Props): React.JSX.Element {
  // Quando renderizado num slot (ex: table.row.create), exibe só o botão de fill
  if (slot) {
    return (
      <Suspense fallback={null}>
        <FillButton onFillFields={onFillFields} />
      </Suspense>
    );
  }

  return (
    <PageShell data-test-id="tool-doc-transcription">
      <PageShell.Header>
        <PageHeader title="Transcrição de Documentos" />
      </PageShell.Header>

      <PageShell.Content className="p-4">
        <Tabs defaultValue="transcricao">
          <TabsList className="mb-4">
            <TabsTrigger
              value="transcricao"
              className="gap-2"
            >
              <ScanTextIcon className="size-4" />
              Transcrever
            </TabsTrigger>
            <TabsTrigger
              value="configuracoes"
              className="gap-2"
            >
              <Settings2Icon className="size-4" />
              Configurações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="transcricao">
            <Suspense fallback={<TabSkeleton />}>
              <TranscriptionTab />
            </Suspense>
          </TabsContent>

          <TabsContent value="configuracoes">
            <Suspense fallback={<TabSkeleton />}>
              <ConfigTab />
            </Suspense>
          </TabsContent>
        </Tabs>
      </PageShell.Content>
    </PageShell>
  );
}
