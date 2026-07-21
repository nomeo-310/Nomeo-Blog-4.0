import { cn } from "@/lib/utils";

export function AvatarBubble({ name, avatar, size }: { name: string; avatar?: string; size: "sm" | "xs" }) {
  const cls = size === "sm" ? "h-9 w-9 text-sm" : "h-7 w-7 text-xs";
  return avatar ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={avatar} alt="" className={cn("rounded-full object-cover shrink-0", cls)} />
  ) : (
    <span className={cn("flex shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary", cls)}>
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
