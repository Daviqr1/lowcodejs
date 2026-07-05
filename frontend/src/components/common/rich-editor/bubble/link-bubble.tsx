import type { Editor } from '@tiptap/core';
import { BubbleMenu } from '@tiptap/react/menus';
import { ExternalLink, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { LinkEditBlock } from '../link-edit-block';
import { ToolbarButton } from '../toolbar-button';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

type LinkDisplayProps = {
  editor: Editor;
};

function LinkDisplay({ editor }: LinkDisplayProps): React.JSX.Element {
  const href = editor.getAttributes('link').href || '';
  let display = href;
  if (href.length > 30) {
    display = `${href.substring(0, 30)}...`;
  }
  return (
    <span
      className="max-w-[200px] truncate px-2 text-xs text-muted-foreground"
      title={href}
    >
      {display}
    </span>
  );
}

type LinkBubbleProps = {
  editor: Editor;
};

export function LinkBubble({ editor }: LinkBubbleProps): React.JSX.Element {
  const [editing, setEditing] = useState(false);

  return (
    <BubbleMenu
      editor={editor}
      pluginKey="linkBubble"
      shouldShow={(props) => props.editor.isActive('link')}
    >
      <div
        data-slot="editor-link-bubble"
        data-test-id="rich-editor-link-bubble"
        className="bubble-menu"
      >
        <LinkDisplay editor={editor} />

        <ToolbarButton
          icon={ExternalLink}
          tooltip="Abrir"
          action={() => {
            const href = editor.getAttributes('link').href;
            if (href) window.open(href, '_blank');
          }}
        />

        <Popover
          open={editing}
          onOpenChange={setEditing}
        >
          <PopoverTrigger asChild>
            <div>
              <ToolbarButton
                icon={Pencil}
                tooltip="Editar"
              />
            </div>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-72 p-2"
          >
            <LinkEditBlock
              defaultUrl={editor.getAttributes('link').href || ''}
              defaultTarget={editor.getAttributes('link').target}
              onSubmit={(url, _text, openInNewTab) => {
                let target: string | null = null;
                if (openInNewTab) {
                  target = '_blank';
                }
                editor
                  .chain()
                  .focus()
                  .extendMarkRange('link')
                  .setLink({
                    href: url,
                    target,
                  })
                  .run();
                setEditing(false);
              }}
            />
          </PopoverContent>
        </Popover>

        <ToolbarButton
          icon={Trash2}
          tooltip="Remover link"
          action={() => editor.chain().focus().unsetLink().run()}
        />
      </div>
    </BubbleMenu>
  );
}
