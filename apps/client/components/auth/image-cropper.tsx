"use client";

import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Button } from "@/components/ui/button";
import { Loader2, ZoomIn } from "lucide-react";// your webp compressor
import { compressImageToFile } from "@/lib/compress-image";
import { uploadImage } from "@/lib/uploadImage";

/**
 * ImageCropper
 * ------------
 * Crops an image to a locked aspect ratio, renders the crop to a canvas,
 * runs it through your webp compressor, and uploads to Cloudinary.
 *
 * Pipeline: pick file → crop (locked aspect) → canvas → compress → webp →
 * Cloudinary → returns { url, publicId, width, height }.
 *
 *   aspect = 1   → square (profile picture)
 *   aspect = 3   → wide banner (cover image)
 *
 * Pass `uploadPreset` for the Cloudinary unsigned preset to use.
 */

export interface UploadedImage {
  url: string;
  publicId: string;
  width: number;
  height: number;
}

interface ImageCropperProps {
  /** The selected file to crop */
  file: File;
  /** Aspect ratio: 1 for profile, 3 (or 4) for cover */
  aspect: number;
  /** Round crop overlay (profile) vs rectangular (cover) */
  cropShape?: "round" | "rect";
  /** Cloudinary unsigned upload preset */
  uploadPreset: string;
  onCancel: () => void;
  onUploaded: (image: UploadedImage) => void;
}

export default function ImageCropper({
  file,
  aspect,
  cropShape = "rect",
  uploadPreset,
  onCancel,
  onUploaded,
}: ImageCropperProps) {
  const [imageSrc] = useState(() => URL.createObjectURL(file));
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPixels) return;
    setError(null);
    setBusy(true);
    try {
      // 1. Render the cropped region to a canvas → blob
      const blob = await getCroppedBlob(imageSrc, croppedAreaPixels);

      // 2. Compress to webp (your function). It accepts a File/Blob and
      //    returns a File/Blob — adjust the wrapping if your signature differs.
      const webp = await compressImageToFile(
        new File([blob], "upload.png", { type: "image/png" })
      );

      // 3. Upload to Cloudinary
      const data = await uploadImage({ image: webp as File, uploadPreset });

      onUploaded({
        url: data.secure_url,
        publicId: data.public_id,
        width: data.width,
        height: data.height,
      });
    } catch (err) {
      console.error(err);
      setError("Couldn't process that image. Try another.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Crop area — needs a defined height */}
      <div className="relative h-64 w-full overflow-hidden rounded-lg bg-muted">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={aspect}
          cropShape={cropShape}
          showGrid={false}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
        />
      </div>

      {/* Zoom */}
      <div className="flex items-center gap-3">
        <ZoomIn className="h-4 w-4 text-muted-foreground" />
        <input
          type="range"
          min={1}
          max={3}
          step={0.05}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="h-1 flex-1 cursor-pointer accent-primary"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Button variant="outline" onClick={onCancel} disabled={busy} className="flex-1">
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={busy} className="flex-1">
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {busy ? "Uploading…" : "Save"}
        </Button>
      </div>
    </div>
  );
}

/* ── Canvas helper: render the cropped pixels to a Blob ────────────────── */

function getCroppedBlob(src: string, area: Area): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.crossOrigin = "anonymous";
    image.src = src;
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = area.width;
      canvas.height = area.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("No canvas context"));

      ctx.drawImage(
        image,
        area.x,
        area.y,
        area.width,
        area.height,
        0,
        0,
        area.width,
        area.height
      );

      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Canvas is empty"))),
        "image/png"
      );
    };
    image.onerror = () => reject(new Error("Failed to load image"));
  });
}