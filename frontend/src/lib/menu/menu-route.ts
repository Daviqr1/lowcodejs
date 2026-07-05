import type { LinkProps } from '@tanstack/react-router';

import type { Merge } from '@/lib/interfaces';

export type MenuRouteBaseItem = {
  title: string;
  badge?: string;
  icon?: React.ElementType;
  iconUrl?: string | null;
  type?: string;
};

export type LinkItem = Merge<
  MenuRouteBaseItem,
  {
    url: LinkProps['to'];
    items?: never;
  }
>;

export type CollapsibleItem = Merge<
  MenuRouteBaseItem,
  {
    items: Array<MenuItem>;
    url?: LinkProps['to'];
  }
>;

export type MenuItem = CollapsibleItem | LinkItem;

export type MenuGroupItem = {
  title: string;
  items: Array<MenuItem>;
  isLoading?: boolean;
};

export type MenuRoute = Array<MenuGroupItem>;
