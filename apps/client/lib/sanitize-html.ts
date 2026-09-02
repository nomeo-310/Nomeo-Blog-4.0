import sanitizeHtml from "sanitize-html";

/**
 * Sanitizes post/article HTML (TipTap output — see StarterKit + Highlight,
 * Image, Link, TextAlign, Underline extensions in
 * app-pages/dashboard/posts/post-editor.tsx) before it is stored. This is
 * rendered with dangerouslySetInnerHTML in app-pages/post/post-content.tsx
 * for every reader of the platform, so it must never retain script/event
 * handler payloads regardless of what the editor UI itself allows through —
 * the API accepts raw HTML directly and isn't limited to what the editor
 * would ever produce.
 */
export function sanitizePostHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      "p", "br", "strong", "b", "em", "i", "u", "s", "mark", "a",
      "ul", "ol", "li", "h1", "h2", "h3", "h4", "h5", "h6",
      "blockquote", "code", "pre", "img", "hr", "span",
    ],
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt", "title", "width", "height"],
      "*": ["style"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedStyles: {
      "*": {
        "text-align": [/^(left|right|center|justify)$/],
      },
    },
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer nofollow" }),
    },
  });
}
