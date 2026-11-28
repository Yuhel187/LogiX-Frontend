import { describe, expect, it } from "vitest";
import { BROADCAST_STATUSES } from "../constants/notification-permissions";
import {
  broadcastListResponseSchema,
  buildBroadcastPayloadFingerprint,
  createBroadcastResponseSchema,
  isBroadcastInProgress,
  isValidBroadcastLink,
} from "./broadcast.schema";

const broadcastId = "00000000-0000-4000-8000-000000000001";
const roleA = "00000000-0000-4000-8000-000000000010";
const roleB = "00000000-0000-4000-8000-000000000020";
const userA = "00000000-0000-4000-8000-000000000030";

describe("Broadcast schema helpers", () => {
  it("validates relative internal links and rejects external/unsafe URLs", () => {
    expect(isValidBroadcastLink("")).toBe(true);
    expect(isValidBroadcastLink("   ")).toBe(true);
    expect(isValidBroadcastLink("/dashboard")).toBe(true);
    expect(isValidBroadcastLink("/orders/123?tab=items")).toBe(true);

    expect(isValidBroadcastLink("https://evil.example/phish")).toBe(false);
    expect(isValidBroadcastLink("//evil.example")).toBe(false);
    expect(isValidBroadcastLink("javascript:alert(1)")).toBe(false);
    expect(isValidBroadcastLink("orders/123")).toBe(false);
    expect(isValidBroadcastLink("/orders with space")).toBe(false);
    expect(isValidBroadcastLink("/orders/<script>")).toBe(false);
    expect(isValidBroadcastLink(`/${"a".repeat(500)}`)).toBe(false);
  });

  it("produces canonical payload fingerprints independent of array order and whitespace", () => {
    const first = buildBroadcastPayloadFingerprint({
      title: "  Bảo trì hệ thống  ",
      body: " Nội dung chi tiết ",
      severity: "WARNING",
      audience: { kind: "ROLES", roleIds: [roleB, roleA, roleB] },
      link: "  ",
    });

    const second = buildBroadcastPayloadFingerprint({
      title: "Bảo trì hệ thống",
      body: "Nội dung chi tiết",
      severity: "WARNING",
      audience: { kind: "ROLES", roleIds: [roleA, roleB] },
      link: null,
    });

    const changed = buildBroadcastPayloadFingerprint({
      title: "Bảo trì hệ thống",
      body: "Nội dung đã sửa",
      severity: "WARNING",
      audience: { kind: "ROLES", roleIds: [roleA, roleB] },
      link: null,
    });

    expect(first).toBe(second);
    expect(changed).not.toBe(first);
  });

  it("parses broadcast create and history responses and identifies in-progress statuses", () => {
    const createParsed = createBroadcastResponseSchema.parse({
      id: broadcastId,
      status: "QUEUED",
    });
    expect(createParsed).toEqual({ id: broadcastId, status: "QUEUED" });

    const listParsed = broadcastListResponseSchema.parse({
      items: [
        {
          id: broadcastId,
          title: "Cập nhật điều phối",
          severity: "INFO",
          audience: { kind: "USERS", userIds: [userA] },
          senderId: userA,
          status: "COMPLETED",
          recipientCount: 12,
          deliveredCount: 12,
          readCount: 5,
          createdAt: "2026-11-28T09:00:00.000Z",
          completedAt: "2026-11-28T09:00:05.000Z",
        },
      ],
      nextCursor: null,
    });
    expect(listParsed.items).toHaveLength(1);
    expect(listParsed.items[0].recipientCount).toBe(12);

    expect(isBroadcastInProgress(BROADCAST_STATUSES.QUEUED)).toBe(true);
    expect(isBroadcastInProgress(BROADCAST_STATUSES.FANOUTING)).toBe(true);
    expect(isBroadcastInProgress(BROADCAST_STATUSES.READY)).toBe(true);
    expect(isBroadcastInProgress(BROADCAST_STATUSES.COMPLETED)).toBe(false);
    expect(isBroadcastInProgress(BROADCAST_STATUSES.PARTIAL_FAILED)).toBe(false);
    expect(isBroadcastInProgress(BROADCAST_STATUSES.FAILED)).toBe(false);
  });
});
