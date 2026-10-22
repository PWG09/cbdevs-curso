import DOMPurify from "dompurify";

const ALLOWED_TAGS = ["h2", "h3", "h4", "p", "br", "strong", "b", "em", "i", "u", "s", "ul", "ol", "li", "a", "blockquote", "code", "pre", "hr", "span", "div"];
const ALLOWED_ATTR = ["href", "target", "rel"];
const SAFE_HREF = /^(https:|mailto:|#)/i;

let configured = false;

function configure() {
  if (configured) return;
  configured = true;
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (node.tagName !== "A") return;
    const href = node.getAttribute("href") ?? "";
    if (!SAFE_HREF.test(href.trim())) {
      node.removeAttribute("href");
      return;
    }
    if (/^https:/i.test(href)) {
      node.setAttribute("target", "_blank");
      node.setAttribute("rel", "noopener noreferrer nofollow");
    } else {
      node.removeAttribute("target");
      node.removeAttribute("rel");
    }
  });
}

/**
 * Sanitizes rich lesson text written by course staff before it is rendered for students.
 * Only basic formatting tags survive; scripts, event handlers, styles, iframes and non-https
 * links are removed. Returns an empty string outside the browser so nothing unsanitized is
 * ever rendered during server pre-rendering.
 */
export function sanitizeLessonHtml(html: unknown): string {
  if (typeof html !== "string" || !html) return "";
  if (typeof window === "undefined" || !DOMPurify.isSupported) return "";
  configure();
  return DOMPurify.sanitize(html.slice(0, 200_000), {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
  });
}
