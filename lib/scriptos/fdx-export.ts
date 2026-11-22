import { StoredScript } from './storage';
import { parseScript } from './parser';
import { formatEighths } from './timing';

/** The Final Draft writer. Kept apart from export.ts, which every editor surface imports: it loads only when an .fdx is asked for. */
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
  const parsed = parseScript(script.content);
  const lines = parsed.lines.filter((l) => l.type !== 'empty');
  // Scene numbers and lengths, for the programs that build a schedule from the file (Movie Magic Scheduling reads
  // Scene Heading paragraphs). The numbers the writer typed (#12A#) are kept; a script with none gets 1, 2, 3 in order,
  // marked so a re-import does not turn them into typed numbers.
  const sceneOf = new Map<object, { number?: string; eighths?: number }>();
  for (const sc of parsed.scenes) {
    const head = parsed.lines[sc.startIndex];
    if (head) sceneOf.set(head, { number: sc.sceneNumber || undefined, eighths: sc.eighths });
  }
  const anyNumbered = [...sceneOf.values()].some((v) => v.number);
  let ordinal = 0;
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
    const sc = line.type === 'slug' ? sceneOf.get(line) : undefined;
    if (sc) {
      ordinal++;
      const number = anyNumbered ? sc.number : String(ordinal);
      const heading = line.text.replace(/\s*#[\w.-]+#\s*$/, '');
      const length = sc.eighths ? `\n      <SceneProperties Length="${formatEighths(sc.eighths)}" Title=""/>` : '';
      const numAttr = number ? ` Number="${xmlEscape(number)}"` : '';
      out.push(`    <Paragraph Type="Scene Heading"${numAttr}>${length}
      <Text>${xmlEscape(heading)}</Text>
    </Paragraph>`);
    } else if (line.type === 'centered') {
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

  const autoMarker = !anyNumbered && sceneOf.size ? '<!--cavern:autonumbered-->\n' : '';
  const fdxXml = `<?xml version="1.0" encoding="UTF-8" standalone="no" ?>
${autoMarker}<FinalDraft DocumentType="Script" Template="No" Version="3">
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
