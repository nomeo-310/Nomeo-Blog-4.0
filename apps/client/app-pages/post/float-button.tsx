import { cn } from "@/lib/utils";

/** One button in the floating sidebar action pill (like/save/comments/share). */
export function FloatButton({ onClick, active, disabled, title, activeClass, children }: {
  onClick: () => void; active: boolean; disabled?: boolean;
  title: string; activeClass: string; children: React.ReactNode;
}) {
  return (
    <button onClick={onClick} disabled={disabled} title={title}
      className={cn(
        "flex w-full flex-col items-center gap-0.5 rounded-xl px-3 py-2.5 transition-all disabled:opacity-50",
        active ? activeClass : "text-muted-foreground hover:bg-accent hover:text-foreground"
      )}>
      {children}
    </button>
  );
}
