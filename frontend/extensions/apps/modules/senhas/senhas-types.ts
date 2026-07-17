// Espelho dos tipos do backend (apps/modules/senhas).

export type IPasswordUserRef = {
  _id: string;
  name: string;
  email: string;
};

export type IPasswordChannel = {
  _id: string;
  name: string;
  description: string | null;
  private: boolean;
  owner: IPasswordUserRef | string;
  members: Array<IPasswordUserRef | string>;
  entriesCount: number;
  createdAt: string;
  updatedAt: string;
};

export type IPasswordEntry = {
  _id: string;
  channel: string;
  title: string;
  username: string | null;
  url: string | null;
  secret: string;
  notes: string | null;
  author: IPasswordUserRef | string;
  createdAt: string;
  updatedAt: string;
};

export type ChannelFormValues = {
  name: string;
  description: string;
  private: boolean;
  members: Array<string>;
};

export type EntryFormValues = {
  title: string;
  username: string;
  url: string;
  secret: string;
  notes: string;
};

export function refId(ref: IPasswordUserRef | string): string {
  if (typeof ref === 'string') return ref;
  return ref._id;
}

export function refName(ref: IPasswordUserRef | string): string {
  if (typeof ref === 'string') return ref;
  return ref.name;
}
