const ALLOWED_TAGS = new Set([
  "p", "br", "strong", "b", "em", "i", "u", "s", "strike", "blockquote", "pre", "code",
  "ul", "ol", "li", "h1", "h2", "h3", "h4", "h5", "h6", "table", "thead", "tbody", "tfoot",
  "tr", "th", "td", "a", "span", "div", "hr", "sup", "sub", "img",
]);

const VOID_TAGS = new Set(["br", "hr", "img"]);
const DROP_CONTENT_TAGS = new Set(["script", "style", "iframe", "object", "embed", "svg", "math", "template"]);
const GLOBAL_ALLOWED_ATTRIBUTES = new Set(["class"]);
const TAG_ALLOWED_ATTRIBUTES: Record<string, Set<string>> = {
  a: new Set(["href", "target", "rel", "title"]),
  img: new Set(["src", "alt", "title", "width", "height"]),
  th: new Set(["colspan", "rowspan", "scope"]),
  td: new Set(["colspan", "rowspan"]),
};

function escapeAttribute(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function isSafeUrl(value: string, tag: string, attribute: string) {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("#") || trimmed.startsWith("/") || trimmed.startsWith("./") || trimmed.startsWith("../")) {
    return true;
  }

  if (tag === "img" && attribute === "src" && /^data:image\/(?:png|jpe?g|gif|webp);base64,/i.test(trimmed)) {
    return true;
  }

  try {
    const url = new URL(trimmed, "https://sanitizer.invalid");
    return ["http:", "https:", "mailto:", "tel:"].includes(url.protocol);
  } catch {
    return false;
  }
}

function sanitizeStyle(value: string) {
  const safe: string[] = [];
  for (const declaration of value.split(";")) {
    const [rawProperty, ...rawValue] = declaration.split(":");
    const property = rawProperty?.trim().toLowerCase();
    const cssValue = rawValue.join(":").trim().toLowerCase();
    if (property === "text-align" && ["left", "center", "right", "justify"].includes(cssValue)) {
      safe.push(`text-align:${cssValue}`);
    }
  }
  return safe.join(";");
}

function parseAttributes(raw: string, tag: string) {
  const output: string[] = [];
  const attributePattern = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match: RegExpExecArray | null;

  while ((match = attributePattern.exec(raw))) {
    const name = match[1].toLowerCase();
    const value = match[2] ?? match[3] ?? match[4] ?? "";

    if (name.startsWith("on")) continue;

    if (name === "style") {
      const style = sanitizeStyle(value);
      if (style) output.push(`style="${escapeAttribute(style)}"`);
      continue;
    }

    const tagAllowed = TAG_ALLOWED_ATTRIBUTES[tag];
    if (!GLOBAL_ALLOWED_ATTRIBUTES.has(name) && !tagAllowed?.has(name)) continue;

    if ((name === "href" || name === "src") && !isSafeUrl(value, tag, name)) continue;

    if ((name === "colspan" || name === "rowspan" || name === "width" || name === "height") && !/^\d{1,4}$/.test(value)) {
      continue;
    }

    if (name === "target" && !["_blank", "_self"].includes(value)) continue;
    if (name === "scope" && !["row", "col", "rowgroup", "colgroup"].includes(value)) continue;

    output.push(`${name}="${escapeAttribute(value)}"`);
  }

  if (tag === "a" && output.some((item) => item === 'target="_blank"')) {
    const relIndex = output.findIndex((item) => item.startsWith("rel="));
    if (relIndex >= 0) output[relIndex] = 'rel="noopener noreferrer"';
    else output.push('rel="noopener noreferrer"');
  }

  return output.length ? ` ${output.join(" ")}` : "";
}

function findTagEnd(value: string, start: number) {
  let quote: string | null = null;
  for (let index = start + 1; index < value.length; index += 1) {
    const char = value[index];
    if (quote) {
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === ">") return index;
  }
  return -1;
}

export function sanitizeRichHtml(value: string) {
  if (!value) return "";

  let output = "";
  let cursor = 0;
  const dropStack: string[] = [];

  while (cursor < value.length) {
    const tagStart = value.indexOf("<", cursor);
    if (tagStart < 0) {
      if (dropStack.length === 0) output += value.slice(cursor);
      break;
    }

    if (dropStack.length === 0) output += value.slice(cursor, tagStart);
    const tagEnd = findTagEnd(value, tagStart);
    if (tagEnd < 0) {
      if (dropStack.length === 0) output += "&lt;" + value.slice(tagStart + 1);
      break;
    }

    const rawTag = value.slice(tagStart + 1, tagEnd).trim();
    cursor = tagEnd + 1;

    if (!rawTag || rawTag.startsWith("!") || rawTag.startsWith("?")) continue;

    const closing = rawTag.startsWith("/");
    const normalized = closing ? rawTag.slice(1).trim() : rawTag;
    const nameMatch = normalized.match(/^([a-zA-Z0-9-]+)/);
    if (!nameMatch) continue;

    const tag = nameMatch[1].toLowerCase();

    if (DROP_CONTENT_TAGS.has(tag)) {
      if (!closing) dropStack.push(tag);
      else if (dropStack.at(-1) === tag) dropStack.pop();
      continue;
    }

    if (dropStack.length > 0 || !ALLOWED_TAGS.has(tag)) continue;

    if (closing) {
      if (!VOID_TAGS.has(tag)) output += `</${tag}>`;
      continue;
    }

    const attributeSource = normalized.slice(nameMatch[0].length);
    const attributes = parseAttributes(attributeSource, tag);
    output += `<${tag}${attributes}>`;
  }

  return output;
}
