import type { NotificationItem } from "../schemas/notification.schema";

export const MAX_DROPDOWN_NOTIFICATIONS = 30;

export function prependUniqueNotification(
  items: NotificationItem[],
  incoming: NotificationItem,
  maxItems: number = MAX_DROPDOWN_NOTIFICATIONS,
): { items: NotificationItem[]; added: boolean } {
  const existingIndex = items.findIndex((item) => item.id === incoming.id);
  if (existingIndex !== -1) {
    const next = items.map((item, idx) =>
      idx === existingIndex ? incoming : item,
    );
    return { items: next, added: false };
  }

  return {
    items: [incoming, ...items].slice(0, maxItems),
    added: true,
  };
}

export function applyMarkRead(
  items: NotificationItem[],
  id: string,
  readAtIso: string,
): { items: NotificationItem[]; changed: boolean } {
  let changed = false;
  const next = items.map((item) => {
    if (item.id === id && item.readAt === null) {
      changed = true;
      return { ...item, readAt: readAtIso };
    }
    return item;
  });
  return { items: next, changed };
}

export function applyMarkAllRead(
  items: NotificationItem[],
  readAtIso: string,
): NotificationItem[] {
  return items.map((item) =>
    item.readAt === null ? { ...item, readAt: readAtIso } : item,
  );
}

export function applyArchive(
  items: NotificationItem[],
  id: string,
): { items: NotificationItem[]; removedUnread: boolean } {
  let removedUnread = false;
  const next = items.filter((item) => {
    if (item.id === id) {
      if (item.readAt === null) {
        removedUnread = true;
      }
      return false;
    }
    return true;
  });
  return { items: next, removedUnread };
}
