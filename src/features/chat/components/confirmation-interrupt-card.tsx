"use client";

import React from "react";
import {
  normalizeApprovalData,
  type NormalizedApprovalData,
} from "../lib/parse-approval-data";
import { UniversalApprovalCard } from "./universal-approval-card";

export interface ConfirmationOrderLine {
  productName?: string;
  skuSnapshot?: string;
  quantity?: string | number;
  sufficient?: boolean;
}

export interface ConfirmationPreviewData {
  orderNumber?: string;
  shipmentNumber?: string;
  customerName?: string;
  warehouseName?: string;
  totalQuantity?: string | number;
  carrierName?: string;
  lines?: ConfirmationOrderLine[];
  [key: string]: unknown;
}

export interface PendingApprovalData {
  approval_id?: string;
  action?: string;
  target_type?: string;
  target_id?: string;
  target_version?: number;
  preview?: ConfirmationPreviewData;
  expires_at?: string;
  tool_call?: {
    name?: string;
    args?: Record<string, unknown>;
  };
  [key: string]: unknown;
}

export interface ConfirmationInterruptCardProps {
  data: PendingApprovalData | NormalizedApprovalData;
  onResolve: (decision: { approved: boolean; decision: string; approval_id?: string }) => void;
  onCancel?: () => void;
}

export function ConfirmationInterruptCard({
  data,
  onResolve,
  onCancel,
}: ConfirmationInterruptCardProps) {
  // If data is already normalized, use directly; otherwise normalize it
  const normalized: NormalizedApprovalData =
    "ui" in data && data.ui
      ? (data as NormalizedApprovalData)
      : normalizeApprovalData(data, { value: data });

  return (
    <UniversalApprovalCard
      data={normalized}
      onResolve={onResolve}
      onCancel={onCancel}
    />
  );
}
