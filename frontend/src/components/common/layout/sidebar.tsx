import { Link, useLocation, useRouter } from '@tanstack/react-router';
import { ChevronRightIcon, LogOutIcon } from 'lucide-react';
import React from 'react';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Sidebar as Root,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAuthenticationSignOut } from '@/hooks/tanstack-query/use-authentication-sign-out';
import { useMenuReadList } from '@/hooks/tanstack-query/use-menu-read-list';
import { useSettingRead } from '@/hooks/tanstack-query/use-setting-read';
import { E_MENU_ITEM_TYPE } from '@/lib/constant';
import { handleApiError } from '@/lib/handle-api-error';
import { resolveInitialMenuRoute } from '@/lib/menu/initial-menu-route';
import type { MenuItem, MenuRoute } from '@/lib/menu/menu-route';

type SidebarProps = {
  menu: MenuRoute;
};

const MAX_DEPTH = 4;
const INDENT_PX = 16;

function SidebarLabelTooltip({
  children,
  label,
}: {
  children: React.ReactElement;
  label: string;
}): React.JSX.Element {
  return (
    <Tooltip delayDuration={250}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        side="right"
        align="center"
        sideOffset={8}
        className="max-w-80"
      >
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

function SidebarItemIcon({
  item,
  className = '',
}: {
  item: MenuItem;
  className?: string;
}): React.JSX.Element {
  const wrapper =
    `inline-flex size-4 shrink-0 items-center justify-center ${className}`.trim();

  if (item.iconUrl) {
    return (
      <span
        aria-hidden="true"
        className={wrapper}
      >
        <img
          src={item.iconUrl}
          alt=""
          className="size-full object-contain"
        />
      </span>
    );
  }

  if (item.icon) {
    const Icon = item.icon;
    return (
      <span
        aria-hidden="true"
        className={wrapper}
      >
        <Icon className="text-primary size-4" />
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      className={wrapper}
    />
  );
}

function SidebarMenuItemRecursive({
  item,
  depth,
  location,
  setOpenMobile,
}: {
  item: MenuItem;
  depth: number;
  location: { pathname: string };
  setOpenMobile: (open: boolean) => void;
}): React.JSX.Element {
  // CollapsibleItem with sub-items
  if ('items' in item && item.items && item.items.length > 0) {
    const testId = `sidebar-menu-${item.title.toLowerCase().replace(/\s+/g, '-')}`;
    const hasUrl = Boolean(item.url);

    // Pai com url: rótulo navega (Link/a) e o chevron, como ação separada,
    // apenas alterna o collapsible. Pai sem url: a linha inteira alterna.
    let header: React.ReactNode;

    if (hasUrl) {
      const collapsibleUrl = String(item.url?.toString() ?? '/').replace(
        /\/$/,
        '',
      );
      const isExternal =
        'type' in item && item.type === E_MENU_ITEM_TYPE.EXTERNAL;

      let headerLink: React.ReactNode;
      if (isExternal) {
        headerLink = (
          <a
            href={collapsibleUrl}
            target="_blank"
            rel="noopener noreferrer"
            data-test-id={testId}
            onClick={() => setOpenMobile(false)}
          >
            <SidebarItemIcon item={item} />
            <span className="flex-1 truncate">{item.title}</span>
          </a>
        );
      }
      if (!isExternal) {
        headerLink = (
          <Link
            to={collapsibleUrl}
            data-test-id={testId}
            onClick={() => setOpenMobile(false)}
          >
            <SidebarItemIcon item={item} />
            <span className="flex-1 truncate">{item.title}</span>
          </Link>
        );
      }

      header = (
        <>
          <SidebarMenuButton
            asChild
            tooltip={{ children: item.title, hidden: false }}
            style={{ paddingLeft: `${depth * INDENT_PX + 8}px` }}
          >
            {headerLink}
          </SidebarMenuButton>
          <CollapsibleTrigger asChild>
            <SidebarMenuAction aria-label={`Alternar ${item.title}`}>
              <ChevronRightIcon className="shrink-0 size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
            </SidebarMenuAction>
          </CollapsibleTrigger>
        </>
      );
    }

    if (!hasUrl) {
      header = (
        <CollapsibleTrigger asChild>
          <SidebarMenuButton
            data-test-id={testId}
            tooltip={{ children: item.title, hidden: false }}
            style={{ paddingLeft: `${depth * INDENT_PX + 8}px` }}
          >
            <SidebarItemIcon item={item} />
            <span className="flex-1 truncate">{item.title}</span>
            <ChevronRightIcon className="ml-auto shrink-0 size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
      );
    }

    return (
      <Collapsible
        key={item.title}
        asChild
        className="group/collapsible"
      >
        <SidebarMenuItem>
          {header}
          <CollapsibleContent>
            <SidebarMenuSub className="mx-0 border-l-0 px-0 py-0 translate-x-0">
              {item.items.map((subItem) => {
                // If sub-item has its own children and we haven't hit max depth, recurse
                if (
                  'items' in subItem &&
                  subItem.items &&
                  subItem.items.length > 0 &&
                  depth < MAX_DEPTH
                ) {
                  return (
                    <SidebarMenuSubItem key={subItem.title}>
                      <SidebarMenuItemRecursive
                        item={subItem}
                        depth={depth + 1}
                        location={location}
                        setOpenMobile={setOpenMobile}
                      />
                    </SidebarMenuSubItem>
                  );
                }

                const isExternal =
                  'type' in subItem &&
                  subItem.type === E_MENU_ITEM_TYPE.EXTERNAL;

                const subUrl = String(subItem.url?.toString() ?? '#').replace(
                  /\/$/,
                  '',
                );

                let subItemLink: React.ReactNode;
                if (isExternal) {
                  subItemLink = (
                    <a
                      href={subUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-test-id={`sidebar-menu-${subItem.title.toLowerCase().replace(/\s+/g, '-')}`}
                      onClick={() => setOpenMobile(false)}
                    >
                      <SidebarItemIcon item={subItem} />
                      <span className="flex-1 truncate">{subItem.title}</span>
                    </a>
                  );
                } else {
                  subItemLink = (
                    <Link
                      to={subUrl}
                      data-test-id={`sidebar-menu-${subItem.title.toLowerCase().replace(/\s+/g, '-')}`}
                      onClick={() => setOpenMobile(false)}
                    >
                      <SidebarItemIcon item={subItem} />
                      <span className="flex-1 truncate">{subItem.title}</span>
                    </Link>
                  );
                }

                return (
                  <SidebarMenuSubItem key={subItem.title}>
                    <SidebarLabelTooltip label={subItem.title}>
                      <SidebarMenuSubButton
                        asChild
                        size="md"
                        isActive={!isExternal && location.pathname === subUrl}
                        className="h-8 translate-x-0 text-sm"
                        style={{
                          paddingLeft: `${(depth + 1) * INDENT_PX + 8}px`,
                        }}
                      >
                        {subItemLink}
                      </SidebarMenuSubButton>
                    </SidebarLabelTooltip>
                  </SidebarMenuSubItem>
                );
              })}
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>
    );
  }

  // SEPARATOR sem filhos: renderizar como label estático (sem link, sem collapsible)
  if (
    'type' in item &&
    item.type === E_MENU_ITEM_TYPE.SEPARATOR &&
    (!('items' in item) || !item.items || item.items.length === 0)
  ) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          data-test-id={`sidebar-menu-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
          tooltip={{ children: item.title, hidden: false }}
          style={{ paddingLeft: `${depth * INDENT_PX + 8}px` }}
        >
          <SidebarItemIcon item={item} />
          <span className="flex-1 truncate">{item.title}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  // Simple LinkItem
  const to = String(item.url?.toString() ?? '/').replace(/\/$/, '');
  const isExternal = 'type' in item && item.type === E_MENU_ITEM_TYPE.EXTERNAL;

  let itemLink: React.ReactNode;
  if (isExternal) {
    itemLink = (
      <a
        href={to}
        target="_blank"
        rel="noopener noreferrer"
        data-test-id={`sidebar-menu-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
        onClick={() => setOpenMobile(false)}
      >
        <SidebarItemIcon
          item={item}
          className="group-data-[active=true]:text-primary-foreground"
        />
        <span className="flex-1 truncate">{item.title}</span>
      </a>
    );
  } else {
    itemLink = (
      <Link
        to={to}
        data-test-id={`sidebar-menu-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
        onClick={() => setOpenMobile(false)}
      >
        <SidebarItemIcon
          item={item}
          className="group-data-[active=true]:text-primary-foreground"
        />
        <span className="flex-1 truncate">{item.title}</span>
        {item.badge && (
          <Badge className="ml-auto rounded-full px-1 text-xs">
            {item.badge}
          </Badge>
        )}
      </Link>
    );
  }

  return (
    <SidebarMenuItem key={item.title}>
      <SidebarMenuButton
        asChild
        className="group data-[active=true]:bg-primary data-[active=true]:text-primary-foreground "
        isActive={!isExternal && location.pathname === to}
        tooltip={{ children: item.title, hidden: false }}
        style={{ paddingLeft: `${depth * INDENT_PX + 8}px` }}
      >
        {itemLink}
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function Sidebar({ menu }: SidebarProps): React.JSX.Element {
  const { setOpenMobile } = useSidebar();
  const location = useLocation();

  const router = useRouter();

  const { state } = useSidebar();

  const logoutTriggerRef = React.useRef<HTMLButtonElement | null>(null);

  const setting = useSettingRead();

  const menus = useMenuReadList();

  function goToInitialPage(): void {
    const initialRoute = resolveInitialMenuRoute(menus.data ?? []);

    setOpenMobile(false);

    if (initialRoute?.type === 'external') {
      window.location.assign(initialRoute.href);
      return;
    }

    router.navigate({ to: initialRoute?.to ?? '/tables', replace: false });
  }

  const signOut = useAuthenticationSignOut({
    onSuccess() {
      toast.success('Logout realizado com sucesso!', {
        description: 'Volte sempre!',
      });

      router.navigate({
        to: '/',
        replace: true,
      });
    },
    onError(error) {
      handleApiError(error, { context: 'Erro ao fazer logout' });
    },
  });

  return (
    <Root
      data-slot="sidebar"
      data-test-id="app-sidebar"
      // collapsible="icon"
      // variant="floating"
    >
      <SidebarHeader className="inline-flex items-center justify-center py-6">
        {setting.status === 'pending' && <Skeleton className="h-8 w-32" />}
        {setting.status === 'success' && (
          <button
            type="button"
            onClick={goToInitialPage}
            aria-label="Ir para página inicial"
            data-test-id="sidebar-logo-link"
            className="cursor-pointer border-0 bg-transparent p-0"
          >
            <img
              src={setting.data.LOGO_LARGE_URL ?? ''}
              alt="Logo"
              className="w-32 dark:hidden"
            />
            <img
              src={
                setting.data.LOGO_LARGE_DARK_URL ??
                setting.data.LOGO_LARGE_URL ??
                ''
              }
              alt="Logo"
              className="hidden w-32 dark:block"
            />
          </button>
        )}
      </SidebarHeader>
      <SidebarContent data-test-id="sidebar-nav">
        {menu.map((props) => {
          // Se o grupo tem a flag isLoading, renderiza skeleton
          if (props.isLoading) {
            return (
              <SidebarGroup key="dynamic-loading">
                {props.title && (
                  <SidebarGroupLabel>
                    <Skeleton className="h-4 w-24" />
                  </SidebarGroupLabel>
                )}
                <SidebarMenu>
                  {[1, 2, 3].map((i) => (
                    <SidebarMenuItem key={i}>
                      <SidebarMenuButton>
                        <Skeleton className="size-4 rounded" />
                        <Skeleton className="h-4 w-32" />
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroup>
            );
          }

          return (
            <SidebarGroup key={props.title || 'dynamic-menu'}>
              {props.title && (
                <SidebarGroupLabel>{props.title}</SidebarGroupLabel>
              )}
              <SidebarMenu>
                {props.items.map((item) => (
                  <SidebarMenuItemRecursive
                    key={item.title}
                    item={item}
                    depth={0}
                    location={location}
                    setOpenMobile={setOpenMobile}
                  />
                ))}
              </SidebarMenu>
            </SidebarGroup>
          );
        })}
        <SidebarGroup>
          <Tooltip delayDuration={100}>
            <TooltipTrigger asChild>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    data-test-id="sidebar-logout-btn"
                    onClick={() => logoutTriggerRef.current?.click()}
                    className="w-full rounded-none cursor-pointer"
                  >
                    {signOut.status !== 'pending' && (
                      <LogOutIcon className="text-primary" />
                    )}
                    {signOut.status === 'pending' && <Spinner />}
                    <span>Sair</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </TooltipTrigger>
            {state === 'collapsed' && (
              <TooltipContent side="right">Sair</TooltipContent>
            )}
          </Tooltip>
        </SidebarGroup>
      </SidebarContent>
      <ConfirmDialog
        ref={logoutTriggerRef}
        icon={<LogOutIcon className="size-4 text-destructive" />}
        title="Sair da conta"
        description="Você será desconectado e voltará para a tela de login. Deseja continuar?"
        isPending={signOut.status === 'pending'}
        onConfirm={(close) => {
          void signOut
            .mutateAsync()
            .then(close)
            .catch(() => {});
        }}
        testId="sidebar-logout-confirm-dialog"
        confirmTestId="sidebar-logout-confirm"
        cancelTestId="sidebar-logout-cancel"
      />
    </Root>
  );
}
