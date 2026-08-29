import sanitizeHtml from "sanitize-html";

/**
 * Sanitizes admin-authored HTML (email campaign bodies) before it is stored.
 * This content is later rendered with dangerouslySetInnerHTML both in the
 * admin dashboard preview and in outbound campaign emails, so it must never
 * retain script/event-handler payloads — any admin with canCreateCampaign
 * (not just super_admin) can submit this field.
 */
export function sanitizeCampaignHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      "p", "br", "strong", "b", "em", "i", "u", "s", "a", "ul", "ol", "li",
      "h1", "h2", "h3", "h4", "blockquote", "img", "span", "div", "table",
      "thead", "tbody", "tr", "td", "th", "hr",
    ],
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt", "title", "width", "height"],
      "*": ["style"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedStyles: {
      "*": {
        color: [/.*/],
        "text-align": [/.*/],
        "font-weight": [/.*/],
        "font-style": [/.*/],
      },
    },
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }),
    },
  });
}
