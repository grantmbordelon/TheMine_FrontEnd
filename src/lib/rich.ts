// Bold / italic for report text, stored as light markup: **bold** and _italic_.
// Rendering escapes everything first, so stored text can never inject HTML.

const ITALIC = /(^|[^\w])_([^_\n]+?)_(?=[^\w]|$)/g;

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/** Markup -> safe HTML (newlines stay as text; render inside white-space: pre-wrap). */
export function renderRich(s: string | null | undefined): string {
  return escapeHtml(s || '')
    .replace(/\*\*([\s\S]+?)\*\*/g, '<strong>$1</strong>')
    .replace(ITALIC, '$1<em>$2</em>');
}

// ---- edited DOM -> markup

const isBold = (el: HTMLElement) =>
  el.tagName === 'B' || el.tagName === 'STRONG' || Number(el.style.fontWeight) >= 600 || el.style.fontWeight === 'bold';
const isItalic = (el: HTMLElement) => el.tagName === 'I' || el.tagName === 'EM' || el.style.fontStyle === 'italic';

/** Wrap each line separately, with surrounding spaces kept outside the markers. */
function wrap(inner: string, mark: string): string {
  return inner
    .split('\n')
    .map(line => {
      const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(line)!;
      return m[2] ? `${m[1]}${mark}${m[2]}${mark}${m[3]}` : line;
    })
    .join('\n');
}

function walk(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return (node.textContent || '').replace(/ /g, ' ');
  if (node.nodeType !== Node.ELEMENT_NODE) return '';
  const el = node as HTMLElement;
  if (el.tagName === 'BR') return '\n';
  let inner = '';
  el.childNodes.forEach(child => {
    const t = walk(child);
    // Block children (Chrome sometimes makes <div>s) start on a new line.
    const block = child.nodeType === Node.ELEMENT_NODE && /^(DIV|P)$/.test((child as HTMLElement).tagName);
    inner += block && inner && !inner.endsWith('\n') ? `\n${t}` : t;
  });
  if (isBold(el)) inner = wrap(inner, '**');
  if (isItalic(el)) inner = wrap(inner, '_');
  return inner;
}

export function domToMarkup(root: HTMLElement): string {
  return walk(root)
    .replace(/\*\*\*\*/g, '') // adjacent bold runs: "**a****b**" -> "**ab**"
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}
