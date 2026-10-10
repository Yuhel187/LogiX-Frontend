"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Upload, Check, Image as ImageIcon } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const PRESET_AVATARS = [
  "https://api.dicebear.com/9.x/avataaars/svg?seed=Felix",
  "https://api.dicebear.com/9.x/avataaars/svg?seed=Aneka",
  "https://api.dicebear.com/9.x/adventurer/svg?seed=Milo",
  "https://api.dicebear.com/9.x/adventurer/svg?seed=Zoe",
  "https://api.dicebear.com/9.x/bottts/svg?seed=LogiX1",
  "https://api.dicebear.com/9.x/bottts/svg?seed=Sparky",
  "https://api.dicebear.com/9.x/personas/svg?seed=Jack",
  "https://api.dicebear.com/9.x/open-peeps/svg?seed=Leo",
  "https://api.dicebear.com/9.x/micah/svg?seed=Luna",
  "https://api.dicebear.com/9.x/big-smile/svg?seed=Oliver",
  "https://api.dicebear.com/9.x/fun-emoji/svg?seed=Sunny",
  "https://api.dicebear.com/9.x/lorelei/svg?seed=Maya",
];

const MAX_SOURCE_FILE_BYTES = 2 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
// Avatars are stored inline as data URLs, so they are downscaled to stay well under the API body limit.
const AVATAR_OUTPUT_SIZE_PX = 256;
const AVATAR_OUTPUT_TYPE = "image/webp";
const AVATAR_OUTPUT_QUALITY = 0.85;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("IMAGE_DECODE_FAILED"));
    };
    image.src = objectUrl;
  });
}

async function toAvatarDataUrl(file: File): Promise<string> {
  const image = await loadImage(file);
  const side = Math.min(image.naturalWidth, image.naturalHeight);
  const targetSize = Math.min(side, AVATAR_OUTPUT_SIZE_PX);
  const canvas = document.createElement("canvas");
  canvas.width = targetSize;
  canvas.height = targetSize;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("CANVAS_UNAVAILABLE");

  // Center-crop to a square before scaling.
  const sourceX = (image.naturalWidth - side) / 2;
  const sourceY = (image.naturalHeight - side) / 2;
  context.drawImage(image, sourceX, sourceY, side, side, 0, 0, targetSize, targetSize);
  return canvas.toDataURL(AVATAR_OUTPUT_TYPE, AVATAR_OUTPUT_QUALITY);
}

interface AvatarPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentAvatarUrl?: string | null;
  onSelectAvatar: (avatarUrl: string) => void;
}

export function AvatarPickerDialog({
  open,
  onOpenChange,
  currentAvatarUrl,
  onSelectAvatar,
}: AvatarPickerDialogProps) {
  const { t } = useTranslation();
  const [selectedUrl, setSelectedUrl] = React.useState<string>(currentAvatarUrl || "");
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setSelectedUrl(currentAvatarUrl || "");
      setUploadError(null);
    }
    onOpenChange(newOpen);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    // Reset so selecting the same file again still triggers onChange.
    e.target.value = "";
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setUploadError(t("account.profile.fileTypeInvalid"));
      return;
    }

    if (file.size > MAX_SOURCE_FILE_BYTES) {
      setUploadError(t("account.profile.fileSizeLimit"));
      return;
    }

    try {
      setSelectedUrl(await toAvatarDataUrl(file));
    } catch {
      setUploadError(t("account.profile.fileProcessFailed"));
    }
  };

  const handleConfirm = () => {
    onSelectAvatar(selectedUrl);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl border border-border/80 bg-background/95 p-6 backdrop-blur-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-foreground">
            {t("account.profile.chooseAvatarDialogTitle")}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {t("account.profile.chooseAvatarDialogDesc")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Active Preview */}
          <div className="flex items-center justify-center gap-4 p-4 rounded-xl bg-muted/40 border border-border/60">
            <Avatar className="size-20 border-2 border-primary/20 shadow-md">
              <AvatarImage src={selectedUrl} alt="Avatar preview" />
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                <ImageIcon className="size-8 text-muted-foreground" />
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">
                {t("account.profile.avatar")}
              </p>
              <p className="text-xs text-muted-foreground">
                {selectedUrl.startsWith("data:")
                  ? t("account.profile.customDeviceAvatar")
                  : selectedUrl
                  ? t("account.profile.presetSelected")
                  : t("account.profile.noAvatar")}
              </p>
            </div>
          </div>

          {/* Preset Avatars Grid */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t("account.profile.selectPreset")}
            </label>
            <div className="grid grid-cols-4 gap-3">
              {PRESET_AVATARS.map((url, idx) => {
                const isSelected = selectedUrl === url;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedUrl(url)}
                    className={cn(
                      "relative size-14 rounded-full overflow-hidden transition-all duration-200 cursor-pointer border-2 hover:scale-105 mx-auto",
                      isSelected
                        ? "border-primary ring-2 ring-primary/30 shadow-md"
                        : "border-border/60 hover:border-border"
                    )}
                  >
                    <Avatar className="size-full">
                      <AvatarImage src={url} alt={`Preset ${idx + 1}`} className="object-cover" />
                      <AvatarFallback className="text-xs">{idx + 1}</AvatarFallback>
                    </Avatar>
                    {isSelected && (
                      <div className="absolute inset-0 bg-primary/25 flex items-center justify-center">
                        <Check className="size-5 text-white drop-shadow-md" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Upload Button */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t("account.profile.uploadCustom")}
            </label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept={ALLOWED_IMAGE_TYPES.join(",")}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 h-10 rounded-xl border-dashed border-border/80 hover:bg-muted/60"
            >
              <Upload className="size-4 text-muted-foreground" />
              <span>{t("account.profile.uploadCustom")}</span>
            </Button>
            {uploadError && (
              <p className="text-xs text-destructive font-medium">{uploadError}</p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="rounded-xl"
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            className="rounded-xl font-semibold shadow-sm"
          >
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
