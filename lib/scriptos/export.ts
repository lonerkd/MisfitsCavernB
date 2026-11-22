import { StoredScript } from './storage';
import { parseScript } from './parser';
import { serializeFountain } from './fountain-export';
import { readingFormat } from './reading-format';

/** The export choices a script's format offers: Final Draft (.fdx) has no elements for podcast, copy, video, prose, game or outline scripts. */
export function exportChoicesFor(format: string | null | undefined): string[] {
  return reemitsAsFountain(format) ? ['fountain', 'fdx', 'pdf', 'txt'] : ['pdf', 'txt', 'fountain'];
}

/** Fountain is a screenplay notation: only a screenplay-read script is re-emitted through it. */
export function reemitsAsFountain(format: string | null | undefined): boolean {
  return readingFormat(format) === 'screenplay';
}

export function exportScriptAsText(script: StoredScript, format: 'txt' | 'fountain' = 'txt'): void {
  // '.fountain' downloads a canonically-formatted Fountain document — parse and
  // re-emit — rather than a raw dump, so the file is clean and round-trips.
  // '.txt' is the author's source verbatim, and so is any non-screenplay format (podcast, ad copy, video, prose,
  // game, outline): re-emitting those through screenplay rules would turn their sections into scene headings.
  const text = format === 'fountain' && reemitsAsFountain(script.format) ? serializeFountain(parseScript(script.content).lines) : script.content;
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${script.title.replace(/[^a-z0-9]/gi, '_')}.${format}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const xmlEscape = (t: string): string => t
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

const FDX_TYPE: Record<string, string> = {
  slug: 'Scene Heading', action: 'Action', character: 'Character', dialogue: 'Dialogue',
  parenthetical: 'Parenthetical', transition: 'Transition',
};
/** Sections and synopses have no Final Draft element: they are General paragraphs that keep their Fountain marker, so the importer restores them exactly and they are never part of a scene. */
const GENERAL_TYPES = new Set(['section', 'synopsis']);
const TITLE_KEY = /^([A-Za-z][A-Za-z ]*?)\s*:\s*(.*)$/;
const TITLE_KEYS = /^(title|credit|author|authors|source|notes|draft date|date|contact|copyright|revision|watermark|font|tl|tc|tr|bl|bc|br)$/i;

const fdxParagraph = (type: string, text: string, attrs = ''): string =>
  `    <Paragraph Type="${type}"${attrs}>\n      <Text>${xmlEscape(text)}</Text>\n    </Paragraph>`;

/**
 * The Final Draft XML for a script. Real elements: <DualDialogue> around the two speakers, Alignment="Center"
 * for centered text, a <TitlePage> built from the title-page keys. Notes, forced elements (!, @, ~, > transition),
 * page breaks and boneyard stay as they were (Fountain text in an Action or Transition paragraph): see
 * `.cavern-intelligence/scriptos-engine.md` (FDX).
 */
export function scriptToFdx(script: StoredScript): string {
  const lines = parseScript(script.content).lines.filter((l) => l.type !== 'empty');
  const body = lines.filter((l) => l.type !== 'title');
  const isSpeech = (t: string) => t === 'dialogue' || t === 'parenthetical';

  // A speaker's group: the cue and the parentheticals and dialogue under it.
  const groupEnd = (i: number): number => {
    let j = i + 1;
    while (j < body.length && isSpeech(body[j].type)) j++;
    return j;
  };
  const cueName = (text: string) => text.replace(/\s*\^\s*$/, '');
  const hasCaret = (i: number) => body[i]?.type === 'character' && /\^\s*$/.test(body[i].text);

  const out: string[] = [];
  const speakerParas = (from: number, to: number) => {
    const ps: string[] = [];
    for (let k = from; k < to; k++) ps.push(fdxParagraph(FDX_TYPE[body[k].type], k === from ? cueName(body[k].text) : body[k].text));
    return ps;
  };
  for (let i = 0; i < body.length; ) {
    const line = body[i];
    if (line.type === 'character') {
      const end = groupEnd(i);
      let second = -1;
      if (body[end]?.type === 'dual' && body[end + 1]?.type === 'character') second = end + 1;
      else if (hasCaret(end)) second = end;
      if (second !== -1) {
        const end2 = groupEnd(second);
        out.push(`    <DualDialogue>\n${[...speakerParas(i, end), ...speakerParas(second, end2)].join('\n')}\n    </DualDialogue>`);
        i = end2;
        continue;
      }
    }
    if (line.type === 'centered') {
      out.push(fdxParagraph('Action', line.text.replace(/^>\s*/, '').replace(/\s*<$/, ''), ' Alignment="Center"'));
    } else if (GENERAL_TYPES.has(line.type)) {
      out.push(fdxParagraph('General', line.text));
    } else {
      out.push(fdxParagraph(FDX_TYPE[line.type] ?? 'Action', line.text));
    }
    i++;
  }
  const paragraphs = out.join('\n');

  // The title page: one paragraph per key, title / credit / author / source centered, the rest left. Each key is
  // labelled by an XML comment (Final Draft ignores comments), so the importer maps it back to the Fountain key.
  const titleLines = lines.filter((l) => l.type === 'title');
  const tp = (text: string, label: string, opts: { center: boolean; big?: boolean }) =>
    `      <!--cavern:key=${label}-->\n      <Paragraph Alignment="${opts.center ? 'Center' : 'Left'}" FirstIndent="0.00" Leading="Regular" LeftIndent="1.00" RightIndent="7.50" SpaceBefore="0" Spacing="1" StartsNewPage="No">\n        <Text AdornmentStyle="0" Background="#FFFFFFFFFFFF" Color="#000000000000" Font="Courier Final Draft" RevisionID="0" Size="${opts.big ? 24 : 12}" Style="${opts.big ? 'Bold,Underline' : ''}">${xmlEscape(text)}</Text>\n      </Paragraph>`;
  const titleParas: string[] = [];
  if (titleLines.length) {
    for (const l of titleLines) {
      const m = TITLE_KEY.exec(l.text.trim());
      if (m && TITLE_KEYS.test(m[1].trim()) && !/^\s/.test(l.text)) {
        const key = m[1].trim();
        titleParas.push(tp(m[2], key, { center: /^(title|credit|author|authors|source)$/i.test(key), big: /^title$/i.test(key) }));
      } else {
        titleParas.push(tp(l.text.trim(), '+', { center: false })); // an indented continuation of the key above
      }
    }
  } else {
    // No title page in the source: Final Draft still wants one, so it is built from the script's name. The empty key marks it as generated: it is not imported back.
    titleParas.push(tp(script.title, '', { center: true, big: true }));
  }
  const titleXml = titleParas.join('\n');
  const headerTitle = xmlEscape(script.title);

  const fdxXml = `<?xml version="1.0" encoding="UTF-8" standalone="no" ?>
<FinalDraft DocumentType="Script" Template="No" Version="3">
  <Content>
${paragraphs}
  </Content>
  <ElementSettings Type="Scene Heading">
    <FontSpec AdornmentStyle="0" Background="#FFFFFFFFFFFF" Color="#000000000000" Font="Courier Final Draft" RevisionID="0" Size="12" Style="Bold"/>
    <ParagraphSpec Alignment="Left" FirstIndent="0.00" Leading="Regular" LeftIndent="1.50" RightIndent="7.50" SpaceBefore="24" Spacing="1" StartsNewPage="No"/>
  </ElementSettings>
  <ElementSettings Type="Action">
    <FontSpec AdornmentStyle="0" Background="#FFFFFFFFFFFF" Color="#000000000000" Font="Courier Final Draft" RevisionID="0" Size="12" Style=""/>
    <ParagraphSpec Alignment="Left" FirstIndent="0.00" Leading="Regular" LeftIndent="1.50" RightIndent="7.50" SpaceBefore="12" Spacing="1" StartsNewPage="No"/>
  </ElementSettings>
  <ElementSettings Type="Character">
    <FontSpec AdornmentStyle="0" Background="#FFFFFFFFFFFF" Color="#000000000000" Font="Courier Final Draft" RevisionID="0" Size="12" Style=""/>
    <ParagraphSpec Alignment="Left" FirstIndent="0.00" Leading="Regular" LeftIndent="3.50" RightIndent="7.25" SpaceBefore="12" Spacing="1" StartsNewPage="No"/>
  </ElementSettings>
  <ElementSettings Type="Dialogue">
    <FontSpec AdornmentStyle="0" Background="#FFFFFFFFFFFF" Color="#000000000000" Font="Courier Final Draft" RevisionID="0" Size="12" Style=""/>
    <ParagraphSpec Alignment="Left" FirstIndent="0.00" Leading="Regular" LeftIndent="2.50" RightIndent="6.00" SpaceBefore="0" Spacing="1" StartsNewPage="No"/>
  </ElementSettings>
  <ElementSettings Type="Parenthetical">
    <FontSpec AdornmentStyle="0" Background="#FFFFFFFFFFFF" Color="#000000000000" Font="Courier Final Draft" RevisionID="0" Size="12" Style=""/>
    <ParagraphSpec Alignment="Left" FirstIndent="0.00" Leading="Regular" LeftIndent="3.00" RightIndent="5.50" SpaceBefore="0" Spacing="1" StartsNewPage="No"/>
  </ElementSettings>
  <ElementSettings Type="Transition">
    <FontSpec AdornmentStyle="0" Background="#FFFFFFFFFFFF" Color="#000000000000" Font="Courier Final Draft" RevisionID="0" Size="12" Style="Bold"/>
    <ParagraphSpec Alignment="Right" FirstIndent="0.00" Leading="Regular" LeftIndent="5.50" RightIndent="7.10" SpaceBefore="12" Spacing="1" StartsNewPage="No"/>
  </ElementSettings>
  <TitlePage>
    <HeaderAndFooter FooterFirstPage="Yes" FooterVisible="No" HeaderFirstPage="No" HeaderVisible="Yes" StartingPage="1">
      <Header>
        <Paragraph Alignment="Right" FirstIndent="0.00" Leading="Regular" LeftIndent="1.25" RightIndent="-1.25" SpaceBefore="0" Spacing="1" StartsNewPage="No">
          <Text AdornmentStyle="0" Background="#FFFFFFFFFFFF" Color="#000000000000" Font="Courier Final Draft" RevisionID="0" Size="12" Style="">${headerTitle}</Text>
        </Paragraph>
      </Header>
    </HeaderAndFooter>
    <Content>
${titleXml}
    </Content>
  </TitlePage>
  <SmartType>
    <Characters/>
    <Extensions/>
    <SceneIntros/>
    <Locations/>
    <TimesOfDay/>
    <Transitions/>
  </SmartType>
</FinalDraft>`;
  return fdxXml;
}

export function exportScriptAsFdx(script: StoredScript): void {
  const fdxXml = scriptToFdx(script);
  const blob = new Blob([fdxXml], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${script.title.replace(/[^a-z0-9]/gi, '_')}.fdx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** jsPDF is large and only needed here, so it loads when a PDF is asked for. */
export async function exportScriptAsPdf(script: StoredScript, titlePage?: { title?: string; credit?: string; author?: string; draftDate?: string }): Promise<void> {
  if (!reemitsAsFountain(script.format)) {
    const { exportDocumentPdf } = await import('./export-document-pdf');
    return exportDocumentPdf(script, titlePage);
  }
  const { jsPDF } = await import('jspdf');
  const result = parseScript(script.content);

  const doc = new jsPDF({ unit: 'in', format: 'letter' });
  doc.setFont('courier', 'normal');
  doc.setFontSize(12);

  const PAGE_HEIGHT = 11;
  const TOP_MARGIN = 1;
  const BOTTOM_MARGIN = 1;
  const LEFT_MARGIN = 1.5;
  const LINE_HEIGHT = 12 / 72 * 1.2;
  const CONTENT_BOTTOM = PAGE_HEIGHT - BOTTOM_MARGIN;

  const ELEMENT_LEFT: Record<string, number> = {
    slug: LEFT_MARGIN,
    action: LEFT_MARGIN,
    character: LEFT_MARGIN + 2.2,
    dialogue: LEFT_MARGIN + 1.0,
    parenthetical: LEFT_MARGIN + 1.6,
    transition: 5.5,
    note: LEFT_MARGIN,
  };
  const ELEMENT_WIDTH: Record<string, number> = {
    slug: 6,
    action: 6,
    character: 3,
    dialogue: 3.5,
    parenthetical: 2.5,
    transition: 2,
    note: 6,
  };

  let y = TOP_MARGIN;
  let pageNum = 1;

  const newPage = () => {
    doc.addPage();
    pageNum += 1;
    doc.setFontSize(10);
    doc.text(`${pageNum}.`, 7.5, 0.6, { align: 'right' });
    doc.setFontSize(12);
    y = TOP_MARGIN;
  };

  const ensureSpace = (linesNeeded: number) => {
    if (y + linesNeeded * LINE_HEIGHT > CONTENT_BOTTOM) newPage();
  };

  if (titlePage?.title || script.title) {
    doc.setFontSize(14);
    const title = (titlePage?.title || script.title || 'Untitled').toUpperCase();
    doc.text(title, 4.25, 4.5, { align: 'center' });
    doc.setFontSize(12);
    doc.text(titlePage?.credit || 'Written by', 4.25, 5, { align: 'center' });
    if (titlePage?.author) doc.text(titlePage.author, 4.25, 5.3, { align: 'center' });
    if (titlePage?.draftDate) doc.text(titlePage.draftDate, 4.25, 10, { align: 'center' });
    doc.addPage();
    doc.setFontSize(10);
    doc.text('1.', 7.5, 0.6, { align: 'right' });
    doc.setFontSize(12);
  } else {
    doc.setFontSize(10);
    doc.text('1.', 7.5, 0.6, { align: 'right' });
    doc.setFontSize(12);
  }

  let currentSpeaker: string | null = null;

  for (const line of result.lines) {
    const type = line.type === 'empty' ? 'empty' : line.type;
    if (type === 'empty') {
      y += LINE_HEIGHT;
      continue;
    }
    if (type === 'slug') currentSpeaker = null;
    if (type === 'character') currentSpeaker = line.text.trim().toUpperCase();

    const x = ELEMENT_LEFT[type] ?? LEFT_MARGIN;
    const width = ELEMENT_WIDTH[type] ?? 6;

    let text = line.text;
    if (type === 'slug' || type === 'character' || type === 'transition') text = text.toUpperCase();

    const wrapped: string[] = doc.splitTextToSize(text, width) as string[];

    if (type === 'slug') { ensureSpace(2); y += LINE_HEIGHT; }
    if (type === 'character') { ensureSpace(wrapped.length + 1); y += LINE_HEIGHT; }

    if ((type === 'dialogue' || type === 'parenthetical') && y + wrapped.length * LINE_HEIGHT > CONTENT_BOTTOM && currentSpeaker) {
      doc.text('(MORE)', ELEMENT_LEFT.dialogue, y, { align: 'left' });
      newPage();
      doc.text(`${currentSpeaker} (CONT'D)`, ELEMENT_LEFT.character, y);
      y += LINE_HEIGHT * 1.5;
    } else {
      ensureSpace(wrapped.length);
    }
    for (const wl of wrapped) {
      doc.text(wl, x, y);
      y += LINE_HEIGHT;
    }

    if (type === 'slug' || type === 'dialogue' || type === 'transition') y += LINE_HEIGHT * 0.5;
  }

  doc.save(`${script.title.replace(/[^a-z0-9]/gi, '_')}.pdf`);
}
