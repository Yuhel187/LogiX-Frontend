/**
 * Universal Approval Data Normalizer
 * Bridges LangGraph / AG-UI / CopilotKit interrupt payloads into a clean,
 * standardized, server-driven UI descriptor.
 */

export type ApprovalSeverity = "info" | "warning" | "destructive";

export interface ApprovalAttribute {
  label: string;
  value: string | number;
  highlight?: boolean;
  badge?: {
    text: string;
    variant?: "default" | "success" | "warning" | "destructive";
  };
}

export interface ApprovalTableColumn {
  key: string;
  label: string;
  align?: "left" | "center" | "right";
}

export interface ApprovalTable {
  title?: string;
  columns: ApprovalTableColumn[];
  rows: Array<Record<string, unknown>>;
}

export interface ConfirmationUiDescriptor {
  title: string;
  subtitle?: string;
  icon?: "package" | "truck" | "warehouse" | "alert" | "user" | "dollar" | "shield";
  severity?: ApprovalSeverity;
  impact_summary?: string;
  attributes?: ApprovalAttribute[];
  table?: ApprovalTable;
}

export interface NormalizedApprovalData {
  approval_id?: string;
  action: string;
  target_type?: string;
  target_id?: string;
  target_version?: number;
  expires_at?: string;
  ui: ConfirmationUiDescriptor;
  raw: Record<string, unknown>;
}

function humanizeActionName(action: string): string {
  if (!action || action === "action") return "Yêu cầu phê duyệt";
  const clean = action.replace(/_/g, " ").trim();
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

/**
 * Normalizes any interrupt shape (from LangGraph metadata, CopilotKit event,
 * or raw tool args) into a reliable, typed structure.
 */
export function normalizeApprovalData(
  interrupt: unknown,
  event: unknown
): NormalizedApprovalData {
  const iObj = (interrupt && typeof interrupt === "object" ? interrupt : {}) as Record<string, unknown>;
  const eObj = (event && typeof event === "object" ? event : {}) as Record<string, unknown>;
  const eVal = (eObj.value && typeof eObj.value === "object" ? eObj.value : {}) as Record<string, unknown>;

  // 1. Unpack raw payload: LangGraph packs it in metadata.langgraph.raw
  const iMeta = iObj.metadata as Record<string, unknown> | undefined;
  const eMeta = eVal.metadata as Record<string, unknown> | undefined;
  const metaRaw =
    ((iMeta?.langgraph as Record<string, unknown> | undefined)?.raw) ??
    ((eMeta?.langgraph as Record<string, unknown> | undefined)?.raw);

  const raw: Record<string, unknown> =
    (metaRaw && typeof metaRaw === "object" ? (metaRaw as Record<string, unknown>) : null) ??
    (iObj.value && typeof iObj.value === "object" ? (iObj.value as Record<string, unknown>) : null) ??
    (eVal && typeof eVal === "object" && Object.keys(eVal).length > 0 && !eVal.metadata ? (eVal as Record<string, unknown>) : null) ??
    (iObj && Object.keys(iObj).length > 0 && !iObj.metadata ? (iObj as Record<string, unknown>) : {}) ??
    {};

  // 2. Extract standard fields
  const approval_id =
    (raw.approval_id as string) ||
    (raw.approvalId as string) ||
    (iObj.id as string) ||
    (eVal.id as string) ||
    "default";

  const toolCall = (raw.tool_call as Record<string, unknown>) || (raw.toolCall as Record<string, unknown>);
  const action =
    (raw.action as string) ||
    (toolCall?.name as string) ||
    (iObj.reason as string) ||
    "action";

  const target_type = (raw.target_type as string) || (raw.targetType as string) || "";
  const target_id = (raw.target_id as string) || (raw.targetId as string) || "";
  const target_version = typeof raw.target_version === "number" ? raw.target_version : undefined;
  const expires_at = (raw.expires_at as string) || (raw.expiresAt as string) || (iObj.expiresAt as string);

  // 3. Resolve or Infer UI Descriptor
  const rawUi = (raw.ui && typeof raw.ui === "object" ? raw.ui : null) as Partial<ConfirmationUiDescriptor> | null;
  const preview = (raw.preview && typeof raw.preview === "object" ? raw.preview : {}) as Record<string, unknown>;

  const isOrder = action.includes("order");
  const isShipment = action.includes("shipment");
  const isInventory = action.includes("inventory") || action.includes("stock");
  const isTrip = action.includes("trip");

  // Determine Icon
  const icon: ConfirmationUiDescriptor["icon"] =
    rawUi?.icon ||
    (isOrder ? "package" : isShipment || isTrip ? "truck" : isInventory ? "warehouse" : "shield");

  // Determine Title
  let title = rawUi?.title;
  if (!title) {
    if (isOrder && (action.includes("confirm") || action.includes("approve"))) {
      title = "Xác nhận đơn hàng";
    } else if (isOrder && action.includes("cancel")) {
      title = "Hủy đơn hàng";
    } else if (isShipment && (action.includes("dispatch") || action.includes("ship"))) {
      title = "Xuất kho vận đơn";
    } else if (isInventory) {
      title = "Điều chỉnh tồn kho";
    } else if (isTrip) {
      title = "Điều phối chuyến xe";
    } else {
      title = humanizeActionName(action);
    }
  }

  // Determine Subtitle
  let subtitle = rawUi?.subtitle;
  if (!subtitle) {
    const orderNum = (preview.orderNumber as string) || (preview.order_number as string);
    const shipmentNum = (preview.shipmentNumber as string) || (preview.shipment_number as string);
    const tripNum = (preview.tripNumber as string) || (preview.trip_number as string);
    const code = (preview.code as string);

    if (orderNum) subtitle = `Đơn hàng: ${orderNum}`;
    else if (shipmentNum) subtitle = `Vận đơn: ${shipmentNum}`;
    else if (tripNum) subtitle = `Chuyến xe: ${tripNum}`;
    else if (code) subtitle = `Mã: ${code}`;
    else if (target_id && target_id !== "N/A") {
      subtitle = target_id.length > 18 ? `${target_id.slice(0, 16)}...` : target_id;
    }
  }

  // Determine Attributes
  const attributes: ApprovalAttribute[] = rawUi?.attributes ? [...rawUi.attributes] : [];
  if (!rawUi?.attributes) {
    if (preview.customerName) {
      attributes.push({ label: "Khách hàng", value: String(preview.customerName) });
    }
    if (preview.warehouseName) {
      attributes.push({ label: "Kho xuất", value: String(preview.warehouseName) });
    }
    if (preview.totalQuantity !== undefined) {
      attributes.push({ label: "Tổng số lượng", value: `${preview.totalQuantity} sản phẩm` });
    }
    if (preview.carrierName) {
      attributes.push({ label: "Đơn vị vận chuyển", value: String(preview.carrierName) });
    }
  }

  // Determine Table (e.g. Lines check)
  let table: ApprovalTable | undefined = rawUi?.table;
  if (!table && Array.isArray(preview.lines) && preview.lines.length > 0) {
    const rows = (preview.lines as Array<Record<string, unknown>>).map((line, idx) => ({
      product:
        line.productName || line.skuSnapshot || line.sku || (line.productId ? `SP #${idx + 1}` : `Mặt hàng #${idx + 1}`),
      quantity: line.quantity ?? line.required ?? "-",
      sufficient: line.sufficient !== false,
    }));

    table = {
      title: `Kiểm tra khả dụng (${rows.length} mặt hàng)`,
      columns: [
        { key: "product", label: "Sản phẩm", align: "left" },
        { key: "quantity", label: "Số lượng", align: "right" },
        { key: "sufficient", label: "Trạng thái", align: "center" },
      ],
      rows,
    };
  }

  const ui: ConfirmationUiDescriptor = {
    title,
    subtitle,
    icon,
    severity: rawUi?.severity || "info",
    impact_summary: rawUi?.impact_summary,
    attributes: attributes.length > 0 ? attributes : undefined,
    table,
  };

  return {
    approval_id,
    action,
    target_type,
    target_id,
    target_version,
    expires_at,
    ui,
    raw,
  };
}
