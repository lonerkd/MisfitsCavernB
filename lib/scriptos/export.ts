import { StoredScript } from './storage';
import { parseScript } from './parser';

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
      // Very basic XML escape
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
<FinalDraft DocumentType="Script" Template="No" Version="1">
  <Content>
${paragraphs}
  </Content>
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

export function exportScriptAsPdf(script: StoredScript): void {
  const result = parseScript(script.content);
  
  // Build standard screenplay HTML
  const htmlContent = result.lines.map(line => {
    let style = 'margin-bottom: 0; white-space: pre-wrap; break-inside: avoid; ';
    
    if (line.type === 'slug') style += 'font-weight: bold; text-transform: uppercase; margin-top: 24px; margin-bottom: 8px;';
    else if (line.type === 'character') style += 'margin-left: 20%; margin-right: 20%; margin-top: 16px; text-align: center; text-transform: uppercase;';
    else if (line.type === 'dialogue') style += 'margin-left: 15%; margin-right: 15%; margin-bottom: 12px;';
    else if (line.type === 'parenthetical') style += 'margin-left: 20%; margin-right: 20%; text-align: center; font-style: italic;';
    else if (line.type === 'transition') style += 'text-align: right; text-transform: uppercase; margin-top: 16px; margin-bottom: 16px; font-weight: bold;';
    else if (line.type === 'empty') return '<br/>';
    else style += 'margin-bottom: 12px;'; // action
    
    return `<div style="${style}">${line.text}</div>`;
  }).join('\\n');

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to print PDF.');
    return;
  }

  printWindow.document.write(`
    <html>
      <head>
        <title>${script.title}</title>
        <style>
          @page { size: letter; margin: 1in 1in 1in 1.5in; }
          body { 
            font-family: "Courier Prime", Courier, monospace; 
            font-size: 12pt; 
            line-height: 1.2;
            color: black;
            background: white;
            padding: 0;
            margin: 0;
          }
          .title-page {
            height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            page-break-after: always;
          }
          .title { font-size: 24pt; font-weight: bold; margin-bottom: 24px; text-transform: uppercase; }
          .author { font-size: 12pt; }
          @media print {
            body { -webkit-print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="title-page">
          <div class="title">${script.title}</div>
          <div class="author">Written by<br/>Author</div>
        </div>
        ${htmlContent}
      </body>
    </html>
  `);
  
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
}
