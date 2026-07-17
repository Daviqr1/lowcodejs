import type { Merge } from '@/lib/interfaces';

export type MenuRouteBaseItem = {
  title: string;
  badge?: string;
  icon?: React.ElementType;
  iconUrl?: string | null;
  type?: string;
};

// `url` é uma rota resolvida em runtime (menus do banco, ids de extensão
// interpolados) — string livre, não a união estrita de `LinkProps['to']`. A
// navegação é feita pela sidebar (`<Link>`/`<a>`) a partir dessa string.
export type LinkItem = Merge<
  MenuRouteBaseItem,
  {
    url: string;
    items?: never;
  }
>;

export type CollapsibleItem = Merge<
  MenuRouteBaseItem,
  {
    items: Array<MenuItem>;
    url?: string;
  }
>;

export type MenuItem = CollapsibleItem | LinkItem;

export type MenuGroupItem = {
  title: string;
  items: Array<MenuItem>;
  isLoading?: boolean;
};

export type MenuRoute = Array<MenuGroupItem>;
