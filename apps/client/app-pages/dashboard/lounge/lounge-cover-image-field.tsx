import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, ImageAdd01Icon } from "@hugeicons/core-free-icons";
import ImageCropper from "@/components/auth/image-cropper";
import type { CoverImage } from "./lounge-types";

const CLOUDINARY_PRESET_COVER = "nomeo_blogs_cover";

/**
 * Cover image uploader shared by new-lounge and edit-lounge forms.
 *
 * When `onReplace` is provided (edit flow), the hover overlay shows both
 * "Replace" and remove actions; otherwise (create flow) only a small
 * remove button is shown.
 */
export function LoungeCoverImageField({
  coverImage,
  cropFile,
  onCropCancel,
  onCropUploaded,
  onRemove,
  onReplace,
  inputRef,
  onFileChange,
}: {
  coverImage: CoverImage;
  cropFile: File | null;
  onCropCancel: () => void;
  onCropUploaded: (img: { url: string; publicId: string }) => void;
  onRemove: () => void;
  onReplace?: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="mb-3 text-sm font-semibold text-foreground">Cover image</p>
      {cropFile ? (
        <ImageCropper
          file={cropFile}
          aspect={16 / 9}
          cropShape="rect"
          uploadPreset={CLOUDINARY_PRESET_COVER}
          onCancel={onCropCancel}
          onUploaded={onCropUploaded}
        />
      ) : coverImage ? (
        <div className="group relative aspect-video overflow-hidden rounded-xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={coverImage.url} alt="" className="h-full w-full object-cover" />
          {onReplace ? (
            <div className="absolute inset-0 flex items-center justify-center gap-3 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                onClick={onReplace}
                className="rounded-full bg-white/20 px-4 py-2 text-sm font-semibold text-white backdrop-blur hover:bg-white/30"
              >
                Replace
              </button>
              <button onClick={onRemove}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur hover:bg-white/30">
                <HugeiconsIcon icon={Cancel01Icon} className="h-4 w-4" />
              </button>
            </div>
          ) : (
            // Remove: delete from Cloudinary + clear state
            <button
              onClick={onRemove}
              className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/70"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/20 py-10 text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
        >
          <HugeiconsIcon icon={ImageAdd01Icon} className="h-8 w-8" />
          <span className="text-sm font-medium">Upload a cover image</span>
          <span className="text-xs">Shows on the lounges discovery page</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFileChange}
      />
    </div>
  );
}
