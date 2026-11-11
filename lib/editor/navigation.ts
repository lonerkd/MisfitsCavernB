// Editor power navigation helpers.

export function scenesForCharacter(scenes: { characters: string[] }[], character: string): number[] {
  const target = character.trim().toUpperCase();
  const out: number[] = [];
  scenes.forEach((s, i) => {
    if (s.characters.some((c) => c.trim().toUpperCase() === target)) out.push(i);
  });
  return out;
}

export function sceneByNumber(scenes: unknown[], n: number): number | null {
  if (n < 1 || n > scenes.length) return null;
  return n - 1;
}
