// A campaign's deliverables printed through the print kit: the project's own colour and logo, one piece per page, any language (the
// browser prints with the system's fonts, so a headline in Arabic or Japanese prints as written, which the old built-in PDF font could not).
// Pure.
import type { PrintBlock, PrintDoc } from '@/lib/print/kit';
import type { PieceView } from './export';

export interface CampaignPrintInput {
  campaign: string;
  views: PieceView[];
  accent?: string | null;
  logo?: string | null;
  generated: string;
}

export function campaignDoc(i: CampaignPrintInput): PrintDoc {
  const name = i.campaign.trim() || 'Campaign';
  const blocks: PrintBlock[] = [];
  i.views.forEach((v, index) => {
    if (index > 0) blocks.push({ type: 'pageBreak' });
    const inner: PrintBlock[] = [{ type: 'facts', items: [['Format', v.kindLabel], ['Status', v.status]] }];
    for (const l of v.limits) inner.push({ type: 'text', text: l });
    for (const sec of v.sections) inner.push({ type: 'section', title: sec.label, blocks: [{ type: 'text', text: sec.text }] });
    if (v.notes) inner.push({ type: 'section', title: 'Notes', blocks: [{ type: 'text', text: v.notes }] });
    blocks.push({ type: 'section', title: v.title, blocks: inner });
  });
  if (!i.views.length) blocks.push({ type: 'note', text: 'No deliverables yet.' });
  return {
    title: i.views.length === 1 ? i.views[0].title : `${name} deliverables`,
    kind: name,
    meta: [['Pieces', i.views.length]],
    accent: i.accent, logo: i.logo,
    blocks,
    footer: name,
    generated: i.generated,
  };
}
