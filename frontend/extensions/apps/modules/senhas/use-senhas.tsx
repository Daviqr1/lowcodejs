import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import type {
  ChannelFormValues,
  EntryFormValues,
  IPasswordChannel,
  IPasswordEntry,
} from './senhas-types';

import { API } from '@/lib/api';

const BASE = '/e/apps/senhas';

const keys = {
  channels: ['extensions', 'apps', 'senhas', 'channels'] as const,
  entries: (channelId: string) =>
    ['extensions', 'apps', 'senhas', 'channels', channelId, 'entries'] as const,
};

function channelPayload(values: ChannelFormValues): Record<string, unknown> {
  return {
    name: values.name,
    description: values.description.trim() || null,
    private: values.private,
    members: values.members,
  };
}

function entryPayload(values: EntryFormValues): Record<string, unknown> {
  let notes: string | null = null;
  if (values.notes.trim()) notes = values.notes;
  return {
    title: values.title,
    username: values.username.trim() || null,
    url: values.url.trim() || null,
    secret: values.secret,
    notes,
  };
}

export function useChannels(): UseQueryResult<Array<IPasswordChannel>, Error> {
  return useQuery({
    queryKey: keys.channels,
    queryFn: async () => {
      const response = await API.get<Array<IPasswordChannel>>(
        `${BASE}/channels`,
      );
      return response.data;
    },
  });
}

export function useEntries(
  channelId: string | null,
): UseQueryResult<Array<IPasswordEntry>, Error> {
  return useQuery({
    queryKey: keys.entries(channelId ?? '__none__'),
    enabled: Boolean(channelId),
    queryFn: async () => {
      const response = await API.get<Array<IPasswordEntry>>(
        `${BASE}/channels/${channelId}/entries`,
      );
      return response.data;
    },
  });
}

export function useCreateChannel(): ReturnType<
  typeof useMutation<IPasswordChannel, Error, ChannelFormValues>
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: ChannelFormValues) => {
      const response = await API.post<IPasswordChannel>(
        `${BASE}/channels`,
        channelPayload(values),
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.channels });
    },
  });
}

export function useUpdateChannel(): ReturnType<
  typeof useMutation<
    IPasswordChannel,
    Error,
    { channelId: string; values: ChannelFormValues }
  >
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ channelId, values }) => {
      const response = await API.put<IPasswordChannel>(
        `${BASE}/channels/${channelId}`,
        channelPayload(values),
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.channels });
    },
  });
}

export function useDeleteChannel(): ReturnType<
  typeof useMutation<{ _id: string }, Error, string>
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (channelId: string) => {
      const response = await API.delete<{ _id: string }>(
        `${BASE}/channels/${channelId}`,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.channels });
    },
  });
}

export function useCreateEntry(
  channelId: string,
): ReturnType<typeof useMutation<IPasswordEntry, Error, EntryFormValues>> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: EntryFormValues) => {
      const response = await API.post<IPasswordEntry>(
        `${BASE}/channels/${channelId}/entries`,
        entryPayload(values),
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.entries(channelId) });
      queryClient.invalidateQueries({ queryKey: keys.channels });
    },
  });
}

export function useUpdateEntry(
  channelId: string,
): ReturnType<
  typeof useMutation<
    IPasswordEntry,
    Error,
    { entryId: string; values: EntryFormValues }
  >
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ entryId, values }) => {
      const response = await API.put<IPasswordEntry>(
        `${BASE}/channels/${channelId}/entries/${entryId}`,
        entryPayload(values),
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.entries(channelId) });
    },
  });
}

export function useDeleteEntry(
  channelId: string,
): ReturnType<typeof useMutation<{ _id: string }, Error, string>> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (entryId: string) => {
      const response = await API.delete<{ _id: string }>(
        `${BASE}/channels/${channelId}/entries/${entryId}`,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.entries(channelId) });
      queryClient.invalidateQueries({ queryKey: keys.channels });
    },
  });
}
