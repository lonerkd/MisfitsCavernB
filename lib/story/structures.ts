// Story-structure templates: selectable structures (three-act, five-act,
// hero's journey, story circle, seven-point, beat sheet, free "none").
// Each template is DATA (named beats with a suggested position and a one-line
// purpose). Applied from the story interview (3.25) or the outline; a script
// can also be CHECKED against one (which beats have a scene, which do not —
// a report, never an automatic change).

export type Beat = { name: string; position: number; purpose: string };

export type StoryStructure = {
  id: string;
  name: string;
  description: string;
  beats: Beat[];
};

export const STRUCTURES: StoryStructure[] = [
  {
    id: 'three-act',
    name: 'Three-act',
    description: 'Setup, confrontation, resolution.',
    beats: [
      { name: 'Inciting incident', position: 0.12, purpose: 'The event that starts the story.' },
      { name: 'First plot point', position: 0.25, purpose: 'The protagonist commits to the goal.' },
      { name: 'Midpoint', position: 0.5, purpose: 'A reversal that raises the stakes.' },
      { name: 'Second plot point', position: 0.75, purpose: 'The last piece before the climax.' },
      { name: 'Climax', position: 0.9, purpose: 'The final confrontation.' },
      { name: 'Resolution', position: 1.0, purpose: 'The new normal.' },
    ],
  },
  {
    id: 'five-act',
    name: 'Five-act (Freytag)',
    description: 'Exposition, rising action, climax, falling action, denouement.',
    beats: [
      { name: 'Exposition', position: 0.1, purpose: 'World and characters introduced.' },
      { name: 'Inciting incident', position: 0.2, purpose: 'The disruption.' },
      { name: 'Rising action', position: 0.4, purpose: 'Complications build.' },
      { name: 'Climax', position: 0.6, purpose: 'The turning point.' },
      { name: 'Falling action', position: 0.8, purpose: 'Consequences unfold.' },
      { name: 'Denouement', position: 1.0, purpose: 'Resolution and new equilibrium.' },
    ],
  },
  {
    id: 'heros-journey',
    name: "Hero's journey",
    description: "Campbell's twelve stages.",
    beats: [
      { name: 'Ordinary world', position: 0.05, purpose: 'The hero before the call.' },
      { name: 'Call to adventure', position: 0.12, purpose: 'The challenge appears.' },
      { name: 'Refusal of the call', position: 0.18, purpose: 'Hesitation.' },
      { name: 'Meeting the mentor', position: 0.25, purpose: 'Guidance and a gift.' },
      { name: 'Crossing the threshold', position: 0.3, purpose: 'Entering the special world.' },
      { name: 'Tests, allies, enemies', position: 0.45, purpose: 'Learning the rules.' },
      { name: 'Approach to the inmost cave', position: 0.55, purpose: 'Preparing for the ordeal.' },
      { name: 'Ordeal', position: 0.65, purpose: 'The central crisis.' },
      { name: 'Reward', position: 0.72, purpose: 'Seizing the prize.' },
      { name: 'The road back', position: 0.8, purpose: 'Consequences chase.' },
      { name: 'Resurrection', position: 0.9, purpose: 'Final test, transformed.' },
      { name: 'Return with the elixir', position: 1.0, purpose: 'Bringing the boon home.' },
    ],
  },
  {
    id: 'story-circle',
    name: 'Story circle',
    description: "Dan Harmon's eight-step circle.",
    beats: [
      { name: 'You', position: 0.0, purpose: 'A character in a zone of comfort.' },
      { name: 'Need', position: 0.125, purpose: 'They want something.' },
      { name: 'Go', position: 0.25, purpose: 'They enter an unfamiliar situation.' },
      { name: 'Search', position: 0.375, purpose: 'They adapt.' },
      { name: 'Find', position: 0.5, purpose: 'They get what they wanted.' },
      { name: 'Take', position: 0.625, purpose: 'They pay a heavy price.' },
      { name: 'Return', position: 0.75, purpose: 'They return to the familiar.' },
      { name: 'Change', position: 1.0, purpose: 'They have changed.' },
    ],
  },
  {
    id: 'seven-point',
    name: 'Seven-point structure',
    description: 'Hook, plot turn 1, pinch 1, midpoint, pinch 2, plot turn 2, resolution.',
    beats: [
      { name: 'Hook', position: 0.0, purpose: 'The starting state.' },
      { name: 'Plot turn 1', position: 0.25, purpose: 'The inciting change.' },
      { name: 'Pinch 1', position: 0.375, purpose: 'Pressure from the antagonist.' },
      { name: 'Midpoint', position: 0.5, purpose: 'The protagonist shifts from reactive to proactive.' },
      { name: 'Pinch 2', position: 0.625, purpose: 'Greater pressure, all is lost.' },
      { name: 'Plot turn 2', position: 0.75, purpose: 'The solution appears.' },
      { name: 'Resolution', position: 1.0, purpose: 'The climax and aftermath.' },
    ],
  },
  {
    id: 'beat-sheet',
    name: 'Beat sheet',
    description: 'Save the Cat style beats.',
    beats: [
      { name: 'Opening image', position: 0.0, purpose: 'The before picture.' },
      { name: 'Theme stated', position: 0.05, purpose: 'Someone says the theme.' },
      { name: 'Set-up', position: 0.1, purpose: 'The ordinary world.' },
      { name: 'Catalyst', position: 0.12, purpose: 'The inciting incident.' },
      { name: 'Debate', position: 0.2, purpose: 'Should I go?' },
      { name: 'Break into two', position: 0.25, purpose: 'Decision to act.' },
      { name: 'B story', position: 0.3, purpose: 'The love/friendship thread.' },
      { name: 'Fun and games', position: 0.4, purpose: 'The promise of the premise.' },
      { name: 'Midpoint', position: 0.5, purpose: 'False victory or defeat.' },
      { name: 'Bad guys close in', position: 0.6, purpose: 'Pressure mounts.' },
      { name: 'All is lost', position: 0.7, purpose: 'The whiff of death.' },
      { name: 'Dark night of the soul', position: 0.75, purpose: 'The lowest point.' },
      { name: 'Break into three', position: 0.8, purpose: 'The solution.' },
      { name: 'Finale', position: 0.9, purpose: 'Executing the plan.' },
      { name: 'Final image', position: 1.0, purpose: 'The after picture.' },
    ],
  },
  { id: 'none', name: 'None', description: 'No imposed structure.', beats: [] },
];

export function getStructure(id: string): StoryStructure | undefined {
  return STRUCTURES.find((s) => s.id === id);
}

export type BeatCoverage = { beat: Beat; covered: boolean; nearestSceneIndex: number | null };

/**
 * Check a script against a structure: for each beat, whether a scene exists
 * near its suggested position. `sceneCount` is the total number of scenes;
 * `scenePositions` are 0..1 positions of existing scenes (e.g. index/(n-1)).
 * A beat is "covered" if some scene sits within `tolerance` of its position.
 */
export function checkCoverage(
  structure: StoryStructure,
  scenePositions: number[],
  tolerance = 0.08,
): BeatCoverage[] {
  return structure.beats.map((beat) => {
    let nearest: number | null = null;
    let best = Infinity;
    for (const p of scenePositions) {
      const d = Math.abs(p - beat.position);
      if (d < best) { best = d; nearest = p; }
    }
    const covered = scenePositions.length > 0 && best <= tolerance;
    return { beat, covered, nearestSceneIndex: covered ? scenePositions.indexOf(nearest as number) : null };
  });
}
