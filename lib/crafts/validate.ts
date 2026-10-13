// Checks a craft before it is saved (public.crafts, admin-written). Pure.

export interface CraftInput { name: string; department: string; color: string; above_the_line: boolean }
export type CraftCheck = { ok: true; value: CraftInput } | { ok: false; error: string };

const HEX = /^#[0-9a-f]{6}$/i;

export function checkCraft(input: { name: string; department: string; color: string; above_the_line?: boolean }, existing: string[] = []): CraftCheck {
  const name = input.name.trim().replace(/\s+/g, ' ');
  const department = input.department.trim().replace(/\s+/g, ' ');
  if (!name) return { ok: false, error: 'Give the craft a name.' };
  if (name.length > 40) return { ok: false, error: 'Keep the name under 40 characters.' };
  if (!department) return { ok: false, error: 'Pick or type a department.' };
  if (department.length > 40) return { ok: false, error: 'Keep the department under 40 characters.' };
  if (!HEX.test(input.color)) return { ok: false, error: 'Colour must be a hex value like #e8431a.' };
  if (existing.some((n) => n.toLowerCase() === name.toLowerCase())) return { ok: false, error: `“${name}” is already a craft.` };
  return { ok: true, value: { name, department, color: input.color.toLowerCase(), above_the_line: !!input.above_the_line } };
}
