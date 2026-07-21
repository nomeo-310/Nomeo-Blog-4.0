import { cn } from "@/lib/utils";
import { PostEditor } from "./post-editor";
import { FieldError } from "./post-field-error";

interface TitleContentPanelProps {
  title: string;
  onTitleChange: (value: string) => void;
  titleError?: string;
  content: string;
  onContentChange: (value: string) => void;
  contentError?: string;
  errorIcon: React.ReactNode;
}

/**
 * TitleContentPanel — the left column of the post form: the auto-growing
 * title textarea plus the rich text PostEditor. Shared by NewPostPage and
 * EditPostPage, which use identical markup here.
 */
export function TitleContentPanel({
  title, onTitleChange, titleError, content, onContentChange, contentError, errorIcon,
}: TitleContentPanelProps) {
  return (
    <div className="space-y-4">
      <div>
        <textarea value={title}
          onChange={(e) => { onTitleChange(e.target.value); e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; }}
          placeholder="Post title" rows={2} maxLength={300}
          className={cn("w-full resize-none overflow-hidden rounded-2xl border bg-card px-5 py-4 font-heading text-2xl font-bold text-foreground outline-none transition-colors placeholder:text-muted-foreground/40 md:text-3xl",
            titleError ? "border-destructive focus:ring-2 focus:ring-destructive/20" : "border-border focus:border-primary focus:ring-2 focus:ring-primary/20")} />
        {titleError && <FieldError msg={titleError} icon={errorIcon} />}
        <p className="mt-1 text-right text-xs text-muted-foreground">{title.length}/300</p>
      </div>
      <div>
        <PostEditor value={content} onChange={onContentChange} placeholder="Tell your story…"
          className={contentError ? "ring-2 ring-destructive/30" : ""} />
        {contentError && <FieldError msg={contentError} icon={errorIcon} />}
      </div>
    </div>
  );
}
