// Shared screen-color palette for script line types — used by the editor
// page itself and by the extracted center-stage views (Board/Outline/Stats)
// so scene/character colors stay consistent across every tab.
export const TYPE_COLORS: Record<string, string> = {
  slug: '#fff',
  character: '#ffaa00',
  dialogue: 'var(--fg)',
  parenthetical: 'rgba(224, 221, 174,0.5)',
  transition: '#888',
  action: 'rgba(224, 221, 174,0.75)',
  note: '#eab308',
};
