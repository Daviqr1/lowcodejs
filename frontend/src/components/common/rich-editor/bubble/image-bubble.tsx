import type { Editor } from '@tiptap/core';
import { BubbleMenu } from '@tiptap/react/menus';
import { AlignCenter, AlignLeft, AlignRight, Trash2 } from 'lucide-react';

import { ToolbarButton } from '../toolbar-button';

type ImageBubbleProps = {
  editor: Editor;
};

export function ImageBubble({ editor }: ImageBubbleProps): React.JSX.Element {
  return (
    <BubbleMenu
      editor={editor}
      pluginKey="imageBubble"
      shouldShow={(props) => props.editor.isActive('image')}
    >
      <div
        data-slot="editor-image-bubble"
        data-test-id="rich-editor-image-bubble"
        className="bubble-menu"
      >
        <ToolbarButton
          icon={AlignLeft}
          tooltip="Alinhar à esquerda"
          action={() => {
            editor.chain().focus().setTextAlign('left').run();
          }}
        />
        <ToolbarButton
          icon={AlignCenter}
          tooltip="Centralizar"
          action={() => {
            editor.chain().focus().setTextAlign('center').run();
          }}
        />
        <ToolbarButton
          icon={AlignRight}
          tooltip="Alinhar à direita"
          action={() => {
            editor.chain().focus().setTextAlign('right').run();
          }}
        />
        <ToolbarButton
          icon={Trash2}
          tooltip="Remover"
          action={() => editor.chain().focus().deleteSelection().run()}
        />
      </div>
    </BubbleMenu>
  );
}
