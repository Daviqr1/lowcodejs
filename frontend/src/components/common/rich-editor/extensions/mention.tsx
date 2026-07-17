import { flip, offset, shift, size, useFloating } from '@floating-ui/react-dom';
import type { Editor as TiptapEditor } from '@tiptap/core';
import Mention from '@tiptap/extension-mention';
import type { SuggestionOptions } from '@tiptap/suggestion';
import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';

import { MentionList } from '../bubble/mention-list';
import type {
  MentionItem,
  MentionListHandle,
  MentionPage,
  ResolveMentionPage,
} from '../bubble/mention-list';

export type { MentionPage, ResolveMentionPage };

export type MentionConfig = {
  enabled: boolean;
  resolvePage: ResolveMentionPage;
};

type ClientRectFn = () => DOMRect | null;

type PopupState = {
  items: Array<MentionItem>;
  query: string;
  hasMore: boolean;
  resolvePage: ResolveMentionPage;
  command: (item: MentionItem) => void;
  clientRect: ClientRectFn;
  ref: React.RefObject<MentionListHandle | null>;
};

type PopupController = {
  rerender: (state: PopupState | null) => void;
  destroy: () => void;
};

type MentionAttrs = {
  id: string;
  label: string;
};

function getMentionAttrs(node: {
  attrs: Record<string, unknown>;
}): MentionAttrs {
  const id = node.attrs.id;
  const label = node.attrs.label;
  let safeId = '';
  if (typeof id === 'string') safeId = id;
  let safeLabel = '';
  if (typeof label === 'string') safeLabel = label;
  return { id: safeId, label: safeLabel };
}

type MentionFloatingPopupProps = {
  state: PopupState | null;
};

function MentionFloatingPopup({
  state,
}: MentionFloatingPopupProps): React.JSX.Element {
  const { refs, floatingStyles } = useFloating({
    placement: 'bottom-start',
    strategy: 'fixed',
    middleware: [
      offset(4),
      flip({ padding: 8 }),
      shift({ padding: 8 }),
      size({
        padding: 8,
        apply({ availableHeight, elements }): void {
          elements.floating.style.maxHeight = `${String(Math.min(288, availableHeight))}px`;
        },
      }),
    ],
  });

  let clientRect: ClientRectFn | null = null;
  if (state) clientRect = state.clientRect;

  useEffect((): void => {
    if (!clientRect) return;
    refs.setReference({
      getBoundingClientRect: (): DOMRect => {
        const rect = clientRect();
        if (!rect) return new DOMRect(0, 0, 0, 0);
        return rect;
      },
    });
  }, [clientRect, refs]);

  if (!state) return <></>;

  return (
    <div
      ref={refs.setFloating}
      style={{
        ...floatingStyles,
        zIndex: 50,
        pointerEvents: 'auto',
        overflowY: 'auto',
      }}
    >
      <MentionList
        ref={state.ref}
        items={state.items}
        query={state.query}
        hasMore={state.hasMore}
        resolvePage={state.resolvePage}
        command={state.command}
      />
    </div>
  );
}

function createPopup(): PopupController {
  const rootEl = document.createElement('div');
  rootEl.dataset.slot = 'mention-popup-root';
  rootEl.style.position = 'fixed';
  rootEl.style.top = '0';
  rootEl.style.left = '0';
  rootEl.style.zIndex = '9999';
  rootEl.style.pointerEvents = 'none';
  document.body.appendChild(rootEl);

  const reactRoot: Root = createRoot(rootEl);

  const rerender = (state: PopupState | null): void => {
    reactRoot.render(<MentionFloatingPopup state={state} />);
  };

  const destroy = (): void => {
    reactRoot.unmount();
    rootEl.remove();
  };

  return { rerender, destroy };
}

function isClientRectFn(value: unknown): value is ClientRectFn {
  return typeof value === 'function';
}

function pickClientRect(value: unknown): ClientRectFn | null {
  if (isClientRectFn(value)) return value;
  return null;
}

export function buildMentionExtension(
  resolvePage: ResolveMentionPage,
): ReturnType<typeof Mention.configure> {
  let currentHasMore = false;

  const suggestion: Partial<SuggestionOptions<MentionItem>> = {
    char: '@',
    items: async ({ query }): Promise<Array<MentionItem>> => {
      const result = await resolvePage(query, 1);
      currentHasMore = result.hasMore;
      return result.items;
    },
    render: () => {
      let popup: PopupController | null = null;
      const ref = React.createRef<MentionListHandle | null>();
      let currentItems: Array<MentionItem> = [];
      let currentQuery = '';
      let currentClientRect: ClientRectFn | null = null;
      const noopCommand = (_item: MentionItem): void => {};
      let currentCommand: (item: MentionItem) => void = noopCommand;

      const rerender = (): void => {
        if (!popup) return;
        if (!currentClientRect) return;
        popup.rerender({
          items: currentItems,
          query: currentQuery,
          hasMore: currentHasMore,
          resolvePage,
          command: currentCommand,
          clientRect: currentClientRect,
          ref,
        });
      };

      return {
        onStart: (props): void => {
          currentItems = props.items;
          currentQuery = props.query;
          currentCommand = (item: MentionItem): void => {
            props.command(item);
          };
          currentClientRect = pickClientRect(props.clientRect);
          popup = createPopup();
          rerender();
        },
        onUpdate: (props): void => {
          currentItems = props.items;
          currentQuery = props.query;
          currentCommand = (item: MentionItem): void => {
            props.command(item);
          };
          currentClientRect = pickClientRect(props.clientRect);
          rerender();
        },
        onKeyDown: (props): boolean => {
          if (props.event.key === 'Escape') {
            popup?.destroy();
            popup = null;
            return true;
          }
          return ref.current?.onKeyDown(props.event) ?? false;
        },
        onExit: (): void => {
          popup?.destroy();
          popup = null;
        },
      };
    },
  };

  const MentionWithMarkdown = Mention.extend({
    addStorage() {
      return {
        ...(this.parent?.() ?? {}),
        markdown: {
          serialize(
            state: { write: (text: string) => void },
            node: { attrs: Record<string, unknown> },
          ): void {
            const { id, label } = getMentionAttrs(node);
            const safeLabel = label.replace(/[\\\]]/g, '\\$&');
            state.write(
              `<span class="mention" data-id="${id}" data-label="${safeLabel}">@${safeLabel}</span>`,
            );
          },
          parse: {},
        },
      };
    },
  });

  return MentionWithMarkdown.configure({
    HTMLAttributes: {
      class: 'mention',
      'data-test-id': 'mention',
    },
    renderText: ({ node }): string => {
      const { label } = getMentionAttrs(node);
      return '@' + label;
    },
    suggestion,
  });
}

export function extractMentionIds(editor: TiptapEditor | null): Array<string> {
  if (!editor) return [];
  const ids = new Set<string>();
  editor.state.doc.descendants((node): boolean => {
    if (node.type.name === 'mention') {
      const { id } = getMentionAttrs(node);
      if (id.length > 0) ids.add(id);
    }
    return true;
  });
  return Array.from(ids);
}
