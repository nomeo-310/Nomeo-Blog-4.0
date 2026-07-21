"use client";

import { useRef, useState } from "react";
import ImageCropper from "@/components/auth/image-cropper";
import type { CoverImage } from "./post-form-types";

const CLOUDINARY_PRESET_COVER = "nomeo_blogs_cover";

interface CoverImageFieldProps {
  coverImage: CoverImage;
  onCoverImageChange: (img: CoverImage) => void;
  onRemove: () => void | Promise<void>;
  cropperAspect: number;
  placeholderIcon: React.ReactNode;
  removeIcon: React.ReactNode;
}

/**
 * CoverImageField — cover image picker / cropper / preview with
 * replace + remove actions, shared by NewPostPage and EditPostPage.
 *
 * `cropperAspect` and the icons are passed in because the two forms
 * historically used slightly different crop ratios and icon sets;
 * everything else is byte-identical between the two pages.
 */
export function CoverImageField({
  coverImage, onCoverImageChange, onRemove, cropperAspect, placeholderIcon, removeIcon,
}: CoverImageFieldProps) {
  const [cropFile, setCropFile] = useState<File | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      {cropFile ? (
        <div className="overflow-hidden rounded-2xl border border-border">
          <ImageCropper file={cropFile} aspect={cropperAspect} cropShape="rect"
            uploadPreset={CLOUDINARY_PRESET_COVER}
            onCancel={() => setCropFile(null)}
            onUploaded={(img) => { onCoverImageChange(img); setCropFile(null); }} />
        </div>
      ) : coverImage ? (
        <div className="group relative w-full overflow-hidden rounded-2xl border border-border bg-muted" style={{ aspectRatio: "16/6" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={coverImage.url} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center gap-3 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
            <button onClick={async () => { await onRemove(); coverInputRef.current?.click(); }}
              className="rounded-full bg-white/20 px-4 py-2 text-sm font-semibold text-white backdrop-blur hover:bg-white/30">
              Replace
            </button>
            <button onClick={onRemove}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur hover:bg-white/30">
              {removeIcon}
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => coverInputRef.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border bg-muted/20 text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
          style={{ aspectRatio: "16/6" }}>
          {placeholderIcon}
          <div className="text-center">
            <p className="text-sm font-semibold">Add a cover image</p>
            <p className="mt-1 text-xs">Recommended: 1600 × 600px · JPG or PNG</p>
          </div>
        </button>
      )}
      <input ref={coverInputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) setCropFile(f); e.target.value = ""; }} />
    </>
  );
}
