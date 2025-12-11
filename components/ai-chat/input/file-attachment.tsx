"use client";

import { memo, useCallback, useEffect } from "react";
import { X, ImageIcon, FileWarning } from "lucide-react";
import { cn } from "@/lib/utils";
import { fileService, type FilePreview } from "@/lib/services/chat/file-service";
import type { EncodedFile } from "@/lib/store/chat/types";

// =============================================================================
// Types
// =============================================================================

interface FileAttachmentProps {
  /** File preview data */
  file: FilePreview | EncodedFile;
  /** Index in the attachment list */
  index: number;
  /** Callback when remove button is clicked */
  onRemove?: (index: number) => void;
  /** Whether the attachment is in a loading state */
  isLoading?: boolean;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Whether to show the remove button */
  showRemove?: boolean;
  /** Additional class names */
  className?: string;
}

interface FileAttachmentListProps {
  /** List of file previews or encoded files */
  files: (FilePreview | EncodedFile)[];
  /** Callback when a file is removed */
  onRemove?: (index: number) => void;
  /** Whether attachments are in loading state */
  isLoading?: boolean;
  /** Size variant for all attachments */
  size?: "sm" | "md" | "lg";
  /** Whether to show remove buttons */
  showRemove?: boolean;
  /** Additional class names for the container */
  className?: string;
}

// =============================================================================
// Size Configuration
// =============================================================================

const SIZE_CONFIG = {
  sm: {
    container: "h-12 w-12",
    icon: "h-4 w-4",
    removeButton: "h-4 w-4 -top-1 -right-1",
    removeIcon: "h-2.5 w-2.5",
  },
  md: {
    container: "h-16 w-16",
    icon: "h-5 w-5",
    removeButton: "h-5 w-5 -top-1.5 -right-1.5",
    removeIcon: "h-3 w-3",
  },
  lg: {
    container: "h-20 w-20",
    icon: "h-6 w-6",
    removeButton: "h-6 w-6 -top-2 -right-2",
    removeIcon: "h-3.5 w-3.5",
  },
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get the preview URL from a file object
 */
function getPreviewUrl(file: FilePreview | EncodedFile): string | undefined {
  return file.previewUrl || (file as EncodedFile).dataUrl;
}

/**
 * Check if a file is an image based on its type
 */
function isImageType(type: string): boolean {
  return type.startsWith("image/");
}

// =============================================================================
// FileAttachment Component
// =============================================================================

/**
 * Single file attachment preview with remove capability
 * Requirements: 7.1 - Display preview thumbnail before sending
 * Requirements: 7.2 - Handle remove with cleanup
 */
export const FileAttachment = memo(function FileAttachment({
  file,
  index,
  onRemove,
  isLoading = false,
  size = "md",
  showRemove = true,
  className,
}: FileAttachmentProps) {
  const config = SIZE_CONFIG[size];
  const previewUrl = getPreviewUrl(file);
  const isImage = isImageType(file.type);

  const handleRemove = useCallback(() => {
    onRemove?.(index);
  }, [onRemove, index]);

  return (
    <div
      className={cn("relative group", className)}
      role="listitem"
      aria-label={`Attachment: ${file.name}`}
    >
      <div
        className={cn(
          config.container,
          "rounded-xl border border-border/50 overflow-hidden",
          "bg-muted/30 flex items-center justify-center",
          isLoading && "animate-pulse"
        )}
      >
        {isImage && previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt={file.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-1 p-1">
            {isImage ? (
              <ImageIcon className={cn(config.icon, "text-muted-foreground")} />
            ) : (
              <FileWarning className={cn(config.icon, "text-muted-foreground")} />
            )}
            <span className="text-[8px] text-muted-foreground truncate max-w-full px-1">
              {file.name.split(".").pop()?.toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* Remove button */}
      {showRemove && onRemove && (
        <button
          type="button"
          onClick={handleRemove}
          className={cn(
            config.removeButton,
            "absolute rounded-full",
            "bg-destructive text-destructive-foreground",
            "flex items-center justify-center",
            "opacity-0 group-hover:opacity-100 transition-opacity",
            "focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-destructive/50"
          )}
          aria-label={`Remove ${file.name}`}
        >
          <X className={config.removeIcon} />
        </button>
      )}
    </div>
  );
});

// =============================================================================
// FileAttachmentList Component
// =============================================================================

/**
 * List of file attachments with remove capability
 * Requirements: 7.1 - Display preview thumbnails
 * Requirements: 7.2 - Handle remove with cleanup
 */
export const FileAttachmentList = memo(function FileAttachmentList({
  files,
  onRemove,
  isLoading = false,
  size = "md",
  showRemove = true,
  className,
}: FileAttachmentListProps) {
  if (files.length === 0) {
    return null;
  }

  return (
    <div
      className={cn("flex flex-wrap gap-2", className)}
      role="list"
      aria-label="File attachments"
    >
      {files.map((file, index) => (
        <FileAttachment
          key={file.id}
          file={file}
          index={index}
          onRemove={onRemove}
          isLoading={isLoading}
          size={size}
          showRemove={showRemove}
        />
      ))}
    </div>
  );
});

// =============================================================================
// Hook for Managing File Attachments
// =============================================================================

export interface UseFileAttachmentsOptions {
  /** Maximum number of files allowed */
  maxFiles?: number;
  /** Callback when files change */
  onChange?: (files: EncodedFile[]) => void;
}

export interface UseFileAttachmentsReturn {
  /** Current encoded files */
  files: EncodedFile[];
  /** Add files to the list */
  addFiles: (newFiles: File[]) => Promise<void>;
  /** Remove a file by index */
  removeFile: (index: number) => void;
  /** Clear all files */
  clearFiles: () => void;
  /** Whether files are being processed */
  isProcessing: boolean;
}

/**
 * Hook for managing file attachments with encoding and cleanup
 * Requirements: 7.1, 7.2, 7.3
 */
export function useFileAttachments(
  options: UseFileAttachmentsOptions = {}
): UseFileAttachmentsReturn {
  const { maxFiles = 5, onChange } = options;
  const [files, setFiles] = useState<EncodedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      files.forEach((file) => {
        if (file.previewUrl) {
          URL.revokeObjectURL(file.previewUrl);
        }
      });
    };
    // Only run on unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addFiles = useCallback(
    async (newFiles: File[]) => {
      // Filter to only image files
      const imageFiles = newFiles.filter((f) => fileService.isImageFile(f));
      if (imageFiles.length === 0) return;

      // Check max files limit
      const availableSlots = maxFiles - files.length;
      const filesToAdd = imageFiles.slice(0, availableSlots);
      if (filesToAdd.length === 0) return;

      setIsProcessing(true);

      try {
        // Encode files in parallel
        const encoded = await Promise.all(
          filesToAdd.map((f) => fileService.encodeForUpload(f))
        );

        setFiles((prev) => {
          const updated = [...prev, ...encoded];
          onChange?.(updated);
          return updated;
        });
      } finally {
        setIsProcessing(false);
      }
    },
    [files.length, maxFiles, onChange]
  );

  const removeFile = useCallback(
    (index: number) => {
      setFiles((prev) => {
        const file = prev[index];
        if (file?.previewUrl) {
          // Requirements: 7.2 - Revoke object URL
          URL.revokeObjectURL(file.previewUrl);
        }
        const updated = prev.filter((_, i) => i !== index);
        onChange?.(updated);
        return updated;
      });
    },
    [onChange]
  );

  const clearFiles = useCallback(() => {
    // Revoke all preview URLs
    files.forEach((file) => {
      if (file.previewUrl) {
        URL.revokeObjectURL(file.previewUrl);
      }
    });
    setFiles([]);
    onChange?.([]);
  }, [files, onChange]);

  return {
    files,
    addFiles,
    removeFile,
    clearFiles,
    isProcessing,
  };
}

// Need to import useState for the hook
import { useState } from "react";
