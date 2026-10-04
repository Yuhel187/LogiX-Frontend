"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/lib/i18n";
import type { RecordStatus } from "../../schemas/common.schema";

interface ResourceFiltersProps {
  q: string;
  status: RecordStatus;
  onQChange: (value: string) => void;
  onStatusChange: (value: RecordStatus) => void;
  searchPlaceholder: string;
}

export function ResourceFilters({
  q,
  status,
  onQChange,
  onStatusChange,
  searchPlaceholder,
}: ResourceFiltersProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(q);

  useEffect(() => setDraft(q), [q]);

  // Debounced so typing does not fire a request per keystroke.
  useEffect(() => {
    if (draft === q) return;
    const timer = setTimeout(() => onQChange(draft), 350);
    return () => clearTimeout(timer);
  }, [draft, q, onQChange]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={searchPlaceholder}
          className="pl-9"
        />
      </div>

      <Select
        value={status}
        onValueChange={(value) => onStatusChange(value as RecordStatus)}
      >
        <SelectTrigger className="sm:w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ACTIVE">{t("masterData.statusActive")}</SelectItem>
          <SelectItem value="INACTIVE">
            {t("masterData.statusInactive")}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
