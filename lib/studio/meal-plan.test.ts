import { describe, expect, it } from 'vitest';
import { firstMealBy, mealSuggestion } from './meal-plan';

describe('meal plan from the call sheet', () => {
  it('first meal six hours after the general call, wrapping past midnight', () => {
    expect(firstMealBy('07:00')).toBe('13:00');
    expect(firstMealBy('7:30 AM')).toBe('13:30');
    expect(firstMealBy('20:15')).toBe('02:15');
    expect(firstMealBy('')).toBeNull();
    expect(firstMealBy('soon')).toBeNull();
    expect(firstMealBy('25:00')).toBeNull();
  });
  it('counts each person once across their calls, on that day only', () => {
    const sheets = [{ id: 'a', shoot_day: 1, general_call: '07:00' }, { id: 'b', shoot_day: 2, general_call: '09:00' }];
    const calls = [
      { call_sheet_id: 'a', crew_user_id: 'u1' }, { call_sheet_id: 'a', crew_user_id: 'u1' },
      { call_sheet_id: 'a', character_id: 'c1' }, { call_sheet_id: 'a', character_name: 'maya ' }, { call_sheet_id: 'a', character_name: 'MAYA' },
      { call_sheet_id: 'b', crew_user_id: 'u2' }, { call_sheet_id: 'a' },
    ];
    expect(mealSuggestion(1, sheets, calls)).toEqual({ headcount: 3, mealTime: '13:00', generalCall: '07:00' });
    expect(mealSuggestion(2, sheets, calls)?.headcount).toBe(1);
    expect(mealSuggestion(3, sheets, calls)).toBeNull();
  });
  it('says nothing when the sheet has no one called yet', () => {
    expect(mealSuggestion(1, [{ id: 'a', shoot_day: 1, general_call: '07:00' }], [])).toBeNull();
  });
});
