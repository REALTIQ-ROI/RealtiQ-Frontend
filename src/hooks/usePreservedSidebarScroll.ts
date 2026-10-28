import { useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const sidebarPositions = new Map<string, number>();
const ACTIVE_NAV_SELECTOR = 'a[aria-current="page"], [data-sidebar-active="true"]';
const ACTIVE_ITEM_MARGIN = 12;

/** Preserve a dashboard menu's own scroll position across route/layout remounts. */
const usePreservedSidebarScroll = (sidebarId: string) => {
  const sidebarRef = useRef<HTMLElement | null>(null);
  const { pathname, search, hash } = useLocation();

  useLayoutEffect(() => {
    const sidebar = sidebarRef.current;
    if (!sidebar) return undefined;

    sidebar.scrollTop = sidebarPositions.get(sidebarId) ?? 0;

    const savePosition = () => sidebarPositions.set(sidebarId, sidebar.scrollTop);
    sidebar.addEventListener('scroll', savePosition, { passive: true });

    const activeItem = sidebar.querySelector<HTMLElement>(ACTIVE_NAV_SELECTOR);
    if (activeItem) {
      const sidebarRect = sidebar.getBoundingClientRect();
      const visibleTop = sidebarRect.top + sidebar.clientTop;
      const visibleBottom = sidebar.clientHeight > 0
        ? visibleTop + sidebar.clientHeight
        : sidebarRect.bottom;
      const itemRect = activeItem.getBoundingClientRect();

      if (itemRect.top < visibleTop + ACTIVE_ITEM_MARGIN) {
        sidebar.scrollTop -= visibleTop + ACTIVE_ITEM_MARGIN - itemRect.top;
      } else if (itemRect.bottom > visibleBottom - ACTIVE_ITEM_MARGIN) {
        sidebar.scrollTop += itemRect.bottom - visibleBottom + ACTIVE_ITEM_MARGIN;
      }
    }

    savePosition();
    return () => {
      savePosition();
      sidebar.removeEventListener('scroll', savePosition);
    };
  }, [sidebarId, pathname, search, hash]);

  return sidebarRef;
};

export default usePreservedSidebarScroll;
