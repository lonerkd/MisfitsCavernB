// Where a textarea's caret is on the screen (for the autocomplete menu): a
// hidden mirror of the textarea's text up to the caret, measured by a marker.

export function caretCoords(ta: HTMLTextAreaElement, pos: number): { top: number; left: number } {
  const rect = ta.getBoundingClientRect();
  const style = window.getComputedStyle(ta);
  const mirror = document.createElement('div');
  const props = ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'textTransform', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'borderTopWidth', 'borderLeftWidth', 'boxSizing'] as const;
  props.forEach((p) => { (mirror.style as unknown as Record<string, string>)[p] = (style as unknown as Record<string, string>)[p]; });
  mirror.style.position = 'absolute';
  mirror.style.visibility = 'hidden';
  mirror.style.whiteSpace = 'pre-wrap';
  mirror.style.wordWrap = 'break-word';
  mirror.style.width = `${ta.clientWidth}px`;
  mirror.textContent = ta.value.substring(0, pos);
  const marker = document.createElement('span');
  marker.textContent = '​';
  mirror.appendChild(marker);
  document.body.appendChild(mirror);
  const top = rect.top - ta.scrollTop + marker.offsetTop + parseFloat(style.lineHeight || '18');
  const left = rect.left + marker.offsetLeft;
  document.body.removeChild(mirror);
  return { top, left };
}
