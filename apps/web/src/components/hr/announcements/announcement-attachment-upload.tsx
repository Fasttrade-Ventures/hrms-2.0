"use client";

import { useCallback, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { validateAnnouncementFile } from "@/lib/announcements/upload-rules";
import { cn } from "@/lib/utils";

type ExistingAttachment = {
  fileId: string;
  fileName: string;
};

type AnnouncementAttachmentUploadProps = {
  existingAttachments?: ExistingAttachment[];
  onFilesChange: (files: File[]) => void;
  onRemoveExistingChange: (fileIds: string[]) => void;
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AnnouncementAttachmentUpload({
  existingAttachments = [],
  onFilesChange,
  onRemoveExistingChange,
}: AnnouncementAttachmentUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [removedExistingIds, setRemovedExistingIds] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const syncFiles = useCallback(
    (files: File[]) => {
      setSelectedFiles(files);
      onFilesChange(files);
    },
    [onFilesChange],
  );

  const syncRemoved = useCallback(
    (fileIds: string[]) => {
      setRemovedExistingIds(fileIds);
      onRemoveExistingChange(fileIds);
    },
    [onRemoveExistingChange],
  );

  const addFiles = useCallback(
    (incoming: FileList | File[]) => {
      const next = [...selectedFiles];
      const errors: string[] = [];

      for (const file of Array.from(incoming)) {
        const validationError = validateAnnouncementFile(file);
        if (validationError) {
          errors.push(`${file.name}: ${validationError}`);
          continue;
        }
        if (next.some((existing) => existing.name === file.name && existing.size === file.size)) {
          continue;
        }
        next.push(file);
      }

      setError(errors[0] ?? null);
      syncFiles(next);
    },
    [selectedFiles, syncFiles],
  );

  const visibleExisting = existingAttachments.filter(
    (attachment) => !removedExistingIds.includes(attachment.fileId),
  );

  return (
    <div className="space-y-3">
      <div
        className={cn(
          "rounded-lg border border-dashed px-4 py-6 text-center transition-colors",
          dragActive
            ? "border-[var(--accent-primary)] bg-[var(--surface-accent-soft)]"
            : "border-[var(--border-primary)] bg-[var(--surface-muted)]/40",
        )}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragActive(false);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragActive(false);
          if (event.dataTransfer.files.length > 0) {
            addFiles(event.dataTransfer.files);
          }
        }}
      >
        <p className="text-sm font-medium text-[var(--foreground-primary)]">
          Drag files here or choose from your device
        </p>
        <p className="mt-1 text-xs text-[var(--foreground-muted)]">
          PDF, JPG, or PNG up to 10 MB each
        </p>
        <Button
          className="mt-3"
          onClick={() => inputRef.current?.click()}
          size="sm"
          type="button"
          variant="outline"
        >
          Choose files
        </Button>
        <input
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          className="hidden"
          multiple
          onChange={(event) => {
            if (event.target.files?.length) {
              addFiles(event.target.files);
              event.target.value = "";
            }
          }}
          ref={inputRef}
          type="file"
        />
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {visibleExisting.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--foreground-muted)]">
            Current attachments
          </p>
          {visibleExisting.map((attachment) => (
            <div
              className="flex items-center justify-between rounded-md border border-[var(--border-primary)] bg-[var(--surface-card)] px-3 py-2"
              key={attachment.fileId}
            >
              <span className="truncate text-sm">{attachment.fileName}</span>
              <Button
                onClick={() =>
                  syncRemoved([...removedExistingIds, attachment.fileId])
                }
                size="sm"
                type="button"
                variant="ghost"
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      {selectedFiles.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--foreground-muted)]">
            New attachments
          </p>
          {selectedFiles.map((file, index) => (
            <div
              className="flex items-center justify-between rounded-md border border-[var(--border-primary)] bg-[var(--surface-card)] px-3 py-2"
              key={`${file.name}-${file.size}-${index}`}
            >
              <div className="min-w-0">
                <p className="truncate text-sm">{file.name}</p>
                <p className="text-xs text-[var(--foreground-muted)]">{formatFileSize(file.size)}</p>
              </div>
              <Button
                onClick={() => {
                  const next = selectedFiles.filter((_, fileIndex) => fileIndex !== index);
                  syncFiles(next);
                }}
                size="sm"
                type="button"
                variant="ghost"
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
