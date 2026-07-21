/** Renders the rich-text article body, plus the scoped prose overrides it needs. */
export function PostContent({ content }: { content: string }) {
  return (
    <>
      <style>{`
        .post-content [style*="text-align: center"]  { text-align: center !important; }
        .post-content [style*="text-align: right"]   { text-align: right  !important; }
        .post-content [style*="text-align: left"]    { text-align: left   !important; }
        .post-content [style*="text-align: justify"] { text-align: justify !important; }

        .post-content mark {
          background-color: oklch(0.97 0.12 95);
          color: inherit;
          border-radius: 0.2em;
          padding: 0.05em 0.25em;
        }
        .dark .post-content mark {
          background-color: oklch(0.45 0.12 85 / 0.5);
        }

        .post-content ul { list-style-type: disc;    padding-left: 1.625em; }
        .post-content ol { list-style-type: decimal; padding-left: 1.625em; }
        .post-content ul ul  { list-style-type: circle; }
        .post-content ul ul ul { list-style-type: square; }
        .post-content li   { margin-top: 0.375em; margin-bottom: 0.375em; }
        .post-content p  { margin-top: 1.5em; margin-bottom: 1.5em; }
        .post-content p:first-child { margin-top: 0; }
        .post-content p:last-child  { margin-bottom: 0; }
        .post-content li p { margin-top: 0; margin-bottom: 0; }

        .post-content p img { display: block; max-width: 100%; }
        .post-content p[style*="text-align: center"] img { margin-left: auto; margin-right: auto; }
        .post-content p[style*="text-align: right"]  img { margin-left: auto; }

        .post-content hr { border-color: hsl(var(--border)); margin: 2rem 0; }
      `}</style>

      <div
        className="post-content prose prose-neutral dark:prose-invert mt-8 max-w-none
          prose-headings:font-heading prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-left
          prose-p:leading-relaxed prose-p:text-justify prose-p:my-6
          prose-a:text-primary prose-a:no-underline hover:prose-a:underline
          prose-img:rounded-xl prose-img:border prose-img:border-border prose-img:mx-auto
          prose-blockquote:border-l-primary prose-blockquote:not-italic prose-blockquote:text-muted-foreground prose-blockquote:text-left
          prose-code:rounded prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:text-sm prose-code:font-mono
          prose-code:before:content-none prose-code:after:content-none
          prose-pre:rounded-2xl prose-pre:border prose-pre:border-border prose-pre:bg-muted prose-pre:text-left
          prose-hr:border-border"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </>
  );
}
