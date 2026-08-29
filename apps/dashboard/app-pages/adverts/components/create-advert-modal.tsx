"use client";

import { useRef, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Clock, Loader2, X } from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Image03Icon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import Modal from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { uploadImage } from "@/lib/upload-image";
import { useCreateAdvert } from "../use-advert-mutations";
import { placementOptionsForPost } from "../placement-options";
import { PostPicker } from "./post-picker";
import type { PostSearchResult } from "../use-post-search";

const IMAGE_UPLOAD_PRESET = "nomeo_blogs_cover";

type AdvertType = "house" | "sponsored" | "promoted_post";

interface DateTimeState {
  date: Date | undefined;
  hour: string;
  minute: string;
  ampm: "AM" | "PM";
}

export function CreateAdvertModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [type, setType] = useState<AdvertType>("house");
  const [placement, setPlacement] = useState("feed_card");
  const [selectedPost, setSelectedPost] = useState<PostSearchResult | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [advertiserName, setAdvertiserName] = useState("");
  const [advertiserContact, setAdvertiserContact] = useState("");
  const [image, setImage] = useState<{ url: string; publicId: string } | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [startDateTime, setStartDateTime] = useState<DateTimeState>({
    date: undefined,
    hour: "12",
    minute: "00",
    ampm: "AM"
  });
  
  const [endDateTime, setEndDateTime] = useState<DateTimeState>({
    date: undefined,
    hour: "12",
    minute: "00",
    ampm: "AM"
  });

  const reset = () => {
    setType("house"); 
    setPlacement("feed_card"); 
    setSelectedPost(null); 
    setTitle(""); 
    setBody("");
    setCtaLabel(""); 
    setCtaUrl(""); 
    setAdvertiserName("");
    setAdvertiserContact("");
    setStartDateTime({ date: undefined, hour: "12", minute: "00", ampm: "AM" });
    setEndDateTime({ date: undefined, hour: "12", minute: "00", ampm: "AM" });
    setImage(null);
  };

  const handleClose = () => { reset(); onClose(); };

  const create = useCreateAdvert(handleClose);

  const handleTypeChange = (nextType: AdvertType) => {
    setType(nextType);
    if (nextType !== "promoted_post") {
      setSelectedPost(null);
      if (placement === "hero") setPlacement("feed_card");
    }
  };

  const handleSelectPost = (post: PostSearchResult | null) => {
    setSelectedPost(post);
    if (post && !title.trim()) setTitle(post.title);
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setIsUploadingImage(true);
    try {
      const result = await uploadImage({ file, uploadPreset: IMAGE_UPLOAD_PRESET });
      setImage({ url: result.secure_url, publicId: result.public_id });
    } catch {
      toast.error("Failed to upload image.");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const formatDateTime = (state: DateTimeState): string | undefined => {
    if (!state.date) return undefined;
    
    const hour = parseInt(state.hour);
    const minute = parseInt(state.minute);
    
    // Convert to 24-hour format
    let hour24 = hour;
    if (state.ampm === "PM" && hour !== 12) hour24 = hour + 12;
    if (state.ampm === "AM" && hour === 12) hour24 = 0;
    
    const dateTime = new Date(state.date);
    dateTime.setHours(hour24, minute, 0, 0);
    
    return dateTime.toISOString();
  };

  const canSubmit = title.trim().length > 0 && (type !== "promoted_post" || !!selectedPost);

  const handleSubmit = () => {
    if (!canSubmit) return;

    const startAt = formatDateTime(startDateTime);
    const endAt = formatDateTime(endDateTime);

    // Validate that end date is after start date if both are provided
    if (startAt && endAt && new Date(endAt) <= new Date(startAt)) {
      toast.error("End date must be after the start date.");
      return;
    }

    create.mutate({
      type, placement, title: title.trim(),
      postId: type === "promoted_post" ? selectedPost!.id : undefined,
      body: body.trim() || undefined,
      image: image ?? undefined,
      ctaLabel: ctaLabel.trim() || undefined,
      ctaUrl: ctaUrl.trim() || undefined,
      advertiserName: type === "sponsored" ? (advertiserName.trim() || undefined) : undefined,
      advertiserContact: type === "sponsored" ? (advertiserContact.trim() || undefined) : undefined,
      startAt,
      endAt,
    });
  };

  // Helper to render date/time picker
  const renderDateTimePicker = (
    label: string,
    state: DateTimeState,
    setState: React.Dispatch<React.SetStateAction<DateTimeState>>,
    id: string
  ) => {
    const hourOptions = Array.from({ length: 12 }, (_, i) => i + 1);
    const minuteOptions = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0"));
    
    return (
      <div className="space-y-1.5">
        <Label htmlFor={id}>{label}</Label>
        <div className="flex gap-2">
          {/* Date Picker */}
          <Popover>
            <PopoverTrigger
              render={
                <Button
                  id={id}
                  type="button"
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal rounded-md flex-1",
                    !state.date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {state.date ? format(state.date, "PPP") : "Pick a date"}
                </Button>
              }
            />
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={state.date}
                onSelect={(date) => setState({ ...state, date })}
              />
            </PopoverContent>
          </Popover>

          {/* Time Picker */}
          <div className="flex items-center gap-1 w-fit">
            <div className="flex items-center gap-0.5">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Select
                value={state.hour}
                onValueChange={(val) => setState({ ...state, hour: val ?? state.hour })}
              >
                <SelectTrigger className="w-[70px] h-9">
                  <SelectValue placeholder="HH" />
                </SelectTrigger>
                <SelectContent>
                  {hourOptions.map((hour) => (
                    <SelectItem key={hour} value={hour.toString().padStart(2, "0")}>
                      {hour.toString().padStart(2, "0")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-muted-foreground text-sm">:</span>
              <Select
                value={state.minute}
                onValueChange={(val) => setState({ ...state, minute: val ?? state.minute })}
              >
                <SelectTrigger className="w-[70px] h-9">
                  <SelectValue placeholder="MM" />
                </SelectTrigger>
                <SelectContent className={'w-[70px] p-1'}>
                  {minuteOptions.map((minute) => (
                    <SelectItem key={minute} value={minute}>
                      {minute}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={state.ampm}
                onValueChange={(val: "AM" | "PM" | null) => setState({ ...state, ampm: val ?? state.ampm })}
              >
                <SelectTrigger className="w-[70px] h-9">
                  <SelectValue placeholder="AM" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AM">AM</SelectItem>
                  <SelectItem value="PM">PM</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="xl"
      title="Create an advert"
      description="House promos, sponsored placements, and promoted posts you create go live immediately — no separate review step."
      primaryAction={{ label: "Create advert", onClick: handleSubmit, disabled: !canSubmit, loading: create.isPending }}
      secondaryAction={{ label: "Cancel", onClick: handleClose, disabled: create.isPending }}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="advert-type">Type</Label>
            <Select value={type} onValueChange={(v) => handleTypeChange(v as AdvertType)}>
              <SelectTrigger id="advert-type" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent className="p-1">
                <SelectItem value="promoted_post">Promoted post (feature a blog post)</SelectItem>
                <SelectItem value="house">House (Nomeo promo)</SelectItem>
                <SelectItem value="sponsored">Sponsored (on a brand&apos;s behalf)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="advert-placement">Placement</Label>
            <Select value={placement} onValueChange={(v) => setPlacement(v ?? "feed_card")}>
              <SelectTrigger id="advert-placement" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent className="p-1">
                {placementOptionsForPost(!!selectedPost).map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {type === "promoted_post" && (
          <div className="space-y-1.5">
            <Label>Post</Label>
            <PostPicker selectedPost={selectedPost} onSelect={handleSelectPost} />
            <p className="text-xs text-muted-foreground">
              Its cover image is used as the banner automatically unless you set one below. Most promoted posts
              belong in the feed or in-article — only pick the Hero placement for a post you want front and center.
            </p>
          </div>
        )}

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="advert-title">Title</Label>
            <span className="text-[11px] text-muted-foreground">{title.length}/150</span>
          </div>
          <Input id="advert-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Headline shown on the card" maxLength={150} autoFocus />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="advert-body">Body</Label>
            <span className="text-[11px] text-muted-foreground">{body.length}/400</span>
          </div>
          <Textarea id="advert-body" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Supporting copy" className="min-h-16 text-sm" maxLength={400} />
        </div>

        <div className="space-y-1.5">
          <Label>Image</Label>
          {image ? (
            <div className="group relative overflow-hidden rounded-xl border border-border" style={{ aspectRatio: "16/7" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => setImage(null)}
                aria-label="Remove image"
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur hover:bg-black/70"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={isUploadingImage}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-6 text-sm text-muted-foreground hover:bg-accent disabled:opacity-50"
            >
              {isUploadingImage ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <HugeiconsIcon icon={Image03Icon} className="h-4 w-4" />
              )}
              {isUploadingImage ? "Uploading…" : "Upload an image"}
            </button>
          )}
          <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
          {type === "promoted_post" && !image && (
            <p className="text-xs text-muted-foreground">Leave blank to use the selected post&apos;s cover image automatically.</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="advert-cta-label">CTA label</Label>
            <Input id="advert-cta-label" value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} placeholder="e.g. Learn more" maxLength={40} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="advert-cta-url">CTA URL</Label>
            <Input id="advert-cta-url" value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} placeholder="https://…" />
          </div>
        </div>

        {type === "sponsored" && (
          <div className="grid grid-cols-2 gap-4 rounded-xl border border-border p-3">
            <div className="space-y-1.5">
              <Label htmlFor="advertiser-name">Advertiser name</Label>
              <Input id="advertiser-name" value={advertiserName} onChange={(e) => setAdvertiserName(e.target.value)} placeholder="Brand name" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="advertiser-contact">Advertiser contact</Label>
              <Input id="advertiser-contact" value={advertiserContact} onChange={(e) => setAdvertiserContact(e.target.value)} placeholder="Email or phone" />
            </div>
          </div>
        )}

        {/* Date & Time Pickers */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {renderDateTimePicker(
            "Starts",
            startDateTime,
            setStartDateTime,
            "advert-start"
          )}
          {renderDateTimePicker(
            "Ends",
            endDateTime,
            setEndDateTime,
            "advert-end"
          )}
        </div>
        
        <p className="text-xs text-muted-foreground">
          Leave both blank to run immediately with no end date. If both are set, the end date must be after the start date.
        </p>
      </div>
    </Modal>
  );
}