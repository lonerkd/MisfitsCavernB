// What the call sheet already says about a day's meals: how many are called, and when the first meal falls due.
// The meal plan starts from these instead of a typed number, and says so when the plan and the sheet part ways.

export interface SheetCall { call_sheet_id: string; character_id?: string | null; character_name?: string | null; crew_user_id?: string | null }
export interface SheetLite { id: string; shoot_day: number; general_call: string | null }
export interface MealSuggestion { headcount: number; mealTime: string; generalCall: string | null }

/** First meal no later than six hours after the general call (a common limit); null when the call time is not a clock time. */
export function firstMealBy(generalCall: string | null | undefined): string | null {
  const m = /^\s*(\d{1,2}):(\d{2})/.exec(generalCall ?? '');
  if (!m) return null;
  const h = Number(m[1]); const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  const total = (h * 60 + min + 6 * 60) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/** People called on the day's sheet: each cast character and each crew member once, however many calls name them. */
export function mealSuggestion(day: number, sheets: readonly SheetLite[], calls: readonly SheetCall[]): MealSuggestion | null {
  const sheet = sheets.find((s) => s.shoot_day === day);
  if (!sheet) return null;
  const who = new Set<string>();
  for (const c of calls) {
    if (c.call_sheet_id !== sheet.id) continue;
    const key = c.crew_user_id ? `u:${c.crew_user_id}` : c.character_id ? `c:${c.character_id}` : c.character_name ? `n:${c.character_name.trim().toUpperCase()}` : '';
    if (key) who.add(key);
  }
  if (who.size === 0) return null;
  return { headcount: who.size, mealTime: firstMealBy(sheet.general_call) ?? '', generalCall: sheet.general_call };
}
