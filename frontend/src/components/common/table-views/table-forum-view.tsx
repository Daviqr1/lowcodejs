import { useRouterState } from '@tanstack/react-router';
import { useStore } from '@tanstack/react-store';
import type { Editor as TiptapEditor } from '@tiptap/core';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowDownIcon, AtSignIcon } from 'lucide-react';
import React from 'react';
import { toast } from 'sonner';

import {
  ForumAddChannelDialog,
  ForumComposer,
  ForumDeleteChannelDialog,
  ForumDeleteMessageDialog,
  ForumDocuments,
  ForumEditChannelDialog,
  ForumHeader,
  ForumMessagesList,
  ForumSidebar,
} from '@/components/common/forum';
import type { ForumDocument, ForumMessage } from '@/components/common/forum';
import { extractMentionIds } from '@/components/common/rich-editor';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useProfileRead } from '@/hooks/tanstack-query/use-profile-read';
import { useCreateTableRow } from '@/hooks/tanstack-query/use-table-row-create';
import { useUpdateTableRow } from '@/hooks/tanstack-query/use-table-row-update';
import { useDismissableDialog } from '@/hooks/use-dismissable-dialog';
import { useAppForm } from '@/integrations/tanstack-form/form-hook';
import { API } from '@/lib/api';
import { E_FIELD_TYPE, E_TABLE_PROFILE } from '@/lib/constant';
import {
  normalizeGroupFieldValue,
  normalizeId,
  normalizeIdList,
  normalizeStorageList,
  normalizeUserList,
  parseReactions,
  serializeReactions,
  stripHtml,
} from '@/lib/forum-helpers';
import type {
  IField,
  IRow,
  IStorage,
  ITable,
  ITableMember,
  Paginated,
} from '@/lib/interfaces';
import { getFieldBySlug, getFirstFieldByType } from '@/lib/kanban-helpers';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authentication';

const FORUM_SYNC_INTERVAL_MS = 5000;
const FORUM_MENTIONS_STORAGE_KEY_PREFIX = 'forum-mentions-unseen';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

type ForumRealtimeSubscriptionArgs = {
  enabled: boolean;
  intervalMs: number;
  onSync: () => void;
};

type ForumRealtimeStrategy = {
  subscribeChannels: (args: ForumRealtimeSubscriptionArgs) => () => void;
  subscribeActiveChannel: (args: ForumRealtimeSubscriptionArgs) => () => void;
};

type ForumMentionAlert = {
  channelId: string;
  messageId: string;
  dateValue: string | null;
  dateLabel: string;
};

// Keep realtime sync behind a strategy so polling can be replaced by websocket later.
const forumPollingStrategy: ForumRealtimeStrategy = {
  subscribeChannels({ enabled, intervalMs, onSync }): () => void {
    if (!enabled || typeof window === 'undefined') return () => {};
    onSync();
    const interval = window.setInterval(onSync, intervalMs);
    return (): void => window.clearInterval(interval);
  },
  subscribeActiveChannel({ enabled, intervalMs, onSync }): () => void {
    if (!enabled || typeof window === 'undefined') return () => {};
    onSync();
    const interval = window.setInterval(onSync, intervalMs);
    return (): void => window.clearInterval(interval);
  },
};

type Props = {
  data: Array<IRow>;
  headers: Array<IField>;
  tableSlug: string;
  table: ITable;
};

export function TableForumView({
  data,
  headers,
  tableSlug,
  table,
}: Props): React.JSX.Element {
  const auth = useAuthStore((s) => s.user);
  const { data: profile } = useProfileRead();
  const currentUserId = auth?._id ?? profile?._id ?? '';
  const mentionsStorageKey = React.useMemo(
    () =>
      `${FORUM_MENTIONS_STORAGE_KEY_PREFIX}:${tableSlug}:${currentUserId || 'anonymous'}`,
    [currentUserId, tableSlug],
  );

  const [rowsState, setRowsState] = React.useState<Array<IRow>>(data);
  const [activeRowId, setActiveRowId] = React.useState<string | null>(
    data[0]?._id ?? null,
  );
  const [activeTab, setActiveTab] = React.useState('chat');
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const [composerLayout, setComposerLayout] = React.useState<'side' | 'bottom'>(
    () => {
      if (typeof window === 'undefined') return 'bottom';
      const stored = window.localStorage.getItem('forum-composer-layout');
      if (stored === 'side') return 'side';
      return 'bottom';
    },
  );

  const [composerStorages, setComposerStorages] = React.useState<
    Array<IStorage>
  >([]);
  const [replyToId, setReplyToId] = React.useState<string | null>(null);
  const [editingIndex, setEditingIndex] = React.useState<number | null>(null);
  const [editingChannelId, setEditingChannelId] = React.useState<string | null>(
    null,
  );
  const [editingChannelRow, setEditingChannelRow] = React.useState<IRow | null>(
    null,
  );
  const [deleteChannelTarget, setDeleteChannelTarget] = React.useState<{
    id: string;
    nonce: number;
  } | null>(null);
  const [deleteMessageTarget, setDeleteMessageTarget] = React.useState<{
    index: number;
    nonce: number;
  } | null>(null);
  const addChannelDialog = useDismissableDialog();
  const editChannelDialog = useDismissableDialog();
  const addChannelTriggerRef = React.useRef<HTMLButtonElement | null>(null);
  const editChannelTriggerRef = React.useRef<HTMLButtonElement | null>(null);
  const deleteChannelTriggerRef = React.useRef<HTMLButtonElement | null>(null);
  const deleteMessageTriggerRef = React.useRef<HTMLButtonElement | null>(null);
  const messagesEndRef = React.useRef<HTMLDivElement | null>(null);
  const composerEditorRef = React.useRef<TiptapEditor | null>(null);
  const pollingRef = React.useRef<{ inFlight: boolean; rowId: string | null }>({
    inFlight: false,
    rowId: null,
  });
  const channelsPollingRef = React.useRef<{ inFlight: boolean }>({
    inFlight: false,
  });
  const [focusTick, setFocusTick] = React.useState(0);
  const [seenMentionIdsByChannel, setSeenMentionIdsByChannel] = React.useState<
    Record<string, Array<string>>
  >(() => {
    if (typeof window === 'undefined') return {};
    try {
      const raw = window.localStorage.getItem(
        `${FORUM_MENTIONS_STORAGE_KEY_PREFIX}:${tableSlug}:${currentUserId || 'anonymous'}`,
      );
      if (!raw) return {};
      const parsed: Record<string, unknown> = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return {};
      return Object.fromEntries(
        Object.entries(parsed).map(([channelId, value]) => {
          let normalized: Array<string> = [];
          if (Array.isArray(value)) {
            normalized = value.map((item) => String(item)).filter(Boolean);
          }
          return [channelId, normalized];
        }),
      );
    } catch {
      return {};
    }
  });
  const [mentionJumpTick, setMentionJumpTick] = React.useState(0);
  const [mentionJumpMessageId, setMentionJumpMessageId] = React.useState<
    string | null
  >(null);
  const [highlightMentionMessageId, setHighlightMentionMessageId] =
    React.useState<string | null>(null);
  const [highlightMentionTick, setHighlightMentionTick] = React.useState(0);

  // Deep-link via query params (?channelId=...&messageId=...) — usado pelas
  // notificações de menção do fórum para abrir o canal certo e rolar até a
  // mensagem específica.
  const searchParams = useRouterState({ select: (s) => s.location.search });
  React.useEffect(() => {
    let channelId: unknown;
    let messageId: unknown;
    if (isRecord(searchParams)) {
      channelId = searchParams.channelId;
      messageId = searchParams.messageId;
    }
    if (typeof channelId === 'string' && channelId) {
      setActiveRowId(channelId);
    }
    if (typeof messageId === 'string' && messageId) {
      setMentionJumpMessageId(messageId);
      setMentionJumpTick((value) => value + 1);
      setHighlightMentionMessageId(messageId);
      setHighlightMentionTick((value) => value + 1);
    }
  }, [searchParams]);

  const bumpFocus = React.useCallback(() => {
    setFocusTick((value) => value + 1);
  }, []);

  React.useEffect(() => {
    setRowsState(data);
  }, [data]);

  React.useEffect(() => {
    if (!activeRowId && data[0]?._id) {
      setActiveRowId(data[0]._id);
    }
  }, [activeRowId, data]);

  React.useEffect(() => {
    if (activeRowId) bumpFocus();
  }, [activeRowId, bumpFocus]);

  React.useEffect(() => {
    if (replyToId) bumpFocus();
  }, [replyToId, bumpFocus]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('forum-composer-layout', composerLayout);
  }, [composerLayout]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(
        mentionsStorageKey,
        JSON.stringify(seenMentionIdsByChannel),
      );
    } catch {
      // Ignore localStorage failures.
    }
  }, [mentionsStorageKey, seenMentionIdsByChannel]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(mentionsStorageKey);
      if (!raw) {
        setSeenMentionIdsByChannel({});
        return;
      }
      const parsed: Record<string, unknown> = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') {
        setSeenMentionIdsByChannel({});
        return;
      }
      setSeenMentionIdsByChannel(
        Object.fromEntries(
          Object.entries(parsed).map(([channelId, value]) => {
            let normalized: Array<string> = [];
            if (Array.isArray(value)) {
              normalized = value.map((item) => String(item)).filter(Boolean);
            }
            return [channelId, normalized];
          }),
        ),
      );
    } catch {
      setSeenMentionIdsByChannel({});
    }
  }, [mentionsStorageKey]);

  const channelField =
    getFieldBySlug(headers, 'canal', E_FIELD_TYPE.TEXT_SHORT) ||
    getFieldBySlug(headers, 'titulo', E_FIELD_TYPE.TEXT_SHORT) ||
    getFirstFieldByType(headers, E_FIELD_TYPE.TEXT_SHORT);

  const channelDescriptionField =
    getFieldBySlug(headers, 'descricao', E_FIELD_TYPE.TEXT_LONG) ||
    getFirstFieldByType(headers, E_FIELD_TYPE.TEXT_LONG);
  const channelPrivacyField = getFieldBySlug(
    headers,
    'privacidade',
    E_FIELD_TYPE.DROPDOWN,
  );
  const channelMembersField = getFieldBySlug(
    headers,
    'membros',
    E_FIELD_TYPE.USER,
  );

  const messagesField =
    getFieldBySlug(headers, 'mensagens', E_FIELD_TYPE.FIELD_GROUP) ||
    getFirstFieldByType(headers, E_FIELD_TYPE.FIELD_GROUP);

  const activeRow = rowsState.find((row) => row._id === activeRowId) ?? null;

  const getChannelCreatorId = React.useCallback((row: IRow): string | null => {
    return normalizeId(row.creator) ?? normalizeId(row['creator']);
  }, []);

  const isCreatorOfChannel = React.useCallback(
    (row: IRow): boolean => {
      if (!currentUserId) return false;
      return getChannelCreatorId(row) === currentUserId;
    },
    [currentUserId, getChannelCreatorId],
  );

  const isMemberOfChannel = React.useCallback(
    (row: IRow): boolean => {
      if (!currentUserId) return false;
      if (!channelMembersField) return true;
      const memberIds = normalizeIdList(row[channelMembersField.slug]);
      return memberIds.includes(currentUserId);
    },
    [channelMembersField, currentUserId],
  );

  const isPrivateChannel = React.useCallback(
    (row: IRow): boolean => {
      if (channelPrivacyField) {
        const raw = row[channelPrivacyField.slug];
        let value: unknown = raw;
        if (Array.isArray(raw)) value = raw[0];
        return (
          String(value ?? '')
            .trim()
            .toLowerCase() === 'privado'
        );
      }
      return Boolean(channelMembersField);
    },
    [channelMembersField, channelPrivacyField],
  );

  const canAccessChannel = React.useCallback(
    (row: IRow): boolean => {
      if (isCreatorOfChannel(row)) return true;
      if (!isPrivateChannel(row)) return true;
      return isMemberOfChannel(row);
    },
    [isCreatorOfChannel, isMemberOfChannel, isPrivateChannel],
  );

  const canManageChannel = React.useCallback(
    (row: IRow): boolean => isCreatorOfChannel(row),
    [isCreatorOfChannel],
  );
  const canAddChannel = React.useMemo(() => {
    if (!currentUserId) return false;
    const ownerId = normalizeId(table.owner);
    if (ownerId && ownerId === currentUserId) return true;
    const adminIds = table.members
      .filter(
        (member: ITableMember) =>
          member.profile === E_TABLE_PROFILE.OWNER ||
          member.profile === E_TABLE_PROFILE.ADMIN,
      )
      .map((member: ITableMember) => member.user);
    if (ownerId) adminIds.push(ownerId);
    return adminIds.includes(currentUserId);
  }, [currentUserId, table.members, table.owner]);

  React.useEffect(() => {
    if (rowsState.length === 0) {
      setActiveRowId(null);
      return;
    }
    if (activeRowId) {
      const selectedRow = rowsState.find((row) => row._id === activeRowId);
      if (selectedRow && canAccessChannel(selectedRow)) return;
    }
    const firstAccessibleRow = rowsState.find((row) => canAccessChannel(row));
    setActiveRowId(firstAccessibleRow?._id ?? null);
  }, [activeRowId, canAccessChannel, rowsState]);

  const messagesGroup = React.useMemo(() => {
    if (!messagesField?.group?.slug) return null;
    return table.groups.find(
      (group) => group.slug === messagesField.group?.slug,
    );
  }, [messagesField?.group?.slug, table.groups]);

  const groupFields = messagesGroup?.fields ?? [];
  const fallbackGroupFields = React.useMemo(
    () =>
      [
        { slug: 'mensagem-id', type: E_FIELD_TYPE.TEXT_SHORT, multiple: false },
        { slug: 'texto', type: E_FIELD_TYPE.TEXT_LONG, multiple: false },
        { slug: 'autor', type: E_FIELD_TYPE.USER, multiple: false },
        { slug: 'data', type: E_FIELD_TYPE.DATE, multiple: false },
        { slug: 'anexos', type: E_FIELD_TYPE.FILE, multiple: true },
        { slug: 'mencoes', type: E_FIELD_TYPE.USER, multiple: true },
        { slug: 'resposta', type: E_FIELD_TYPE.TEXT_SHORT, multiple: false },
        { slug: 'reacoes', type: E_FIELD_TYPE.TEXT_LONG, multiple: false },
        {
          slug: 'mencoes-visualizadas',
          type: E_FIELD_TYPE.USER,
          multiple: true,
        },
      ] satisfies Array<Pick<IField, 'slug' | 'type' | 'multiple'>>,
    [],
  );

  const resolvedGroupFields = React.useMemo(() => {
    if (
      groupFields.length > 0 &&
      typeof groupFields[0] === 'object' &&
      groupFields[0] !== null &&
      'slug' in groupFields[0]
    ) {
      return groupFields;
    }

    // fallback só define os campos usados pelo fórum (slug/type/multiple).
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return fallbackGroupFields as Array<IField>;
  }, [fallbackGroupFields, groupFields]);

  const messageIdField = resolvedGroupFields.find(
    (f) => f.slug === 'mensagem-id',
  );
  const messageTextField = resolvedGroupFields.find((f) => f.slug === 'texto');
  const messageAuthorField = resolvedGroupFields.find(
    (f) => f.slug === 'autor',
  );
  const messageDateField = resolvedGroupFields.find((f) => f.slug === 'data');
  const messageAttachmentsField = resolvedGroupFields.find(
    (f) => f.slug === 'anexos',
  );
  const messageMentionsField = resolvedGroupFields.find(
    (f) => f.slug === 'mencoes',
  );
  const messageReplyField = resolvedGroupFields.find(
    (f) => f.slug === 'resposta',
  );
  const messageReactionsField = resolvedGroupFields.find(
    (f) => f.slug === 'reacoes',
  );
  const messageMentionSeenField = resolvedGroupFields.find(
    (f) => f.slug === 'mencoes-visualizadas',
  );

  const rawMessages = React.useMemo(() => {
    if (!activeRow || !messagesField) return [];
    const value = activeRow[messagesField.slug];
    const out: Array<Record<string, unknown>> = [];
    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'object' && item !== null) out.push(item);
      }
    }
    return out;
  }, [activeRow, messagesField]);

  const messages = React.useMemo<Array<ForumMessage>>(() => {
    return rawMessages.map((message: Record<string, unknown>, index) => {
      let messageRecord: Record<string, unknown> = {};
      if (message && typeof message === 'object') messageRecord = message;

      let idValue: unknown = null;
      if (messageIdField) idValue = messageRecord[messageIdField.slug];
      const id = normalizeId(idValue) ?? `message-${index}`;

      let text = '';
      if (messageTextField) {
        const rawText = messageRecord[messageTextField.slug];
        if (typeof rawText === 'string') text = rawText;
      }

      let authorList: ReturnType<typeof normalizeUserList> = [];
      if (messageAuthorField) {
        authorList = normalizeUserList(messageRecord[messageAuthorField.slug]);
      }
      const author = authorList[0] ?? null;
      let authorId: string | null = null;
      if (typeof author === 'string') authorId = author;
      else if (author && '_id' in author) authorId = author._id;

      let dateRecordValue: unknown = null;
      if (messageDateField) {
        dateRecordValue = messageRecord[messageDateField.slug];
      }
      let dateLabel = '';
      if (typeof dateRecordValue === 'string' && dateRecordValue) {
        dateLabel = format(new Date(dateRecordValue), 'dd/MM/yyyy HH:mm', {
          locale: ptBR,
        });
      }
      let dateValue: string | null = null;
      if (typeof dateRecordValue === 'string') dateValue = dateRecordValue;

      let attachments: ReturnType<typeof normalizeStorageList> = [];
      if (messageAttachmentsField) {
        attachments = normalizeStorageList(
          messageRecord[messageAttachmentsField.slug],
        );
      }
      let mentions: ReturnType<typeof normalizeUserList> = [];
      if (messageMentionsField) {
        mentions = normalizeUserList(messageRecord[messageMentionsField.slug]);
      }
      let replyTo: string | null = null;
      if (messageReplyField) {
        const rawReply = messageRecord[messageReplyField.slug];
        if (typeof rawReply === 'string') replyTo = rawReply;
      }
      let reactions: ReturnType<typeof parseReactions> = [];
      if (messageReactionsField) {
        reactions = parseReactions(messageRecord[messageReactionsField.slug]);
      }

      return {
        id,
        text,
        author,
        authorId,
        dateLabel,
        dateValue,
        attachments,
        mentions,
        replyTo,
        reactions,
        raw: messageRecord,
      };
    });
  }, [
    rawMessages,
    messageIdField,
    messageTextField,
    messageAuthorField,
    messageDateField,
    messageAttachmentsField,
    messageMentionsField,
    messageReplyField,
    messageReactionsField,
  ]);

  const documents = React.useMemo<Array<ForumDocument>>(() => {
    const items: Array<ForumDocument> = [];

    for (const message of messages) {
      for (const attachment of message.attachments) {
        items.push({
          messageId: message.id,
          file: attachment,
          author: message.author,
          dateLabel: message.dateLabel,
        });
      }
    }
    return items;
  }, [messages]);

  const mentionAlertsByChannel = React.useMemo(() => {
    const next = new Map<string, Array<ForumMentionAlert>>();

    if (!currentUserId || !messagesField || !messageMentionsField) return next;

    for (const row of rowsState) {
      const rawChannelMessages = row[messagesField.slug];
      let channelMessages: Array<unknown> = [];
      if (Array.isArray(rawChannelMessages)) {
        channelMessages = rawChannelMessages;
      }

      for (let index = 0; index < channelMessages.length; index += 1) {
        const candidate = channelMessages[index];
        let messageRecord: Record<string, unknown> = {};
        if (isRecord(candidate)) messageRecord = candidate;

        const mentionIds = normalizeIdList(
          messageRecord[messageMentionsField.slug],
        );
        if (!mentionIds.includes(currentUserId)) continue;
        let seenIds: Array<string> = [];
        if (messageMentionSeenField) {
          seenIds = normalizeIdList(
            messageRecord[messageMentionSeenField.slug],
          );
        }
        if (seenIds.includes(currentUserId)) continue;

        let authorCandidates: Array<string> = [];
        if (messageAuthorField) {
          authorCandidates = normalizeIdList(
            messageRecord[messageAuthorField.slug],
          );
        }
        const authorId = authorCandidates[0] ?? null;
        if (authorId && authorId === currentUserId) continue;

        const messageId =
          (messageIdField && normalizeId(messageRecord[messageIdField.slug])) ??
          `message-${index}`;
        let rawDate: unknown = null;
        if (messageDateField) rawDate = messageRecord[messageDateField.slug];
        let dateValue: string | null = null;
        if (typeof rawDate === 'string') dateValue = rawDate;
        let dateLabel = '';
        if (dateValue && !Number.isNaN(new Date(dateValue).getTime())) {
          dateLabel = format(new Date(dateValue), 'dd/MM/yyyy HH:mm', {
            locale: ptBR,
          });
        }

        const list = next.get(row._id) ?? [];
        list.push({
          channelId: row._id,
          messageId,
          dateValue,
          dateLabel,
        });
        next.set(row._id, list);
      }
    }

    for (const [, list] of next.entries()) {
      list.sort((a, b) => {
        if (!a.dateValue && !b.dateValue) return 0;
        if (!a.dateValue) return 1;
        if (!b.dateValue) return -1;
        return (
          new Date(a.dateValue).getTime() - new Date(b.dateValue).getTime()
        );
      });
    }

    return next;
  }, [
    currentUserId,
    messageAuthorField,
    messageDateField,
    messageIdField,
    messageMentionsField,
    messageMentionSeenField,
    messagesField,
    rowsState,
  ]);

  React.useEffect(() => {
    setSeenMentionIdsByChannel((prev) => {
      const next: Record<string, Array<string>> = {};
      let changed = false;

      const channelIds = new Set([
        ...Object.keys(prev),
        ...Array.from(mentionAlertsByChannel.keys()),
      ]);

      for (const channelId of channelIds) {
        const mentionIds = (mentionAlertsByChannel.get(channelId) ?? []).map(
          (alert) => alert.messageId,
        );
        const mentionSet = new Set(mentionIds);
        let prevIds: Array<string> = [];
        if (Array.isArray(prev[channelId])) prevIds = prev[channelId];
        const seenIds = prevIds.filter((id) => mentionSet.has(id));

        if (seenIds.length > 0) next[channelId] = seenIds;

        if (
          seenIds.length !== prevIds.length ||
          seenIds.some((id, idx) => prevIds[idx] !== id)
        ) {
          changed = true;
        }
      }

      if (!changed && Object.keys(next).length === Object.keys(prev).length) {
        return prev;
      }

      return next;
    });
  }, [mentionAlertsByChannel]);

  const clearMentionAlert = React.useCallback(
    (channelId: string, messageId: string): void => {
      setSeenMentionIdsByChannel((prev): Record<string, Array<string>> => {
        const current = prev[channelId] ?? [];
        if (current.includes(messageId)) return prev;
        const nextChannelIds = [...current, messageId];
        const next = { ...prev };
        next[channelId] = nextChannelIds;
        return next;
      });

      void (async (): Promise<void> => {
        try {
          const updatedRow = await API.put<IRow>(
            `/tables/${tableSlug}/rows/${channelId}/forum/messages/${messageId}/mention-read`,
          );
          setRowsState(
            (prev): Array<IRow> =>
              prev.map((row) => {
                if (row._id === updatedRow.data._id) return updatedRow.data;
                return row;
              }),
          );
        } catch {
          // Keep local "seen" fallback even if server persist fails.
        }
      })();
    },
    [tableSlug],
  );

  const updateRow = useUpdateTableRow({
    onSuccess(updatedRow) {
      setRowsState((prev) =>
        prev.map((row) => {
          if (row._id === updatedRow._id) return updatedRow;
          return row;
        }),
      );
    },
    onError() {
      toast.error('Erro ao atualizar mensagens', {
        description: 'Nao foi possivel atualizar o canal',
      });
    },
  });

  const createRow = useCreateTableRow({
    onSuccess(newRow) {
      setRowsState((prev) => [...prev, newRow]);
      setActiveRowId(newRow._id);
      addChannelDialog.close();
      toast.success('Canal criado', {
        description: 'O canal foi criado com sucesso',
      });
    },
    onError() {
      toast.error('Erro ao criar canal', {
        description: 'Nao foi possivel criar o canal',
      });
    },
  });

  const composerForm = useAppForm({
    defaultValues: {
      text: '',
      mentions: Array<string>(),
      files: Array<File>(),
    },
  });

  const composerText = useStore(
    composerForm.store,
    (state) => state.values.text,
  );
  const composerMentions = useStore(
    composerForm.store,
    (state) => state.values.mentions,
  );
  const composerFiles = useStore(
    composerForm.store,
    (state) => state.values.files,
  );

  const addChannelForm = useAppForm({
    defaultValues: {
      label: '',
      description: '',
      privacy: 'publico',
      members: Array<string>(),
    },
    onSubmit: async ({ value }) => {
      if (!channelField) return;
      const label = value.label.trim();
      if (!label || createRow.status === 'pending') return;
      const members = Array.from(new Set(value.members.filter(Boolean)));

      const description = value.description.trim();
      const payload: Record<string, unknown> = {
        [channelField.slug]: label,
      };
      if (channelDescriptionField && description) {
        payload[channelDescriptionField.slug] = description;
      }
      if (channelPrivacyField) {
        let privacyValue = 'publico';
        if (value.privacy === 'privado') privacyValue = 'privado';
        payload[channelPrivacyField.slug] = [privacyValue];
      }
      if (channelMembersField && value.privacy === 'privado') {
        payload[channelMembersField.slug] = members;
      }

      await createRow.mutateAsync({
        slug: tableSlug,
        data: payload,
      });
    },
  });

  const addChannelLabel = useStore(
    addChannelForm.store,
    (state) => state.values.label,
  );

  const editChannelForm = useAppForm({
    defaultValues: {
      label: '',
      description: '',
      privacy: 'publico',
      members: Array<string>(),
    },
    onSubmit: async ({ value }) => {
      if (!channelField || !editingChannelId) return;
      const label = value.label.trim();
      if (!label || updateRow.status === 'pending') return;
      if (!editingChannelRow || !canManageChannel(editingChannelRow)) {
        toast.warning('Apenas o criador pode editar este canal');
        return;
      }
      const members = Array.from(new Set(value.members.filter(Boolean)));

      const description = value.description.trim();
      const payload: Record<string, unknown> = {
        [channelField.slug]: label,
      };
      if (channelDescriptionField) {
        payload[channelDescriptionField.slug] = description || '';
      }
      if (channelPrivacyField) {
        let privacyValue = 'publico';
        if (value.privacy === 'privado') privacyValue = 'privado';
        payload[channelPrivacyField.slug] = [privacyValue];
      }
      if (channelMembersField && value.privacy === 'privado') {
        payload[channelMembersField.slug] = members;
      }

      await updateRow.mutateAsync({
        slug: tableSlug,
        rowId: editingChannelId,
        data: payload,
      });
      editChannelDialog.close();
      setEditingChannelId(null);
      toast.success('Canal atualizado', {
        description: 'O canal foi atualizado com sucesso',
      });
    },
  });

  const editChannelLabel = useStore(
    editChannelForm.store,
    (state) => state.values.label,
  );

  const resetComposer = React.useCallback(() => {
    setComposerStorages([]);
    composerForm.reset({
      text: '',
      mentions: [],
      files: [],
    });
    setReplyToId(null);
    setEditingIndex(null);
  }, [composerForm]);

  const resolveChannelLabel = React.useCallback(
    (row: IRow): string => {
      if (channelField && row[channelField.slug] !== undefined) {
        return String(row[channelField.slug] ?? '');
      }
      if (typeof row['canal'] === 'string') return String(row['canal'] ?? '');
      if (typeof row['titulo'] === 'string') return String(row['titulo'] ?? '');
      return '';
    },
    [channelField],
  );

  const resolveChannelDescription = React.useCallback(
    (row: IRow): string => {
      if (
        channelDescriptionField &&
        typeof row[channelDescriptionField.slug] === 'string'
      ) {
        return String(row[channelDescriptionField.slug] ?? '');
      }
      if (typeof row['descricao'] === 'string') {
        return String(row['descricao'] ?? '');
      }
      return '';
    },
    [channelDescriptionField],
  );

  const refreshChannels = React.useCallback(async () => {
    if (channelsPollingRef.current.inFlight) return;
    channelsPollingRef.current.inFlight = true;
    try {
      const response = await API.get<Paginated<IRow>>(
        `/tables/${tableSlug}/rows/paginated`,
        {
          params: {
            page: 1,
            perPage: 100,
            trashed: false,
          },
        },
      );
      let nextRows: typeof rowsState = [];
      if (Array.isArray(response.data?.data)) nextRows = response.data.data;
      setRowsState(nextRows);
    } finally {
      channelsPollingRef.current.inFlight = false;
    }
  }, [tableSlug]);

  const refreshRowById = React.useCallback(
    async (rowId: string) => {
      if (!rowId) return;
      if (pollingRef.current.inFlight && pollingRef.current.rowId === rowId) {
        return;
      }
      pollingRef.current.inFlight = true;
      pollingRef.current.rowId = rowId;
      try {
        const response = await API.get<IRow>(
          `/tables/${tableSlug}/rows/${rowId}`,
        );
        const row = response.data;
        if (!row || row._id !== rowId) return;
        setRowsState((prev) =>
          prev.map((item) => {
            if (item._id === rowId) return row;
            return item;
          }),
        );
      } finally {
        pollingRef.current.inFlight = false;
        pollingRef.current.rowId = null;
      }
    },
    [tableSlug],
  );

  React.useEffect(() => {
    return forumPollingStrategy.subscribeChannels({
      enabled: true,
      intervalMs: FORUM_SYNC_INTERVAL_MS,
      onSync: () => {
        void refreshChannels();
      },
    });
  }, [refreshChannels]);

  React.useEffect(() => {
    return forumPollingStrategy.subscribeActiveChannel({
      enabled: Boolean(activeRowId),
      intervalMs: FORUM_SYNC_INTERVAL_MS,
      onSync: () => {
        if (!activeRowId) return;
        void refreshRowById(activeRowId);
      },
    });
  }, [activeRowId, refreshRowById]);

  const handleSelectRow = React.useCallback(
    (rowId: string) => {
      const row = rowsState.find((item) => item._id === rowId);
      if (!row) return;
      if (!canAccessChannel(row)) {
        toast.warning('Canal privado', {
          description: 'Apenas membros deste canal podem acessar as mensagens',
        });
        return;
      }
      setActiveRowId(rowId);
      refreshRowById(rowId);
    },
    [canAccessChannel, refreshRowById, rowsState],
  );

  const handleChannelEdit = React.useCallback(
    (row: IRow) => {
      if (!canManageChannel(row)) {
        toast.warning('Apenas o criador pode editar este canal');
        return;
      }
      const label = resolveChannelLabel(row);
      const description = resolveChannelDescription(row);
      let privacy = 'publico';
      if (channelPrivacyField) {
        const raw = row[channelPrivacyField.slug];
        if (Array.isArray(raw)) privacy = String(raw?.[0] ?? 'publico');
        else privacy = String(raw ?? 'publico');
      }
      let members: Array<string> = [];
      if (channelMembersField) {
        members = normalizeIdList(row[channelMembersField.slug]);
      }
      editChannelForm.reset({ label, description, privacy, members });
      editChannelForm.setFieldValue('label', label);
      editChannelForm.setFieldValue('description', description);
      editChannelForm.setFieldValue('privacy', privacy);
      editChannelForm.setFieldValue('members', members);
      setEditingChannelId(row._id);
      setEditingChannelRow(row);
      editChannelTriggerRef.current?.click();
    },
    [
      canManageChannel,
      channelMembersField,
      channelPrivacyField,
      editChannelForm,
      resolveChannelDescription,
      resolveChannelLabel,
    ],
  );

  const handleChannelDelete = React.useCallback(
    async (rowId: string, close: () => void) => {
      const row = rowsState.find((item) => item._id === rowId);
      if (!row || !canManageChannel(row)) {
        toast.warning('Apenas o criador pode editar este canal');
        close();
        return;
      }
      await API.delete(`/tables/${tableSlug}/rows/${rowId}`);
      setRowsState((prev) => {
        const nextRows = prev.filter((channelRow) => channelRow._id !== rowId);
        setActiveRowId((current) => {
          if (current !== rowId) return current;
          return nextRows[0]?._id ?? null;
        });
        return nextRows;
      });
      close();
    },
    [canManageChannel, rowsState, tableSlug],
  );

  React.useEffect(() => {
    if (deleteChannelTarget) deleteChannelTriggerRef.current?.click();
  }, [deleteChannelTarget]);

  React.useEffect(() => {
    if (deleteMessageTarget) deleteMessageTriggerRef.current?.click();
  }, [deleteMessageTarget]);

  const buildMessagesPayload = React.useCallback(
    (messagesValue: Array<Record<string, unknown>>) => {
      if (!messagesField) return [];
      return messagesValue.map((message) => {
        let messageRecord: Record<string, unknown> = {};
        if (isRecord(message)) messageRecord = message;
        const payload: Record<string, unknown> = {};
        for (const field of resolvedGroupFields) {
          if (field.slug === messageIdField?.slug) {
            const existingId = normalizeId(messageRecord[field.slug]);
            payload[field.slug] = existingId ?? crypto.randomUUID();
            continue;
          }

          if (field.slug === messageAuthorField?.slug) {
            let authorFallback: Array<string> = [];
            if (currentUserId) authorFallback = [currentUserId];
            const authorValue = messageRecord[field.slug] ?? authorFallback;
            payload[field.slug] = normalizeGroupFieldValue(field, authorValue);
            continue;
          }

          if (field.slug === messageDateField?.slug) {
            const dateValue =
              messageRecord[field.slug] ?? new Date().toISOString();
            payload[field.slug] = normalizeGroupFieldValue(field, dateValue);
            continue;
          }

          payload[field.slug] = normalizeGroupFieldValue(
            field,
            messageRecord[field.slug],
          );
        }
        return payload;
      });
    },
    [
      currentUserId,
      messageAuthorField?.slug,
      messageDateField?.slug,
      messageIdField?.slug,
      messagesField,
      resolvedGroupFields,
    ],
  );

  const applyMessagesUpdate = React.useCallback(
    async (nextMessages: Array<Record<string, unknown>>) => {
      if (!activeRow || !messagesField) return;
      const payload = buildMessagesPayload(nextMessages);
      await updateRow.mutateAsync({
        slug: tableSlug,
        rowId: activeRow._id,
        data: {
          [messagesField.slug]: payload,
        },
      });
    },
    [activeRow, buildMessagesPayload, messagesField, tableSlug, updateRow],
  );

  const handleSend = React.useCallback(async () => {
    if (!activeRow || !messagesField) return;
    if (!canAccessChannel(activeRow)) {
      toast.warning('Apenas membros deste canal podem enviar mensagens');
      return;
    }
    if (!currentUserId) {
      toast.warning('Usuario nao identificado');
      return;
    }

    const { text: formText, mentions: formMentions } =
      composerForm.state.values;
    const editorMentionIds = extractMentionIds(composerEditorRef.current);
    const mentions = Array.from(
      new Set([...editorMentionIds, ...formMentions]),
    );
    const hasText = stripHtml(formText).length > 0;
    const hasAttachments = composerStorages.length > 0;

    if (!hasText && !hasAttachments) {
      toast.warning('Escreva uma mensagem ou adicione um anexo');
      return;
    }

    try {
      const attachments = composerStorages.map((storage) => storage._id);
      const payload = {
        text: formText || '',
        mentions,
        attachments,
        replyTo: replyToId ?? null,
      };

      if (editingIndex !== null) {
        const editingMessage = messages[editingIndex];
        if (!editingMessage) return;
        await API.put(
          `/tables/${tableSlug}/rows/${activeRow._id}/forum/messages/${editingMessage.id}`,
          payload,
        );
      } else {
        await API.post(
          `/tables/${tableSlug}/rows/${activeRow._id}/forum/messages`,
          payload,
        );
      }

      await refreshRowById(activeRow._id);
      resetComposer();
      bumpFocus();
    } catch {
      toast.error('Erro ao enviar mensagem', {
        description: 'Nao foi possivel salvar a mensagem neste canal',
      });
    }
  }, [
    activeRow,
    composerForm.state.values,
    composerStorages,
    currentUserId,
    editingIndex,
    messages,
    messagesField,
    refreshRowById,
    replyToId,
    resetComposer,
    bumpFocus,
    canAccessChannel,
    tableSlug,
  ]);

  const handleEditorReady = React.useCallback((editor: TiptapEditor): void => {
    composerEditorRef.current = editor;
  }, []);

  const handleDelete = React.useCallback(
    async (index: number, close: () => void) => {
      if (!activeRow) return;
      const message = messages[index];
      if (!message) return;

      try {
        await API.delete(
          `/tables/${tableSlug}/rows/${activeRow._id}/forum/messages/${message.id}`,
        );
        await refreshRowById(activeRow._id);
        close();
      } catch {
        toast.error('Erro ao excluir mensagem', {
          description: 'Voce so pode excluir mensagens enviadas por voce',
        });
      }
    },
    [activeRow, messages, refreshRowById, tableSlug],
  );

  const handleStartEdit = React.useCallback(
    (index: number) => {
      const message = messages[index];
      const mentionIds = message.mentions
        .map((mention) => normalizeId(mention))
        .filter((item): item is string => Boolean(item));
      composerForm.reset({
        text: message.text || '',
        mentions: mentionIds,
        files: [],
      });
      composerForm.setFieldValue('text', message.text || '');
      setComposerStorages(message.attachments);
      setReplyToId(message.replyTo ?? null);
      setEditingIndex(index);
      bumpFocus();
    },
    [bumpFocus, composerForm, messages],
  );

  const toggleReaction = React.useCallback(
    async (messageIndex: number, emoji: string) => {
      if (!currentUserId || !messageReactionsField) return;
      const message = messages[messageIndex];
      const entries = [...message.reactions];
      const existing = entries.find((entry) => entry.emoji === emoji);
      if (!existing) {
        entries.push({ emoji, users: [currentUserId] });
      } else {
        const hasUser = existing.users.includes(currentUserId);
        if (hasUser) {
          existing.users = existing.users.filter((id) => id !== currentUserId);
        } else {
          existing.users = [...existing.users, currentUserId];
        }
      }

      const nextMessages = [...rawMessages];
      const rawBase = rawMessages[messageIndex];
      let baseRecord: Record<string, unknown> = {};
      if (isRecord(rawBase)) baseRecord = rawBase;
      const base = {
        ...baseRecord,
        [messageReactionsField.slug]: serializeReactions(entries),
      };
      nextMessages[messageIndex] = base;
      await applyMessagesUpdate(nextMessages);
    },
    [
      applyMessagesUpdate,
      currentUserId,
      messageReactionsField,
      messages,
      rawMessages,
    ],
  );

  React.useEffect(() => {
    if (!messagesEndRef.current) return;
    messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [activeRowId, messages.length]);

  React.useEffect(() => {
    setMentionJumpMessageId(null);
    setHighlightMentionMessageId(null);
  }, [activeRowId]);

  const unseenMentionIdsByChannel = React.useMemo(() => {
    const next: Record<string, Array<string>> = {};

    for (const [channelId, alerts] of mentionAlertsByChannel.entries()) {
      const seenIds = new Set(seenMentionIdsByChannel[channelId] ?? []);
      const unseenIds = alerts
        .map((alert) => alert.messageId)
        .filter((messageId) => !seenIds.has(messageId));
      if (unseenIds.length > 0) next[channelId] = unseenIds;
    }

    return next;
  }, [mentionAlertsByChannel, seenMentionIdsByChannel]);

  const mentionCountByRowId = React.useMemo(
    () =>
      Object.fromEntries(
        Object.entries(unseenMentionIdsByChannel).map(([channelId, ids]) => [
          channelId,
          ids.length,
        ]),
      ),
    [unseenMentionIdsByChannel],
  );

  const activeChannelMentionAlerts = React.useMemo(() => {
    if (!activeRowId) return [];
    const unseenIds = unseenMentionIdsByChannel[activeRowId] ?? [];
    if (unseenIds.length === 0) return [];
    const alertMap = new Map(
      (mentionAlertsByChannel.get(activeRowId) ?? []).map((alert) => [
        alert.messageId,
        alert,
      ]),
    );
    return unseenIds
      .map((id) => alertMap.get(id))
      .filter((item): item is ForumMentionAlert => Boolean(item));
  }, [activeRowId, mentionAlertsByChannel, unseenMentionIdsByChannel]);

  const activeChannelPrimaryMentionAlert =
    activeChannelMentionAlerts[0] ?? null;

  const handleMentionMessageVisible = React.useCallback(
    (messageId: string) => {
      if (!activeRowId) return;
      clearMentionAlert(activeRowId, messageId);
      if (mentionJumpMessageId === messageId) {
        setMentionJumpMessageId(null);
      }
      if (highlightMentionMessageId === messageId) {
        setHighlightMentionMessageId(null);
      }
    },
    [
      activeRowId,
      clearMentionAlert,
      highlightMentionMessageId,
      mentionJumpMessageId,
    ],
  );

  let channelTitle = 'Canal';
  if (activeRow && channelField) {
    channelTitle = String(activeRow[channelField.slug] ?? 'Canal');
  }
  let channelDescription = '';
  if (activeRow && typeof activeRow['descricao'] === 'string') {
    channelDescription = activeRow['descricao'];
  }
  let replyMessage: (typeof messages)[number] | null = null;
  if (replyToId) {
    replyMessage = messages.find((message) => message.id === replyToId) ?? null;
  }

  return (
    <div
      className="flex h-full min-h-0 overflow-hidden"
      data-test-id="table-forum-view"
    >
      <ForumSidebar
        rows={rowsState}
        activeRowId={activeRowId}
        channelField={channelField}
        canAddChannel={canAddChannel}
        isOpen={isSidebarOpen}
        onToggleOpen={() => setIsSidebarOpen((value) => !value)}
        onAddChannel={() => {
          addChannelForm.reset({
            label: '',
            description: '',
            privacy: 'publico',
            members: [],
          });
          addChannelTriggerRef.current?.click();
        }}
        onSelectRow={handleSelectRow}
        canAccessRow={canAccessChannel}
        canManageRow={canManageChannel}
        onEditRow={handleChannelEdit}
        onDeleteRow={(row) =>
          setDeleteChannelTarget((prev) => ({
            id: row._id,
            nonce: (prev?.nonce ?? 0) + 1,
          }))
        }
        mentionCountByRowId={mentionCountByRowId}
      />

      <ForumAddChannelDialog
        ref={addChannelTriggerRef}
        form={addChannelForm}
        closeRef={addChannelDialog.closeRef}
        isPending={createRow.status === 'pending'}
        labelValue={addChannelLabel}
        requiresMembers={Boolean(channelMembersField)}
        requiresPrivacy={Boolean(channelPrivacyField)}
      />

      <ForumEditChannelDialog
        key={editingChannelId ?? 'edit-channel'}
        ref={editChannelTriggerRef}
        form={editChannelForm}
        closeRef={editChannelDialog.closeRef}
        isPending={updateRow.status === 'pending'}
        labelValue={editChannelLabel}
        requiresMembers={Boolean(channelMembersField)}
        requiresPrivacy={Boolean(channelPrivacyField)}
      />

      <ForumDeleteChannelDialog
        key={deleteChannelTarget?.nonce ?? 'delete-channel'}
        ref={deleteChannelTriggerRef}
        onConfirm={(close) => {
          const id = deleteChannelTarget?.id;
          if (!id) return;
          void handleChannelDelete(id, close);
        }}
      />

      <ForumDeleteMessageDialog
        key={deleteMessageTarget?.nonce ?? 'delete-message'}
        ref={deleteMessageTriggerRef}
        onConfirm={(close) => {
          const index = deleteMessageTarget?.index;
          if (index === undefined) return;
          void handleDelete(index, close);
        }}
      />

      <section className="flex-1 flex flex-col min-h-0 min-w-0">
        <ForumHeader
          title={channelTitle}
          description={channelDescription}
          composerLayout={composerLayout}
          onChangeLayout={setComposerLayout}
        />

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col min-h-0"
        >
          {activeRow && (
            <TabsList className="shrink-0 mx-3 mt-3">
              <TabsTrigger
                value="chat"
                className="cursor-pointer"
              >
                Mensagens
              </TabsTrigger>
              <TabsTrigger
                value="docs"
                className="cursor-pointer"
              >
                Documentos
              </TabsTrigger>
            </TabsList>
          )}

          <TabsContent
            value="chat"
            className="flex-1 flex flex-col min-h-0"
          >
            {activeRow && (
              <div
                className={cn(
                  'flex-1 min-h-0 relative',
                  composerLayout === 'side' && 'flex',
                  composerLayout !== 'side' && 'flex flex-col',
                )}
              >
                <ForumMessagesList
                  messages={messages}
                  currentUserId={currentUserId}
                  endRef={messagesEndRef}
                  onReply={setReplyToId}
                  onEdit={handleStartEdit}
                  onDelete={(index) =>
                    setDeleteMessageTarget((prev) => ({
                      index,
                      nonce: (prev?.nonce ?? 0) + 1,
                    }))
                  }
                  onToggleReaction={toggleReaction}
                  trackedMentionMessageIds={
                    (activeRowId && unseenMentionIdsByChannel[activeRowId]) ||
                    undefined
                  }
                  onMentionMessageVisible={handleMentionMessageVisible}
                  scrollToMessageId={mentionJumpMessageId}
                  scrollToMessageTick={mentionJumpTick}
                  highlightedMessageId={highlightMentionMessageId}
                  highlightedMessageTick={highlightMentionTick}
                />

                {activeTab === 'chat' && activeChannelPrimaryMentionAlert && (
                  <div
                    className={cn(
                      'absolute z-20 right-4',
                      composerLayout === 'bottom' && 'bottom-24',
                      composerLayout !== 'bottom' && 'bottom-4',
                    )}
                  >
                    <Button
                      type="button"
                      size="sm"
                      className="cursor-pointer shadow-lg"
                      onClick={() => {
                        setMentionJumpMessageId(
                          activeChannelPrimaryMentionAlert.messageId,
                        );
                        setMentionJumpTick((value) => value + 1);
                        setHighlightMentionMessageId(
                          activeChannelPrimaryMentionAlert.messageId,
                        );
                        setHighlightMentionTick((value) => value + 1);
                      }}
                    >
                      <AtSignIcon className="size-4" />
                      <span>
                        Mencionado
                        {activeChannelPrimaryMentionAlert.dateLabel &&
                          ` • ${activeChannelPrimaryMentionAlert.dateLabel}`}
                      </span>
                      <ArrowDownIcon className="size-4" />
                    </Button>
                  </div>
                )}

                <ForumComposer
                  composerLayout={composerLayout}
                  composerText={composerText}
                  onTextChange={(value) =>
                    composerForm.setFieldValue('text', value)
                  }
                  focusKey={focusTick}
                  replyMessage={replyMessage}
                  onCancelReply={() => setReplyToId(null)}
                  composerStorages={composerStorages}
                  onRemoveStorage={(storageId) =>
                    setComposerStorages((prev) =>
                      prev.filter((item) => item._id !== storageId),
                    )
                  }
                  composerMentions={composerMentions}
                  onMentionsChange={(value) =>
                    composerForm.setFieldValue('mentions', value)
                  }
                  composerFiles={composerFiles}
                  onFilesChange={(value) =>
                    composerForm.setFieldValue('files', value)
                  }
                  onStoragesChange={(storages) =>
                    setComposerStorages((prev) => {
                      const map = new Map(prev.map((item) => [item._id, item]));
                      storages.forEach((item) => map.set(item._id, item));
                      return Array.from(map.values());
                    })
                  }
                  onSend={handleSend}
                  isEditing={editingIndex !== null}
                  onCancelEdit={resetComposer}
                  onEditorReady={handleEditorReady}
                />
              </div>
            )}
            {!activeRow && (
              <div className="flex flex-1 items-center justify-center">
                <p className="text-sm text-muted-foreground">
                  Selecione um canal para ver as mensagens.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent
            value="docs"
            className="flex-1 overflow-auto p-4"
          >
            {activeRow && (
              <>
                <ForumDocuments documents={documents} />
                {documents.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Nenhum documento anexado.
                  </p>
                )}
              </>
            )}
            {!activeRow && (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-muted-foreground">
                  Selecione um canal para ver os documentos.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
}
