"use client";

import { useEffect, useState } from "react";

import { PortalAvatar } from "@/components/portal/portal-primitives";

export function EmployeeProfilePhotoField({
  name,
  email,
  photoUrl,
  hasStoredPhoto = false,
}: {
  name?: string;
  email?: string;
  photoUrl?: string | null;
  hasStoredPhoto?: boolean;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(photoUrl ?? null);
  const [removePhoto, setRemovePhoto] = useState(false);

  useEffect(() => {
    setPreviewUrl(photoUrl ?? null);
    setRemovePhoto(false);
  }, [photoUrl]);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <PortalAvatar
        email={email}
        name={name}
        photoUrl={removePhoto ? null : previewUrl}
        size="lg"
      />
      <div className="space-y-2">
        <p className="text-[13px] font-medium text-[var(--foreground-primary)]">Profile photo</p>
        <input
          accept="image/jpeg,image/png,image/webp"
          className="block w-full text-sm text-[var(--foreground-secondary)] file:mr-3 file:rounded-[var(--radius-sm)] file:border-0 file:bg-[var(--accent-primary)] file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-[var(--accent-hover)]"
          name="profilePhoto"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            setRemovePhoto(false);
            setPreviewUrl(URL.createObjectURL(file));
          }}
          type="file"
        />
        <p className="text-xs text-[var(--foreground-muted)]">
          JPEG, PNG, or WebP up to 2 MB. Leave empty to use initials.
        </p>
        {hasStoredPhoto ? (
          <label className="flex items-center gap-2 text-sm text-[var(--foreground-secondary)]">
            <input
              checked={removePhoto}
              name="removeProfilePhoto"
              onChange={(event) => {
                setRemovePhoto(event.target.checked);
                if (event.target.checked) {
                  setPreviewUrl(null);
                } else {
                  setPreviewUrl(photoUrl ?? null);
                }
              }}
              type="checkbox"
              value="true"
            />
            Remove current photo
          </label>
        ) : null}
      </div>
    </div>
  );
}
