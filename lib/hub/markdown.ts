// A small markdown reader for hub posts. It produces plain data that the page
// renders as React elements, so a post can never inject HTML. Supported:
// # / ## / ### headings, paragraphs, "- " and "1. " lists, > quotes,
// **bold**, *italic* / _italic_, `code`, and [links](https://…) (http(s) and
// in-app "/" paths only — anything else stays text).

export type Inline =
  | { t: 'text'; v: string }
  | { t: 'strong'; v: Inline[] }
  | { t: 'em'; v: Inline[] }
  | { t: 'code'; v: string }
  | { t: 'link'; href: string; v: Inline[] };

export type Block =
  | { t: 'h'; level: 1 | 2 | 3; v: Inline[] }
  | { t: 'p'; v: Inline[] }
  | { t: 'quote'; v: Inline[] }
  | { t: 'ul' | 'ol'; items: Inline[][] };

export function safeHref(href: string): string | null {
  const h = href.trim();
  if (/^https?:\/\/[^\s]+$/i.test(h)) return h;
  if (/^\/(?!\/)[^\s]*$/.test(h)) return h;
  return null;
}

export function parseInline(src: string): Inline[] {
  const out: Inline[] = [];
  let text = '';
  const flush = () => { if (text) { out.push({ t: 'text', v: text }); text = ''; } };
  let i = 0;
  while (i < src.length) {
    const rest = src.slice(i);
    let m: RegExpMatchArray | null;
    if ((m = rest.match(/^`([^`]+)`/))) { flush(); out.push({ t: 'code', v: m[1] }); i += m[0].length; continue; }
    if ((m = rest.match(/^\*\*(.+?)\*\*/))) { flush(); out.push({ t: 'strong', v: parseInline(m[1]) }); i += m[0].length; continue; }
    if ((m = rest.match(/^(?:\*([^*\s][^*]*?)\*|_([^_\s][^_]*?)_)/))) { flush(); out.push({ t: 'em', v: parseInline(m[1] ?? m[2]) }); i += m[0].length; continue; }
    if ((m = rest.match(/^\[([^\]]+)\]\(([^)\s]+)\)/))) {
      const href = safeHref(m[2]);
      if (href) { flush(); out.push({ t: 'link', href, v: parseInline(m[1]) }); i += m[0].length; continue; }
    }
    text += src[i];
    i += 1;
  }
  flush();
  return out;
}

export function parseMarkdown(src: string): Block[] {
  const blocks: Block[] = [];
  const lines = src.replace(/\r\n?/g, '\n').split('\n');
  let para: string[] = [];
  let list: { t: 'ul' | 'ol'; items: Inline[][] } | null = null;
  const endPara = () => { if (para.length) { blocks.push({ t: 'p', v: parseInline(para.join(' ')) }); para = []; } };
  const endList = () => { if (list) { blocks.push(list); list = null; } };

  for (const raw of lines) {
    const line = raw.trim();
    let m: RegExpMatchArray | null;
    if (!line) { endPara(); endList(); continue; }
    if ((m = line.match(/^(#{1,3})\s+(.+)$/))) { endPara(); endList(); blocks.push({ t: 'h', level: m[1].length as 1 | 2 | 3, v: parseInline(m[2]) }); continue; }
    if ((m = line.match(/^>\s?(.*)$/))) { endPara(); endList(); blocks.push({ t: 'quote', v: parseInline(m[1]) }); continue; }
    const ul = line.match(/^[-*]\s+(.+)$/);
    const ol = line.match(/^\d+[.)]\s+(.+)$/);
    if (ul || ol) {
      endPara();
      const kind = ul ? 'ul' : 'ol';
      if (!list || list.t !== kind) { endList(); list = { t: kind, items: [] }; }
      list.items.push(parseInline((ul ?? ol)![1]));
      continue;
    }
    endList();
    para.push(line);
  }
  endPara();
  endList();
  return blocks;
}

/** Plain text of a body, for previews. */
export function plainText(src: string, max = 200): string {
  const flat = (v: Inline[]): string => v.map((n) => (n.t === 'text' || n.t === 'code' ? n.v : flat(n.v))).join('');
  const text = parseMarkdown(src)
    .map((b) => ('items' in b ? b.items.map(flat).join(' · ') : flat(b.v)))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}
