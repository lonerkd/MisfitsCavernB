// What a scene's own words say about safety, read from the script the Studio already holds. The risks a
// production plans for (fire, weapons, stunts, water, heights, animals, children, crowds, intimacy, night
// exteriors) are named in the action lines; this finds them so the Safety tool starts from the script and
// not from a blank page. A suggestion, never a verdict: the person adds it to the plan or ignores it.

export interface SceneLine { type: string; text: string }
export type HazardKind = 'fire' | 'weapons' | 'stunt' | 'vehicle' | 'water' | 'height' | 'animals' | 'minors' | 'crowd' | 'intimacy' | 'night';
export type Severity = 'low' | 'medium' | 'high';
export interface Hazard { kind: HazardKind; hazard: string; severity: Severity; mitigation: string; evidence: string }

const RULES: Array<{ kind: HazardKind; hazard: string; severity: Severity; mitigation: string; re: RegExp }> = [
  { kind: 'fire', hazard: 'Fire, explosion or pyrotechnics', severity: 'high', mitigation: 'Licensed pyrotechnician, fire safety officer and extinguishers on set; cleared perimeter; permit for the location.', re: /\b(fire|flames?|burns?|burning|explod\w*|explosions?|blasts?|molotov|bombs?|gasoline|petrol|firework\w*)\b/i },
  { kind: 'weapons', hazard: 'Weapons and firearms', severity: 'high', mitigation: 'Armourer on set, prop weapons checked and logged, safety briefing before the first take, blanks only by the armourer.', re: /\b(guns?|pistols?|revolvers?|rifles?|shotguns?|shoots?|shooting|gunshots?|gunfire|firearms?|weapons?|knife|knives|blades?|swords?|machetes?)\b/i },
  { kind: 'stunt', hazard: 'Stunt or fight action', severity: 'high', mitigation: 'Stunt coordinator, a rehearsed and choreographed sequence, pads and a medic standing by.', re: /\b(fights?|fighting|brawls?|punch\w*|kicks?|tackl\w*|slams?|thrown|throws? (?:him|her|them)|falls? (?:from|off|down)|jumps? (?:from|off)|leaps?|tumbl\w*|crash\w*|stunts?)\b/i },
  { kind: 'vehicle', hazard: 'Moving vehicles or a chase', severity: 'high', mitigation: 'Picture-vehicle driver and a closed or controlled road; a safety vehicle and locked-off traffic.', re: /\b(chase[sd]?|chasing|speeds?|speeding|skids?|swerves?|motorcycles?|motorbikes?|drives? (?:off|away|fast)|car crash|hit-and-run)\b/i },
  { kind: 'water', hazard: 'Water: swimming, boats or immersion', severity: 'high', mitigation: 'Water safety officer, a rescue boat or diver, wetsuits and warm-up between takes.', re: /\b(swims?|swimming|drown\w*|underwater|submerge\w*|boats?|canoe|kayak|dives? into|river|lake|ocean|sea|waves?|flood\w*|pool)\b/i },
  { kind: 'height', hazard: 'Working at height', severity: 'medium', mitigation: 'Harness and rig by a qualified rigger, a guarded edge, nobody underneath.', re: /\b(roof(?:top)?|ledge|cliff|balcony|bridge|climbs?|climbing|scaffold\w*|ladder|edge of|tower)\b/i },
  { kind: 'animals', hazard: 'Animals on set', severity: 'medium', mitigation: 'Licensed animal handler on set, a quiet area and rest breaks for the animal, no unhandled contact.', re: /\b(dogs?|puppy|horses?|snakes?|wolf|wolves|bears?|cats?|animals?|birds?|bulls?|cows?|spiders?)\b/i },
  { kind: 'minors', hazard: 'Child performers', severity: 'medium', mitigation: 'Licence and chaperone, limited hours, a guardian on set and a quiet space; no stunt or frightening action without a parent consenting.', re: /\b(child|children|kids?|baby|babies|infant|toddler|schoolchildren|teenager)\b/i },
  { kind: 'crowd', hazard: 'Crowd or large background action', severity: 'medium', mitigation: 'Extras wrangler and assistant directors, marked safe routes and exits, a briefing before the take.', re: /\b(crowds?|mobs?|riots?|protest\w*|stampede|stadium|rally|parade|festival|market)\b/i },
  { kind: 'intimacy', hazard: 'Intimate or exposed scene', severity: 'medium', mitigation: 'An intimacy coordinator, a closed set, agreed boundaries in writing and robes between takes.', re: /\b(kiss\w*|sex|naked|nude|undress\w*|strips?|lovemaking|intimate|in bed together)\b/i },
];

const body = (l: SceneLine) => l.type === 'action' || l.type === 'parenthetical' || l.type === 'transition';

/** What the scene's words flag, once each, with the line that said so. The heading's night exterior counts too. */
export function scanScene(lines: readonly SceneLine[]): Hazard[] {
  const found = new Map<HazardKind, Hazard>();
  const heading = (lines[0]?.text ?? '').trim();
  if (/^\s*(?:\d+[A-Z]?\s+)?(EXT\.?|I\/E|INT\.?\/EXT\.?)/i.test(heading) && /\b(NIGHT|DUSK)\b/i.test(heading)) {
    found.set('night', { kind: 'night', hazard: 'Night exterior', severity: 'low', mitigation: 'Lighting plan and generator safety, warm clothing and breaks for the crew, a driver for the way home.', evidence: heading });
  }
  for (const l of lines.slice(1)) {
    if (!body(l)) continue;
    for (const r of RULES) {
      if (found.has(r.kind) || !r.re.test(l.text)) continue;
      found.set(r.kind, { kind: r.kind, hazard: r.hazard, severity: r.severity, mitigation: r.mitigation, evidence: l.text.trim().slice(0, 140) });
    }
  }
  const order: Record<Severity, number> = { high: 0, medium: 1, low: 2 };
  return [...found.values()].sort((a, b) => order[a.severity] - order[b.severity]);
}

/** The place a scene is set in, from its heading: "INT. KITCHEN - NIGHT" gives "KITCHEN". */
export function placeOfHeading(heading: string): string {
  return heading.replace(/^\s*(?:\d+[A-Z]?\s+)?(?:INT\.?\/EXT\.?|I\/E\.?|INT\.?|EXT\.?)\s*/i, '').replace(/\s+-\s+[A-Z ]+$/i, '').trim();
}
