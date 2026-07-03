import type { LinkProps } from '@tanstack/react-router';

import { E_MENU_ITEM_TYPE } from '@/lib/constant';
import type { IMenu } from '@/lib/interfaces';

export type InitialMenuRoute =
  | { type: 'internal'; to: LinkProps['to'] }
  | { type: 'external'; href: string };

function getParentId(menu: IMenu): string | null {
  if (!menu.parent) return null;
  if (typeof menu.parent === 'string') return menu.parent;
  return menu.parent._id;
}

function sortByPosition(menus: Array<IMenu>): Array<IMenu> {
  return [...menus].sort((a, b) => {
    const orderDiff = (a.order ?? 0) - (b.order ?? 0);
    if (orderDiff !== 0) return orderDiff;
    return a.name.localeCompare(b.name);
  });
}

function buildChildrenByParent(
  menus: Array<IMenu>,
): Map<string | null, Array<IMenu>> {
  const menuIds = new Set(menus.map((menu) => menu._id));
  const childrenByParent = new Map<string | null, Array<IMenu>>();

  for (const menu of menus) {
    const parentId = getParentId(menu);
    let groupKey: string | null = null;
    if (parentId && menuIds.has(parentId)) groupKey = parentId;
    const siblings = childrenByParent.get(groupKey) ?? [];

    siblings.push(menu);
    childrenByParent.set(groupKey, siblings);
  }

  return childrenByParent;
}

function toInitialRoute(menu: IMenu): InitialMenuRoute | null {
  if (!menu.url) return null;

  if (
    menu.type === E_MENU_ITEM_TYPE.EXTERNAL &&
    /^https?:\/\//i.test(menu.url)
  ) {
    return { type: 'external', href: menu.url };
  }

  return {
    type: 'internal',
    // URL vem do backend como string; o router exige a união literal de rotas.
    to: menu.url.replace(/\/$/, '') as LinkProps['to'],
  };
}

function findFirstNavigableDescendant(
  menu: IMenu,
  childrenByParent: Map<string | null, Array<IMenu>>,
): IMenu | null {
  const children = sortByPosition(childrenByParent.get(menu._id) ?? []);

  for (const child of children) {
    const childRoute = toInitialRoute(child);
    if (childRoute) return child;

    const descendant = findFirstNavigableDescendant(child, childrenByParent);
    if (descendant) return descendant;
  }

  return null;
}

export function resolveInitialMenuRoute(
  menus: Array<IMenu>,
): InitialMenuRoute | null {
  const activeMenus = menus.filter((menu) => !menu.trashed);
  const initialMenu = activeMenus.find((menu) => menu.isInitial);

  if (!initialMenu) return null;

  const directRoute = toInitialRoute(initialMenu);
  if (directRoute) return directRoute;

  const childrenByParent = buildChildrenByParent(activeMenus);
  const firstDescendant = findFirstNavigableDescendant(
    initialMenu,
    childrenByParent,
  );

  if (firstDescendant) return toInitialRoute(firstDescendant);
  return null;
}
