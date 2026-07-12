import { StoredScript } from './storage';
import { parseScript } from './parser';
import { jsPDF } from 'jspdf';

export function exportScriptAsText(script: StoredScript, format: 'txt' | 'fountain' = 'txt'): void {
  const blob = new Blob([script.content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${script.title.replace(/[^a-z0-9]/gi, '_')}.${format}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportScriptAsFdx(script: StoredScript): void {
  const result = parseScript(script.content);

  const mapTypeToFdx = (type: string): string => {
    switch (type) {
      case 'slug': return 'Scene Heading';
      case 'action': return 'Action';
      case 'character': return 'Character';
      case 'dialogue': return 'Dialogue';
      case 'parenthetical': return 'Parenthetical';
      case 'transition': return 'Transition';
      default: return 'Action';
    }
  };

  const paragraphs = result.lines
    .filter(line => line.type !== 'empty')
    .map(line => {

      const escapedText = line.text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

      return `    <Paragraph Type="${mapTypeToFdx(line.type)}">
      <Text>${escapedText}</Text>
    </Paragraph>`;
    }).join('\n');

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
          <Text AdornmentStyle="0" Background="#FFFFFFFFFFFF" Color="#000000000000" Font="Courier Final Draft" RevisionID="0" Size="12" Style="">${script.title}</Text>
        </Paragraph>
      </Header>
    </HeaderAndFooter>
    <Content>
      <Paragraph Alignment="Center" FirstIndent="0.00" Leading="Regular" LeftIndent="1.00" RightIndent="7.50" SpaceBefore="0" Spacing="1" StartsNewPage="No">
        <Text AdornmentStyle="0" Background="#FFFFFFFFFFFF" Color="#000000000000" Font="Courier Final Draft" RevisionID="0" Size="24" Style="Bold,Underline">${script.title}</Text>
      </Paragraph>
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

export function exportScriptAsPdf(script: StoredScript, titlePage?: { title?: string; credit?: string; author?: string; draftDate?: string }): void {
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
