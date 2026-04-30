// ============================================================================
// SCRIPTOS SHOOTING SCHEDULE REPORT
// Group scenes by location, INT/EXT, DAY/NIGHT for production planning
// ============================================================================

import type { ScriptLine, Scene } from '@/types/screenplay';

export interface ScheduleGroup {
  label: string;
  scenes: { index: number; heading: string; wordCount: number; characters: string[]; estMinutes: number }[];
  totalWords: number;
  totalMinutes: number;
}

export function generateShootingSchedule(
  lines: ScriptLine[],
  scenes: Scene[]
): { byLocation: ScheduleGroup[]; byTimeOfDay: ScheduleGroup[]; byIntExt: ScheduleGroup[]; summary: ScheduleSummary } {
  
  const locationMap = new Map<string, ScheduleGroup>();
  const todMap = new Map<string, ScheduleGroup>();
  const ieMap = new Map<string, ScheduleGroup>();

  scenes.forEach((scene, i) => {
    const heading = scene.heading || '';
    const upper = heading.toUpperCase();
    
    // Extract location (between prefix and dash)
    const locMatch = upper.match(/(?:INT\.|EXT\.|INT\/EXT\.|INT\.\/?EXT\.)\s*(.+?)(?:\s*-\s*|$)/);
    const location = locMatch ? locMatch[1].trim() : 'UNKNOWN';
    
    // INT/EXT
    let intExt = 'OTHER';
    if (upper.includes('INT') && upper.includes('EXT')) intExt = 'INT/EXT';
    else if (upper.includes('INT')) intExt = 'INT';
    else if (upper.includes('EXT')) intExt = 'EXT';
    
    // Time of day
    const tod = scene.timeOfDay || 'UNSPECIFIED';
    
    const wc = scene.wordCount || 0;
    const est = Math.max(1, Math.round(wc / 185 * 0.8));
    
    const entry = {
      index: i + 1,
      heading,
      wordCount: wc,
      characters: scene.characters || [],
      estMinutes: est,
    };

    // Group by location
    if (!locationMap.has(location)) {
      locationMap.set(location, { label: location, scenes: [], totalWords: 0, totalMinutes: 0 });
    }
    const locGroup = locationMap.get(location)!;
    locGroup.scenes.push(entry);
    locGroup.totalWords += wc;
    locGroup.totalMinutes += est;

    // Group by time of day
    if (!todMap.has(tod)) {
      todMap.set(tod, { label: tod, scenes: [], totalWords: 0, totalMinutes: 0 });
    }
    const todGroup = todMap.get(tod)!;
    todGroup.scenes.push(entry);
    todGroup.totalWords += wc;
    todGroup.totalMinutes += est;

    // Group by INT/EXT
    if (!ieMap.has(intExt)) {
      ieMap.set(intExt, { label: intExt, scenes: [], totalWords: 0, totalMinutes: 0 });
    }
    const ieGroup = ieMap.get(intExt)!;
    ieGroup.scenes.push(entry);
    ieGroup.totalWords += wc;
    ieGroup.totalMinutes += est;
  });

  const totalScenes = scenes.length;
  const totalWords = scenes.reduce((s, sc) => s + (sc.wordCount || 0), 0);
  const uniqueLocations = locationMap.size;
  const uniqueChars = new Set(scenes.flatMap(s => s.characters || [])).size;

  return {
    byLocation: Array.from(locationMap.values()).sort((a, b) => b.scenes.length - a.scenes.length),
    byTimeOfDay: Array.from(todMap.values()).sort((a, b) => b.scenes.length - a.scenes.length),
    byIntExt: Array.from(ieMap.values()).sort((a, b) => b.scenes.length - a.scenes.length),
    summary: { totalScenes, totalWords, uniqueLocations, uniqueChars, estRuntime: Math.round(totalWords / 185 * 0.8) },
  };
}

export interface ScheduleSummary {
  totalScenes: number;
  totalWords: number;
  uniqueLocations: number;
  uniqueChars: number;
  estRuntime: number;
}
