import { describe, expect, it } from 'vitest';

import type { IMenu } from '@application/core/entity.core';
import {
  E_MENU_ITEM_TYPE,
  E_PERMISSION_TARGET,
} from '@application/core/entity.core';
import UserGroupInMemoryRepository from '@application/repositories/user-group/user-group-in-memory.repository';
import GroupResolverService from '@application/services/group-resolver/group-resolver.service';
import PermissionService from '@application/services/permission/permission.service';

import MenuVisibilityService from './menu-visibility.service';

function makeMenu(overrides: Partial<IMenu>): IMenu {
  // Mock parcial de spec: o service so le _id, parent e visibility.
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return {
    _id: 'menu-id',
    name: 'Menu',
    slug: 'menu',
    type: E_MENU_ITEM_TYPE.PAGE,
    parent: null,
    visibility: null,
    order: 0,
    createdAt: new Date(),
    updatedAt: null,
    trashedAt: null,
    trashed: false,
    ...overrides,
  } as IMenu;
}

describe('MenuVisibilityService', () => {
  const sut = new MenuVisibilityService(
    new PermissionService(
      new GroupResolverService(new UserGroupInMemoryRepository()),
    ),
  );
  const groups = new Set(['grupo-a']);

  describe('bindingAllows', () => {
    it('trata binding ausente como visivel (menu legado)', () => {
      expect(sut.bindingAllows(null, groups)).toBe(true);
      expect(sut.bindingAllows(undefined, groups)).toBe(true);
    });

    it('respeita PUBLIC e NOBODY', () => {
      expect(
        sut.bindingAllows(
          { kind: E_PERMISSION_TARGET.PUBLIC, group: null },
          groups,
        ),
      ).toBe(true);
      expect(
        sut.bindingAllows(
          { kind: E_PERMISSION_TARGET.NOBODY, group: null },
          groups,
        ),
      ).toBe(false);
    });

    it('em GROUP libera so para quem esta no fecho', () => {
      const binding = { kind: E_PERMISSION_TARGET.GROUP, group: 'grupo-a' };
      expect(sut.bindingAllows(binding, groups)).toBe(true);
      expect(sut.bindingAllows(binding, new Set(['grupo-b']))).toBe(false);
    });

    it('em GROUP sem grupo definido nega', () => {
      expect(
        sut.bindingAllows(
          { kind: E_PERMISSION_TARGET.GROUP, group: null },
          groups,
        ),
      ).toBe(false);
    });
  });

  describe('isVisible', () => {
    it('esconde a subarvore quando o pai esta oculto', () => {
      const pai = makeMenu({
        _id: 'pai',
        visibility: { kind: E_PERMISSION_TARGET.NOBODY, group: null },
      });
      const filho = makeMenu({ _id: 'filho', parent: 'pai' });
      const byId = new Map([['pai', pai]]);

      expect(sut.isVisible(filho, byId, groups)).toBe(false);
    });

    it('mostra quando toda a cadeia permite', () => {
      const pai = makeMenu({
        _id: 'pai',
        visibility: { kind: E_PERMISSION_TARGET.PUBLIC, group: null },
      });
      const filho = makeMenu({ _id: 'filho', parent: 'pai' });
      const byId = new Map([['pai', pai]]);

      expect(sut.isVisible(filho, byId, groups)).toBe(true);
    });

    it('nao entra em loop com parent ciclico', () => {
      const a = makeMenu({ _id: 'a', parent: 'b' });
      const b = makeMenu({ _id: 'b', parent: 'a' });
      const byId = new Map([
        ['a', a],
        ['b', b],
      ]);

      expect(sut.isVisible(a, byId, groups)).toBe(true);
    });
  });
});
