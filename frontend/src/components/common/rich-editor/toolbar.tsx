import type { Editor } from '@tiptap/core';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  ChevronDown,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Image,
  Italic,
  Link,
  List,
  ListOrdered,
  Minus,
  Palette,
  Pilcrow,
  Quote,
  Redo,
  Strikethrough,
  Table,
  Underline,
  Undo,
} from 'lucide-react';

import { ColorPicker } from './color-picker';
import { ImageUpload } from './image-upload';
import { LinkEditBlock } from './link-edit-block';
import { TablePicker } from './table-picker';
import { ToolbarButton } from './toolbar-button';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';

type EditorToolbarProps = {
  editor: Editor;
};

export function EditorToolbar({
  editor,
}: EditorToolbarProps): React.JSX.Element {
  return (
    <div
      data-slot="editor-toolbar"
      data-test-id="rich-editor-toolbar"
      className="flex flex-wrap items-center gap-0.5 border-b px-1 py-1"
    >
      {/* Undo / Redo */}
      <ToolbarButton
        icon={Undo}
        tooltip="Desfazer"
        action={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
      />
      <ToolbarButton
        icon={Redo}
        tooltip="Refazer"
        action={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
      />

      <Separator
        orientation="vertical"
        className="mx-1 h-6"
      />

      {/* Heading Dropdown */}
      <HeadingDropdown editor={editor} />

      <Separator
        orientation="vertical"
        className="mx-1 h-6"
      />

      {/* Inline Formatting */}
      <ToolbarButton
        data-test-id="rich-editor-bold-btn"
        icon={Bold}
        tooltip="Negrito"
        action={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
      />
      <ToolbarButton
        data-test-id="rich-editor-italic-btn"
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
      <Separator
        orientation="vertical"
        className="mx-1 h-6"
      />

      {/* Text Color */}
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
            tooltip="Cor do texto"
          />
        </div>
      </ColorPicker>

      {/* Highlight */}
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
            isActive={editor.isActive('highlight')}
          />
        </div>
      </ColorPicker>

      <Separator
        orientation="vertical"
        className="mx-1 h-6"
      />

      {/* Text Align */}
      <ToolbarButton
        icon={AlignLeft}
        tooltip="Alinhar à esquerda"
        action={() => editor.chain().focus().setTextAlign('left').run()}
        isActive={editor.isActive({ textAlign: 'left' })}
      />
      <ToolbarButton
        icon={AlignCenter}
        tooltip="Centralizar"
        action={() => editor.chain().focus().setTextAlign('center').run()}
        isActive={editor.isActive({ textAlign: 'center' })}
      />
      <ToolbarButton
        icon={AlignRight}
        tooltip="Alinhar à direita"
        action={() => editor.chain().focus().setTextAlign('right').run()}
        isActive={editor.isActive({ textAlign: 'right' })}
      />
      <ToolbarButton
        icon={AlignJustify}
        tooltip="Justificar"
        action={() => editor.chain().focus().setTextAlign('justify').run()}
        isActive={editor.isActive({ textAlign: 'justify' })}
      />

      <Separator
        orientation="vertical"
        className="mx-1 h-6"
      />

      {/* Lists */}
      <ToolbarButton
        icon={List}
        tooltip="Lista com marcadores"
        action={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
      />
      <ToolbarButton
        icon={ListOrdered}
        tooltip="Lista numerada"
        action={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
      />
      <Separator
        orientation="vertical"
        className="mx-1 h-6"
      />

      {/* Link */}
      <LinkPopover editor={editor} />

      {/* Image */}
      <ImageUpload
        onUpload={(url) => editor.chain().focus().setImage({ src: url }).run()}
      >
        <div>
          <ToolbarButton
            icon={Image}
            tooltip="Imagem"
          />
        </div>
      </ImageUpload>

      {/* Table */}
      <TablePicker
        onInsert={(rows, cols) =>
          editor
            .chain()
            .focus()
            .insertTable({ rows, cols, withHeaderRow: true })
            .run()
        }
      >
        <div>
          <ToolbarButton
            icon={Table}
            tooltip="Tabela"
          />
        </div>
      </TablePicker>

      <Separator
        orientation="vertical"
        className="mx-1 h-6"
      />

      {/* Block elements */}
      <ToolbarButton
        icon={Quote}
        tooltip="Citação"
        action={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive('blockquote')}
      />
      <ToolbarButton
        icon={Minus}
        tooltip="Linha divisória"
        action={() => editor.chain().focus().setHorizontalRule().run()}
      />
    </div>
  );
}

type HeadingDropdownProps = {
  editor: Editor;
};

function HeadingDropdown({ editor }: HeadingDropdownProps): React.JSX.Element {
  let current = 'Texto';
  if (editor.isActive('heading', { level: 1 })) {
    current = 'H1';
  } else if (editor.isActive('heading', { level: 2 })) {
    current = 'H2';
  } else if (editor.isActive('heading', { level: 3 })) {
    current = 'H3';
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          data-slot="editor-heading-dropdown"
          type="button"
          className="inline-flex items-center gap-1 rounded-md px-2 h-8 text-sm hover:bg-accent cursor-pointer"
        >
          {current}
          <ChevronDown className="size-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem
          onClick={() => editor.chain().focus().setParagraph().run()}
        >
          <Pilcrow className="size-4 mr-2" />
          Parágrafo
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
        >
          <Heading1 className="size-4 mr-2" />
          Título 1
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          <Heading2 className="size-4 mr-2" />
          Título 2
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
        >
          <Heading3 className="size-4 mr-2" />
          Título 3
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type LinkPopoverProps = {
  editor: Editor;
};

function LinkPopover({ editor }: LinkPopoverProps): React.JSX.Element {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <div data-slot="editor-link-popover">
          <ToolbarButton
            icon={Link}
            tooltip="Link"
            isActive={editor.isActive('link')}
          />
        </div>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-72 p-2"
      >
        <LinkEditBlock
          defaultUrl={editor.getAttributes('link').href || ''}
          onSubmit={(url, text, openInNewTab) => {
            let target: string | null = null;
            if (openInNewTab) {
              target = '_blank';
            }
            const chain = editor.chain().focus();
            if (text) {
              chain
                .insertContent({
                  type: 'text',
                  marks: [
                    {
                      type: 'link',
                      attrs: {
                        href: url,
                        target,
                      },
                    },
                  ],
                  text,
                })
                .run();
            } else {
              chain
                .setLink({
                  href: url,
                  target,
                })
                .run();
            }
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
