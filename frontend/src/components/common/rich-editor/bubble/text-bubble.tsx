import type { Editor } from '@tiptap/core';
import { BubbleMenu } from '@tiptap/react/menus';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Highlighter,
  Italic,
  Link,
  Palette,
  Strikethrough,
  Underline,
} from 'lucide-react';

import { ColorPicker } from '../color-picker';
import { ToolbarButton } from '../toolbar-button';

type TextBubbleProps = {
  editor: Editor;
};

export function TextBubble({ editor }: TextBubbleProps): React.JSX.Element {
  return (
    <BubbleMenu
      editor={editor}
      pluginKey="textBubble"
      shouldShow={(props) => {
        const { from, to } = props.state.selection;
        if (from === to) return false;
        if (props.editor.isActive('image')) return false;
        if (props.editor.isActive('table')) return false;
        return true;
      }}
    >
      <div
        data-slot="editor-text-bubble"
        data-test-id="rich-editor-text-bubble"
        className="bubble-menu"
      >
        <ToolbarButton
          icon={Bold}
          tooltip="Negrito"
          action={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
        />
        <ToolbarButton
          icon={Italic}
          tooltip="Itálico"
          action={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
        />
        <ToolbarButton
          icon={Underline}
          tooltip="Sublinhado"
          action={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive('underline')}
        />
        <ToolbarButton
          icon={Strikethrough}
          tooltip="Tachado"
          action={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive('strike')}
        />
        <ToolbarButton
          icon={Link}
          tooltip="Link"
          action={() => {
            const url = window.prompt('URL:');
            if (url) {
              editor.chain().focus().setLink({ href: url }).run();
            }
          }}
          isActive={editor.isActive('link')}
        />

        <ColorPicker
          value={editor.getAttributes('textStyle').color}
          onChange={(color) => {
            if (color) {
              editor.chain().focus().setColor(color).run();
            } else {
              editor.chain().focus().unsetColor().run();
            }
          }}
        >
          <div>
            <ToolbarButton
              icon={Palette}
              tooltip="Cor"
            />
          </div>
        </ColorPicker>

        <ColorPicker
          highlight
          value={editor.getAttributes('highlight').color}
          onChange={(color) => {
            if (color) {
              editor.chain().focus().toggleHighlight({ color }).run();
            } else {
              editor.chain().focus().unsetHighlight().run();
            }
          }}
        >
          <div>
            <ToolbarButton
              icon={Highlighter}
              tooltip="Destaque"
            />
          </div>
        </ColorPicker>

        <ToolbarButton
          icon={AlignLeft}
          action={() => editor.chain().focus().setTextAlign('left').run()}
          isActive={editor.isActive({ textAlign: 'left' })}
        />
        <ToolbarButton
          icon={AlignCenter}
          action={() => editor.chain().focus().setTextAlign('center').run()}
          isActive={editor.isActive({ textAlign: 'center' })}
        />
        <ToolbarButton
          icon={AlignRight}
          action={() => editor.chain().focus().setTextAlign('right').run()}
          isActive={editor.isActive({ textAlign: 'right' })}
        />
      </div>
    </BubbleMenu>
  );
}
