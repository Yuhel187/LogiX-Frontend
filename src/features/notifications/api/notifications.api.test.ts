import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, authFetch } from "@/lib/api";
import {
  archiveNotificationApi,
  getUnreadCountApi,
  listNotificationsApi,
  markAllNotificationsReadApi,
  markNotificationReadApi,
} from "./notifications.api";

vi.mock("@/lib/config", () => ({
  apiBaseUrl: "https://gateway.example/api/v1",
  wsBaseUrl: "https://gateway.example",
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, authFetch: vi.fn() };
});

const apiFetch = vi.mocked(authFetch);
const baseUrl = "https://gateway.example/api/v1/notifications";
const notificationId = "00000000-0000-4000-8000-000000000001";
const instant = "2026-11-27T14:00:00.000Z";

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("Notifications API adapters", () => {
  beforeEach(() => apiFetch.mockReset());

  it("lists notifications with query parameters and parses payload", async () => {
    apiFetch.mockResolvedValueOnce(
      jsonResponse({
        items: [
          {
            id: notificationId,
            type: "TRIP_DISPATCHED",
            severity: "INFO",
            title: "Chuyến giao đã được điều phối",
            body: "Chuyến giao đã được điều phối cho tài xế.",
            entityType: "DeliveryTrip",
            entityId: notificationId,
            link: "/driver/trips",
            data: { tripId: notificationId },
            createdAt: instant,
            readAt: null,
            archivedAt: null,
          },
        ],
        nextCursor: "abc123",
      }),
    );

    const result = await listNotificationsApi({
      cursor: "cur-1",
      limit: 20,
      unreadOnly: true,
    });

    expect(apiFetch).toHaveBeenCalledWith(
      `${baseUrl}?cursor=cur-1&limit=20&unreadOnly=true`,
      { method: "GET", signal: undefined },
    );
    expect(result.items).toHaveLength(1);
    expect(result.nextCursor).toBe("abc123");
  });

  it("reads unread notification count", async () => {
    apiFetch.mockResolvedValueOnce(jsonResponse({ count: 7 }));

    await expect(getUnreadCountApi()).resolves.toEqual({ count: 7 });
    expect(apiFetch).toHaveBeenCalledWith(`${baseUrl}/unread-count`, {
      method: "GET",
      signal: undefined,
    });
  });

  it("handles 204 No Content and errors when marking a notification read", async () => {
    apiFetch.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await expect(markNotificationReadApi(notificationId)).resolves.toBeUndefined();
    expect(apiFetch).toHaveBeenCalledWith(
      `${baseUrl}/${notificationId}/read`,
      { method: "PATCH" },
    );

    apiFetch.mockResolvedValueOnce(
      jsonResponse({ message: "Notification not found" }, 404),
    );
    await expect(markNotificationReadApi(notificationId)).rejects.toBeInstanceOf(
      ApiError,
    );
  });

  it("marks all notifications read", async () => {
    apiFetch.mockResolvedValueOnce(jsonResponse({ updated: 4 }));

    await expect(markAllNotificationsReadApi()).resolves.toEqual({ updated: 4 });
    expect(apiFetch).toHaveBeenCalledWith(`${baseUrl}/read-all`, {
      method: "POST",
    });
  });

  it("handles 204 No Content and errors when archiving a notification", async () => {
    apiFetch.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await expect(archiveNotificationApi(notificationId)).resolves.toBeUndefined();
    expect(apiFetch).toHaveBeenCalledWith(
      `${baseUrl}/${notificationId}/archive`,
      { method: "PATCH" },
    );

    apiFetch.mockResolvedValueOnce(
      jsonResponse({ message: "Forbidden" }, 403),
    );
    await expect(archiveNotificationApi(notificationId)).rejects.toBeInstanceOf(
      ApiError,
    );
  });
});
