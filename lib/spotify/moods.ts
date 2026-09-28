// Moods read from the script, not a fixed menu: each scene's action and
// dialogue are scored against what they describe (a chase, grief, a kiss…),
// the scene takes its strongest mood (or its time of day when nothing stands
// out), and scenes that share a mood are grouped — "Dread · scenes 3, 7, 12"
// — each group a Spotify search for music that fits.

import { parseScript } from '../scriptos/parser';

interface Rule { mood: string; query: string; color: string; re: RegExp }

const RULES: Rule[] = [
  { mood: 'Action', query: 'action chase film score', color: '#ff4500', re: /\b(guns?|shoot\w*|shots?|runs?|running|chase\w*|explo\w+|fights?|fighting|punch\w*|crash\w*|races?|racing|sprints?)\b/g },
  { mood: 'Dread', query: 'dark ambient horror score', color: '#8b0000', re: /\b(blood\w*|scream\w*|shadows?|monsters?|kill\w*|dead|death|body|corpse|knife|creep\w*|scary)\b/g },
  { mood: 'Suspense', query: 'suspense thriller score', color: '#483d8b', re: /\b(whisper\w*|hid(e|es|ing)|footsteps|silen\w+|wait(s|ing)?|watch(es|ing)|freez\w+|sudden\w*|door creaks?)\b/g },
  { mood: 'Grief', query: 'melancholy strings soundtrack', color: '#4169e1', re: /\b(cr(y|ies|ying)|tears?|sad\w*|grie\w+|funeral|loss|lost|alone|lonely|goodbye|heartbr\w+)\b/g },
  { mood: 'Romance', query: 'romantic acoustic soundtrack', color: '#f472b6', re: /\b(kiss\w*|love\w*|embrac\w+|dance\w*|dancing|tender\w*|hold(s)? hands)\b/g },
  { mood: 'Neon', query: 'synthwave cyberpunk soundtrack', color: '#ff00ff', re: /\b(neon|holo\w+|robots?|androids?|cyber\w*|hack\w*|circuits?|space\w*|alien\w*|future)\b/g },
  { mood: 'Wonder', query: 'ethereal ambient soundtrack', color: '#60a5fa', re: /\b(stars?|sky|ocean|sunrise|sunset|glow\w*|shimmer\w*|vast|breathtaking|marvels?)\b/g },
  { mood: 'Comedy', query: 'quirky comedy score', color: '#fbbf24', re: /\b(laugh\w*|jokes?|grin\w*|stumbl\w+|trips|awkward\w*|snort\w*|giggl\w+)\b/g },
];
const BY_TIME: Record<string, { mood: string; query: string; color: string }> = {
  NIGHT: { mood: 'Night', query: 'nocturnal ambient score', color: '#1e3a8a' },
  DAWN: { mood: 'Dawn', query: 'hopeful ambient piano', color: '#f59e0b' },
  DUSK: { mood: 'Dusk', query: 'wistful ambient score', color: '#b45309' },
};
const QUIET = { mood: 'Quiet', query: 'minimal ambient film score', color: '#64748b' };

export interface SceneMood { mood: string; query: string; color: string; strength: number }

/** A scene's mood from its text (heading excluded) and time of day. */
export function sceneMood(body: string, timeOfDay = ''): SceneMood {
  const text = body.toLowerCase();
  let best: SceneMood | null = null;
  for (const r of RULES) {
    const hits = text.match(r.re)?.length ?? 0;
    if (hits && (!best || hits > best.strength)) best = { mood: r.mood, query: r.query, color: r.color, strength: hits };
  }
  if (best) return best;
  const t = BY_TIME[timeOfDay.toUpperCase().trim()];
  return { ...(t ?? QUIET), strength: 0 };
}

export interface MoodGroup { mood: string; query: string; color: string; scenes: Array<{ number: number; heading: string }> }

/** The script's moods, each with the scenes that carry it, most scenes first. */
export function scriptMoods(text: string): MoodGroup[] {
  const parsed = parseScript(text);
  const groups = new Map<string, MoodGroup>();
  parsed.scenes.forEach((sc, i) => {
    const body = parsed.lines.slice(sc.startIndex + 1, sc.endIndex + 1).map((l) => l.text).join('\n');
    const m = sceneMood(body, sc.timeOfDay);
    const g = groups.get(m.mood) ?? { mood: m.mood, query: m.query, color: m.color, scenes: [] };
    g.scenes.push({ number: i + 1, heading: sc.heading });
    groups.set(m.mood, g);
  });
  return [...groups.values()].sort((a, b) => b.scenes.length - a.scenes.length || a.scenes[0].number - b.scenes[0].number);
}
