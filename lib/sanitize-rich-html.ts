const ALLOWED_TAGS = new Set([
  "p", "br", "strong", "b", "em", "i", "u", "s", "strike", "blockquote", "pre", "code",
  "ul", "ol", "li", "h1", "h2", "h3", "h4", "h5", "h6", "table", "thead", "tbody", "tfoot",
  "tr", "th", "td", "colgroup", "col", "a", "span", "div", "hr", "sup", "sub", "img", "mark",
]);

const VOID_TAGS = new Set(["br", "hr", "img", "col"]);
const DROP_CONTENT_TAGS = new Set(["script", "style", "iframe", "object", "embed", "svg", "math", "template"]);
const GLOBAL_ALLOWED_ATTRIBUTES = new Set(["class"]);
const TAG_ALLOWED_ATTRIBUTES: Record<string, Set<string>> = {
  a: new Set(["href", "target", "rel", "title"]),
  img: new Set(["src", "alt", "title", "width", "height"]),
  th: new Set(["colspan", "rowspan", "scope"]),
  td: new Set(["colspan", "rowspan"]),
  col: new Set(["span", "width"]),
  colgroup: new Set(["span"]),
  ol: new Set(["start"]),
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

function sanitizeStyle(value: string, tag: string) {
  const safe: string[] = [];
  for (const declaration of value.split(";")) {
    const [rawProperty, ...rawValue] = declaration.split(":");
    const property = rawProperty?.trim().toLowerCase();
    const cssValue = rawValue.join(":").trim().toLowerCase();
    if (property === "text-align" && ["left", "center", "right", "justify"].includes(cssValue)) {
      safe.push(`text-align:${cssValue}`);
    } else if (tag === "mark" && property === "background-color" &&
      /^(?:#[0-9a-f]{3,8}|rgba?\(\s*[0-9.,%\s]+\))$/i.test(cssValue)) {
      safe.push(`background-color:${cssValue}`);
    } else if (tag === "col" && property === "width" && /^\d{1,4}(?:\.\d+)?(?:px|%)$/.test(cssValue)) {
      safe.push(`width:${cssValue}`);
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
      const style = sanitizeStyle(value, tag);
      if (style) output.push(`style="${escapeAttribute(style)}"`);
      continue;
    }

    const tagAllowed = TAG_ALLOWED_ATTRIBUTES[tag];
    if (!GLOBAL_ALLOWED_ATTRIBUTES.has(name) && !tagAllowed?.has(name)) continue;

    if ((name === "href" || name === "src") && !isSafeUrl(value, tag, name)) continue;

    if ((name === "colspan" || name === "rowspan" || name === "width" || name === "height" || name === "span" || name === "start") && !/^\d{1,4}$/.test(value)) {
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

/** Preserve Tiptap tables; convert the older pipe-separated word bank format
 * only at the start of a blank exercise. Input is sanitized exactly once. */
export function normalizeBlankQuestionHtml(value: string) {
  const safe = sanitizeRichHtml(value).trim();
  const rows: string[][] = [];
  let remaining = safe;
  while (true) {
    const match = remaining.match(/^<p(?:\s[^>]*)?>([^<>]+)<\/p>\s*/i);
    if (!match || !match[1].includes("|")) break;
    const cells = match[1].split("|").map(cell => cell.trim());
    if (cells.length < 2 || cells.some(cell => !cell || /_{2,}/.test(cell)) ||
        (rows.length && cells.length !== rows[0].length)) break;
    rows.push(cells);
    remaining = remaining.slice(match[0].length);
  }
  if (!rows.length) return safe;
  return `<table class="elesson-word-bank" aria-label="Word bank"><tbody>${rows.map(row =>
    `<tr>${row.map(cell => `<td><p style="text-align:center">${cell}</p></td>`).join("")}</tr>`
  ).join("")}</tbody></table>${remaining}`;
}

/** Insert inert anchors only into sanitized text nodes, never into attributes.
 * The client mounts the existing React input controls into these anchors. */
export function prepareRichQuestionAnswers(value: string, count: number, mode: "blanks" | "underlines" = "blanks", appendMissing = false) {
  let html = mode === "blanks" ? normalizeBlankQuestionHtml(value) : sanitizeRichHtml(value);
  let index = 0;
  const anchor = (original: string) => index < count
    ? `<span data-elesson-answer-anchor="${index++}"></span>` : original;
  if (mode === "underlines") {
    html = html.replace(/<u(?:\s[^>]*)?>[\s\S]*?<\/u>/gi, anchor);
  } else {
    // Sanitizer emits quoted attributes. Keep every complete tag untouched.
    html = html.split(/(<(?:[^>"']|"[^"]*"|'[^']*')*>)/g).map((part, i) =>
      i % 2 ? part : part.replace(/_{2,}/g, anchor)
    ).join("");
  }
  if (appendMissing && index === 0 && count > 0) {
    const slot = anchor("");
    html = /<\/p>\s*$/i.test(html) ? html.replace(/<\/p>\s*$/i, `${slot}</p>`) : html + slot;
  }
  return html;
}
