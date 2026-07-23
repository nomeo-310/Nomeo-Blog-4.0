"use client";

import { useState } from "react";
import Modal from "@/components/ui/modal";
import { Input }    from "@/components/ui/input";
import { Label }    from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useCreateAdvert } from "../use-advert-mutations";
import { placementOptionsForPost } from "../placement-options";
import { PostPicker } from "./post-picker";
import type { PostSearchResult } from "../use-post-search";

type AdvertType = "house" | "sponsored" | "promoted_post";

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
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");

  const reset = () => {
    setType("house"); setPlacement("feed_card"); setSelectedPost(null); setTitle(""); setBody("");
    setCtaLabel(""); setCtaUrl(""); setAdvertiserName(""); setAdvertiserContact("");
    setStartAt(""); setEndAt("");
  };
  const handleClose = () => { reset(); onClose(); };

  const create = useCreateAdvert(handleClose);

  const handleTypeChange = (nextType: AdvertType) => {
    setType(nextType);
    // Most promoted posts belong in the feed or in-article, not the hero carousel —
    // only carry "hero" forward if the admin deliberately picked it themselves.
    if (nextType !== "promoted_post") {
      setSelectedPost(null);
      if (placement === "hero") setPlacement("feed_card");
    }
  };

  const handleSelectPost = (post: PostSearchResult | null) => {
    setSelectedPost(post);
    if (post && !title.trim()) setTitle(post.title);
  };

  const canSubmit = title.trim().length > 0 && (type !== "promoted_post" || !!selectedPost);

  const handleSubmit = () => {
    if (!canSubmit) return;
    create.mutate({
      type, placement, title: title.trim(),
      postId: type === "promoted_post" ? selectedPost!.id : undefined,
      body: body.trim() || undefined,
      ctaLabel: ctaLabel.trim() || undefined,
      ctaUrl: ctaUrl.trim() || undefined,
      advertiserName: type === "sponsored" ? (advertiserName.trim() || undefined) : undefined,
      advertiserContact: type === "sponsored" ? (advertiserContact.trim() || undefined) : undefined,
      startAt: startAt || undefined,
      endAt: endAt || undefined,
    });
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

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="advert-start">Starts</Label>
            <Input id="advert-start" type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="advert-end">Ends</Label>
            <Input id="advert-end" type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Leave both blank to run immediately with no end date.</p>
      </div>
    </Modal>
  );
}
