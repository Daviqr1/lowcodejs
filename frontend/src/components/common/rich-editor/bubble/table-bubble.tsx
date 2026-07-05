import type { Editor } from '@tiptap/core';
import { BubbleMenu } from '@tiptap/react/menus';
import {
  BetweenHorizontalEnd,
  BetweenHorizontalStart,
  BetweenVerticalEnd,
  BetweenVerticalStart,
  Combine,
  SplitSquareHorizontal,
  Trash2,
  XSquare,
} from 'lucide-react';

import { ToolbarButton } from '../toolbar-button';

import { Separator } from '@/components/ui/separator';

type TableBubbleProps = {
  editor: Editor;
};

export function TableBubble({ editor }: TableBubbleProps): React.JSX.Element {
  return (
    <BubbleMenu
      editor={editor}
      pluginKey="tableBubble"
      shouldShow={(props) => props.editor.isActive('table')}
    >
      <div
        data-slot="editor-table-bubble"
        data-test-id="rich-editor-table-bubble"
        className="bubble-menu"
      >
        <ToolbarButton
          icon={BetweenVerticalStart}
          tooltip="Coluna antes"
          action={() => editor.chain().focus().addColumnBefore().run()}
        />
        <ToolbarButton
          icon={BetweenVerticalEnd}
          tooltip="Coluna depois"
          action={() => editor.chain().focus().addColumnAfter().run()}
        />
        <ToolbarButton
          icon={XSquare}
          tooltip="Remover coluna"
          action={() => editor.chain().focus().deleteColumn().run()}
        />

        <Separator
          orientation="vertical"
          className="mx-0.5 h-6"
        />

        <ToolbarButton
          icon={BetweenHorizontalStart}
          tooltip="Linha antes"
          action={() => editor.chain().focus().addRowBefore().run()}
        />
        <ToolbarButton
          icon={BetweenHorizontalEnd}
          tooltip="Linha depois"
          action={() => editor.chain().focus().addRowAfter().run()}
        />
        <ToolbarButton
          icon={XSquare}
          tooltip="Remover linha"
          action={() => editor.chain().focus().deleteRow().run()}
        />

        <Separator
          orientation="vertical"
          className="mx-0.5 h-6"
        />

        <ToolbarButton
          icon={Combine}
          tooltip="Mesclar células"
          action={() => editor.chain().focus().mergeCells().run()}
        />
        <ToolbarButton
          icon={SplitSquareHorizontal}
          tooltip="Dividir célula"
          action={() => editor.chain().focus().splitCell().run()}
        />

        <Separator
          orientation="vertical"
          className="mx-0.5 h-6"
        />

        <ToolbarButton
          icon={Trash2}
          tooltip="Remover tabela"
          action={() => editor.chain().focus().deleteTable().run()}
        />
      </div>
    </BubbleMenu>
  );
}
