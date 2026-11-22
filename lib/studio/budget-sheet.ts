// The budget as a spreadsheet Excel opens: "SpreadsheetML 2003", one XML file, no library. Laid out like the budget Movie Magic Budgeting
// exports to Excel: an account, a category, a description and the amounts, in above-the-line and below-the-line groups with a total per
// category and per group, then a grand total. Numbers are real numbers (the sheet can be summed again) and every total comes from the
// figures the budget screen shows (`moneySummary`), so the file and the screen cannot disagree. Pure: the download is `lib/print/download.ts`.
//
// Account numbers are ours (above the line 1100, 1200 ...; below the line 2100, 2200 ... one per category), not Movie Magic's chart of
// accounts: the project does not hold one.

export interface BudgetSheetLine {
  category: string;
  description?: string | null;
  /** Planned is the base plus the fringe. `base` and `fringe` are given when the budget has fringes: the sheet then shows them as columns. */
  planned: number;
  base?: number;
  fringe?: number;
  committed: number;
  paid: number;
  left: number;
  above?: boolean;
}

export interface BudgetSheetInput {
  project: string;
  lines: BudgetSheetLine[];
  totals: { planned: number; committed: number; paid: number; left: number };
  /** Approved labour counted in "paid", when there is some. */
  labourPaid: number;
  /** Committed and paid money not on any budget line. */
  unassigned: { committed: number; paid: number };
  generated: string;
}

const xmlEscape = (t: string): string => t
  // Characters XML 1.0 cannot hold at all.
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

/** Text a spreadsheet could run as a formula (= + - @, or a tab or return first) gets a leading apostrophe, so a typed
 *  "=HYPERLINK(...)" is shown as text and never run. */
export function safeText(v: string): string {
  return /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
}

const str = (v: string, style?: string) => `<Cell${style ? ` ss:StyleID="${style}"` : ''}><Data ss:Type="String">${xmlEscape(safeText(v))}</Data></Cell>`;
const num = (v: number, style = 'num') => `<Cell ss:StyleID="${style}"><Data ss:Type="Number">${Number.isFinite(v) ? v : 0}</Data></Cell>`;
const blank = (style?: string) => `<Cell${style ? ` ss:StyleID="${style}"` : ''}/>`;
const row = (cells: string[]) => `<Row>${cells.join('')}</Row>`;
const cents = (v: number) => Math.round(v * 100) / 100;

const HEAD = ['Account', 'Category', 'Description', 'Planned', 'Committed', 'Paid', 'Left (negative is over)'];
const HEAD_FRINGED = ['Account', 'Category', 'Description', 'Base', 'Fringe', 'Planned', 'Committed', 'Paid', 'Left (negative is over)'];

export function budgetSpreadsheetXml(i: BudgetSheetInput): string {
  const rows: string[] = [];
  rows.push(row([str(i.project, 'title')]));
  rows.push(row([str(`Budget vs spend, ${i.generated}`, 'muted')]));
  rows.push(row([]));
  // A budget with no fringes keeps the sheet exactly as it was; with fringes, Base and Fringe columns come before Planned (= base + fringe).
  const fringed = i.lines.some((l) => (l.fringe ?? 0) !== 0);
  const cols = fringed ? 9 : 7;
  rows.push(row((fringed ? HEAD_FRINGED : HEAD).map((h, k) => str(h, k >= 3 ? 'headr' : 'head'))));

  const sum = (ls: BudgetSheetLine[], k: 'planned' | 'committed' | 'paid' | 'left') => cents(ls.reduce((n, l) => n + l[k], 0));
  const baseOf = (l: BudgetSheetLine) => l.base ?? l.planned - (l.fringe ?? 0);
  const baseSum = (ls: BudgetSheetLine[]) => cents(ls.reduce((n, l) => n + baseOf(l), 0));
  const fringeSum = (ls: BudgetSheetLine[]) => cents(ls.reduce((n, l) => n + (l.fringe ?? 0), 0));
  const totalRow = (label: string, ls: BudgetSheetLine[], style: string) =>
    row([blank(style), str(label, style), blank(style), ...(fringed ? [num(baseSum(ls), `${style}n`), num(fringeSum(ls), `${style}n`)] : []), num(sum(ls, 'planned'), `${style}n`), num(sum(ls, 'committed'), `${style}n`), num(sum(ls, 'paid'), `${style}n`), num(sum(ls, 'left'), `${style}n`)]);

  const anyAbove = i.lines.some((l) => l.above);
  const groups: Array<{ title: string; base: number; lines: BudgetSheetLine[] }> = anyAbove
    ? [{ title: 'Above the line', base: 1000, lines: i.lines.filter((l) => l.above) }, { title: 'Below the line', base: 2000, lines: i.lines.filter((l) => !l.above) }]
    : [{ title: 'Budget', base: 1000, lines: i.lines }];

  for (const g of groups) {
    if (!g.lines.length) continue;
    rows.push(row([str(g.title.toUpperCase(), 'group'), ...Array.from({ length: cols - 1 }, () => blank('group'))]));
    const cats: string[] = [];
    for (const l of g.lines) if (!cats.includes(l.category)) cats.push(l.category);
    cats.forEach((cat, ci) => {
      const ls = g.lines.filter((l) => l.category === cat);
      const account = String(g.base + (ci + 1) * 100);
      ls.forEach((l, li) => rows.push(row([
        str(String(Number(account) + li + 1)), str(cat), str(l.description ?? ''),
        ...(fringed ? [num(baseOf(l)), num(l.fringe ?? 0)] : []),
        num(l.planned), num(l.committed), num(l.paid), num(l.left),
      ])));
      rows.push(totalRow(`Total ${cat}`, ls, 'sub'));
    });
    rows.push(totalRow(`Total ${g.title}`, g.lines, 'tot'));
  }

  if (i.unassigned.committed || i.unassigned.paid) {
    rows.push(row([blank(), str('Not on a budget line'), str('Committed and paid money charged to no line'), ...(fringed ? [num(0), num(0)] : []), num(0), num(i.unassigned.committed), num(i.unassigned.paid), num(cents(-i.unassigned.committed - i.unassigned.paid))]));
  }
  if (i.labourPaid) {
    rows.push(row([blank(), str('Approved labour'), str('Approved timesheet hours at their rates'), ...(fringed ? [num(0), num(0)] : []), num(0), num(0), num(i.labourPaid), num(cents(-i.labourPaid))]));
  }
  rows.push(row([blank('grand'), str('GRAND TOTAL', 'grand'), blank('grand'), ...(fringed ? [num(baseSum(i.lines), 'grandn'), num(fringeSum(i.lines), 'grandn')] : []), num(i.totals.planned, 'grandn'), num(i.totals.committed, 'grandn'), num(i.totals.paid, 'grandn'), num(i.totals.left, 'grandn')]));

  const numStyle = (id: string, bold: boolean, fill?: string) => `<Style ss:ID="${id}"><Alignment ss:Horizontal="Right"/>${fill ? `<Interior ss:Color="${fill}" ss:Pattern="Solid"/>` : ''}<Font ss:FontName="Calibri" ss:Size="11"${bold ? ' ss:Bold="1"' : ''}/><NumberFormat ss:Format="#,##0.00;[Red]\\-#,##0.00"/></Style>`;
  const fillStyle = (id: string, fill: string) => `<Style ss:ID="${id}"><Interior ss:Color="${fill}" ss:Pattern="Solid"/><Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1"/></Style>`;
  const styles = [
    '<Style ss:ID="Default" ss:Name="Normal"><Font ss:FontName="Calibri" ss:Size="11"/></Style>',
    `<Style ss:ID="title"><Font ss:FontName="Calibri" ss:Size="16" ss:Bold="1"/></Style>`,
    `<Style ss:ID="muted"><Font ss:FontName="Calibri" ss:Size="10" ss:Color="#666666"/></Style>`,
    `<Style ss:ID="head"><Interior ss:Color="#D9D9D9" ss:Pattern="Solid"/><Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1"/></Style>`,
    `<Style ss:ID="headr"><Alignment ss:Horizontal="Right"/><Interior ss:Color="#D9D9D9" ss:Pattern="Solid"/><Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1"/></Style>`,
    fillStyle('group', '#EDEDED'), fillStyle('sub', '#F7F7F7'), fillStyle('tot', '#E2E2E2'), fillStyle('grand', '#C9C9C9'),
    numStyle('num', false), numStyle('subn', true, '#F7F7F7'), numStyle('totn', true, '#E2E2E2'), numStyle('grandn', true, '#C9C9C9'),
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Styles>${styles.join('')}</Styles>
<Worksheet ss:Name="Budget"><Table>
<Column ss:Width="70"/><Column ss:Width="160"/><Column ss:Width="260"/>${fringed ? '<Column ss:Width="90"/><Column ss:Width="90"/>' : ''}<Column ss:Width="90"/><Column ss:Width="90"/><Column ss:Width="90"/><Column ss:Width="140"/>
${rows.join('\n')}
</Table></Worksheet>
</Workbook>
`;
}

/** "budget-my-film.xml": letters, digits and dashes. */
export function budgetSpreadsheetName(project: string): string {
  const base = project.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
  return `budget-${base || 'project'}.xml`;
}
