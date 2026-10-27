export const COPY_SECTIONS = ['HEADLINE', 'VISUAL', 'VO', 'SFX', 'BODY', 'CTA'] as const;
export type CopySection = (typeof COPY_SECTIONS)[number];
export type CopyBlocks = Record<CopySection, string>;

const EMPTY_BLOCKS: CopyBlocks = {
  HEADLINE: '',
  VISUAL: '',
  VO: '',
  SFX: '',
  BODY: '',
  CTA: '',
};

export function parseCopy(content: string): CopyBlocks {
  const blocks = { ...EMPTY_BLOCKS };
  let section: CopySection = 'BODY';
  const values = new Map<CopySection, string[]>();

  for (const line of content.replace(/\r\n?/g, '\n').split('\n')) {
    const header = /^#\s*(HEADLINE|VISUAL|VO|SFX|BODY|CTA)\s*$/i.exec(line.trim());
    if (header) {
      section = header[1].toUpperCase() as CopySection;
      if (!values.has(section)) values.set(section, []);
      continue;
    }
    const lines = values.get(section) ?? [];
    lines.push(line);
    values.set(section, lines);
  }

  for (const key of COPY_SECTIONS) {
    blocks[key] = (values.get(key) ?? []).join('\n').trim();
  }
  return blocks;
}

export function serializeCopy(blocks: CopyBlocks): string {
  return COPY_SECTIONS.map((section) => `# ${section}\n${blocks[section].trim()}`).join('\n\n');
}

export function copyText(blocks: CopyBlocks): string {
  return COPY_SECTIONS.map((section) => blocks[section]).filter(Boolean).join('\n');
}

export function characterCount(text: string): number {
  return Array.from(text).length;
}

export function spokenWords(blocks: CopyBlocks): number {
  return `${blocks.VO} ${blocks.BODY}`.trim().split(/\s+/).filter(Boolean).length;
}

export function estimateSeconds(words: number, wordsPerSecond = 2.5): number {
  if (!Number.isFinite(words) || words <= 0 || !Number.isFinite(wordsPerSecond) || wordsPerSecond <= 0) return 0;
  return Math.ceil(words / wordsPerSecond);
}
