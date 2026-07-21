/**
 * FieldError — inline validation message shown under a form field. The
 * icon is passed in because NewPostPage and EditPostPage historically use
 * different icon sets (Hugeicons vs lucide-react).
 */
export function FieldError({ msg, icon }: { msg: string; icon: React.ReactNode }) {
  return (
    <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
      {icon}{msg}
    </p>
  );
}
