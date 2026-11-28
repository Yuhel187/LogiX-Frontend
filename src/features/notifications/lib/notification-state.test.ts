import { describe, expect, it } from "vitest";
import {
  getSafeNotificationLink,
  type NotificationItem,
} from "../schemas/notification.schema";
import {
  applyArchive,
  applyMarkAllRead,
  applyMarkRead,
  prependUniqueNotification,
} from "./notification-state";

function makeItem(
  id: string,
  overrides: Partial<NotificationItem> = {},
): NotificationItem {
  return {
    id,
    type: "ORDER_PENDING_STOCK",
    severity: "WARNING",
    title: `Title ${id}`,
    body: `Body ${id}`,
    entityType: "SalesOrder",
    entityId: id,
    link: `/orders/${id}`,
    data: {},
    createdAt: "2026-11-27T14:00:00.000Z",
    readAt: null,
    archivedAt: null,
    ...overrides,
  };
}

describe("notification-state helpers", () => {
  it("prepends unique notifications, deduplicates by id, and caps length", () => {
    const existing = [makeItem("1"), makeItem("2")];

    const addedResult = prependUniqueNotification(existing, makeItem("3"), 3);
    expect(addedResult.added).toBe(true);
    expect(addedResult.items.map((item) => item.id)).toEqual(["3", "1", "2"]);

    const cappedResult = prependUniqueNotification(
      addedResult.items,
      makeItem("4"),
      3,
    );
    expect(cappedResult.added).toBe(true);
    expect(cappedResult.items.map((item) => item.id)).toEqual(["4", "3", "1"]);

    const dedupResult = prependUniqueNotification(
      cappedResult.items,
      makeItem("3", { title: "Updated 3" }),
      3,
    );
    expect(dedupResult.added).toBe(false);
    expect(dedupResult.items).toHaveLength(3);
    expect(dedupResult.items[1]?.title).toBe("Updated 3");
  });

  it("marks one notification read only if currently unread", () => {
    const items = [
      makeItem("1"),
      makeItem("2", { readAt: "2026-11-27T13:00:00.000Z" }),
    ];

    const first = applyMarkRead(items, "1", "2026-11-27T14:05:00.000Z");
    expect(first.changed).toBe(true);
    expect(first.items[0]?.readAt).toBe("2026-11-27T14:05:00.000Z");

    const second = applyMarkRead(items, "2", "2026-11-27T14:05:00.000Z");
    expect(second.changed).toBe(false);
  });

  it("marks all unread notifications read while preserving existing readAt timestamps", () => {
    const items = [
      makeItem("1"),
      makeItem("2", { readAt: "2026-11-27T13:00:00.000Z" }),
    ];
    const updated = applyMarkAllRead(items, "2026-11-27T14:10:00.000Z");

    expect(updated[0]?.readAt).toBe("2026-11-27T14:10:00.000Z");
    expect(updated[1]?.readAt).toBe("2026-11-27T13:00:00.000Z");
  });

  it("archives notification and reports whether it was unread", () => {
    const items = [
      makeItem("1"),
      makeItem("2", { readAt: "2026-11-27T13:00:00.000Z" }),
    ];

    const res1 = applyArchive(items, "1");
    expect(res1.removedUnread).toBe(true);
    expect(res1.items.map((item) => item.id)).toEqual(["2"]);

    const res2 = applyArchive(items, "2");
    expect(res2.removedUnread).toBe(false);
    expect(res2.items.map((item) => item.id)).toEqual(["1"]);
  });

  it("allows only safe relative app links", () => {
    expect(getSafeNotificationLink("/orders/123")).toBe("/orders/123");
    expect(getSafeNotificationLink("/driver/trips")).toBe("/driver/trips");
    expect(getSafeNotificationLink("https://evil.com")).toBeNull();
    expect(getSafeNotificationLink("//evil.com/phish")).toBeNull();
    expect(getSafeNotificationLink("javascript:alert(1)")).toBeNull();
    expect(getSafeNotificationLink(null)).toBeNull();
  });
});
