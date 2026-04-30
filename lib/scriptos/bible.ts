// ============================================================================
// SCRIPTOS CHARACTER BIBLE
// Manage character profiles, backstories, and notes
// ============================================================================

export interface CharacterProfile {
  name: string;
  fullName: string;
  age: string;
  description: string;
  backstory: string;
  motivation: string;
  arc: string;
  relationships: string;
  notes: string;
  color: string;
}

const PROFILE_KEY = 'scriptos_char_profiles';

const PROFILE_COLORS = [
  '#ff3c00', '#0099ff', '#00cc66', '#ff6b9d', '#ffd43b',
  '#a855f7', '#f97316', '#06b6d4', '#ec4899', '#84cc16',
];

export function getDefaultProfile(name: string, index: number): CharacterProfile {
  return {
    name,
    fullName: '',
    age: '',
    description: '',
    backstory: '',
    motivation: '',
    arc: '',
    relationships: '',
    notes: '',
    color: PROFILE_COLORS[index % PROFILE_COLORS.length],
  };
}

export function saveCharacterProfiles(scriptId: string, profiles: CharacterProfile[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`${PROFILE_KEY}_${scriptId}`, JSON.stringify(profiles));
}

export function loadCharacterProfiles(scriptId: string): CharacterProfile[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(`${PROFILE_KEY}_${scriptId}`);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

// Merge detected characters with stored profiles
export function mergeProfiles(
  detectedNames: string[],
  storedProfiles: CharacterProfile[]
): CharacterProfile[] {
  const profileMap = new Map(storedProfiles.map(p => [p.name.toUpperCase(), p]));
  const merged: CharacterProfile[] = [];
  
  detectedNames.forEach((name, i) => {
    const key = name.toUpperCase();
    if (profileMap.has(key)) {
      merged.push(profileMap.get(key)!);
    } else {
      merged.push(getDefaultProfile(name, i));
    }
  });
  
  return merged;
}
