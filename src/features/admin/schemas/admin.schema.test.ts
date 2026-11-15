import { describe, expect, it } from "vitest";
import {
  adminQuerySchema,
  createContactLeadSchema,
  sendContactLeadEmailSchema,
} from "./admin.schema";

describe("admin.schema", () => {
  describe("adminQuerySchema('contacts')", () => {
    it("accepts valid contact lead status filters and defaults", () => {
      const schema = adminQuerySchema("contacts");
      const parsed = schema.parse({
        page: "2",
        pageSize: "25",
        q: "LogiX",
        status: "CONTACTED",
      });
      expect(parsed).toEqual({
        page: 2,
        pageSize: 25,
        q: "LogiX",
        status: "CONTACTED",
      });
    });

    it("rejects invalid contact lead status", () => {
      const schema = adminQuerySchema("contacts");
      const result = schema.safeParse({
        status: "INVALID_STATUS",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("createContactLeadSchema", () => {
    it("validates a valid demo request without OTHER need", () => {
      const parsed = createContactLeadSchema.parse({
        fullName: "  Nguyễn Văn A  ",
        email: "  User@Example.com ",
        phoneNumber: " 0901234567 ",
        companyName: " Công ty Logistics ABC ",
        needs: ["ORDER_FULFILLMENT", "TRANSPORT_ROUTE"],
        otherNeedDetail: "",
      });

      expect(parsed).toEqual({
        fullName: "Nguyễn Văn A",
        email: "User@Example.com",
        phoneNumber: "0901234567",
        companyName: "Công ty Logistics ABC",
        needs: ["ORDER_FULFILLMENT", "TRANSPORT_ROUTE"],
        otherNeedDetail: "",
      });
    });

    it("requires otherNeedDetail when OTHER is selected in needs", () => {
      const missingDetail = createContactLeadSchema.safeParse({
        fullName: "Nguyễn Văn A",
        email: "user@example.com",
        companyName: "Công ty ABC",
        needs: ["OTHER"],
        otherNeedDetail: "   ",
      });
      expect(missingDetail.success).toBe(false);

      const withDetail = createContactLeadSchema.safeParse({
        fullName: "Nguyễn Văn A",
        email: "user@example.com",
        companyName: "Công ty ABC",
        needs: ["OTHER"],
        otherNeedDetail: "Cần tích hợp ERP SAP B1",
      });
      expect(withDetail.success).toBe(true);
    });
  });

  describe("sendContactLeadEmailSchema", () => {
    it("validates non-empty subject and message", () => {
      const valid = sendContactLeadEmailSchema.safeParse({
        subject: "Lịch trình demo LogiX",
        message: "Xin chào, đội ngũ LogiX gửi thông tin demo.",
      });
      expect(valid.success).toBe(true);

      const invalid = sendContactLeadEmailSchema.safeParse({
        subject: "   ",
        message: "",
      });
      expect(invalid.success).toBe(false);
    });
  });
});
