// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';
import { ScriptAnalytics } from './ScriptAnalytics';
import { EditorRightPanels, type EditorRightPanelsProps } from './EditorSidePanels';
import { parseScript } from '@/lib/scriptos/parser';
import { analyzeCharacters } from '@/lib/scriptos/characters';
import { timeScript, timeCharacters } from '@/lib/scriptos/timing';
import { sceneWordCounts, sceneCharacters, actStructure } from '@/lib/scriptos/sceneviews';
import { getSceneType, sceneTypeColor } from '@/lib/scriptos/sceneVisuals';

afterEach(cleanup);

const SCRIPT = `INT. KITCHEN - DAY

MAYA stirs a pot.

MAYA
Is it ready?

JO
Not yet.

EXT. RIDGE - DAWN

JO climbs.

JO
Almost there.

MAYA
Wait for me.
`;

function build(text = SCRIPT) {
  const result = parseScript(text);
  const lines = result.lines;
  const scenesList = lines.filter((l) => l.type === 'slug');
  const charStats = analyzeCharacters(lines, result.scenes);
  const counts = sceneWordCounts(lines, scenesList);
  const timing = timeScript(lines, []);
  return {
    scenesList, charStats, chars: charStats.map((c) => c.name),
    sceneWordCounts: counts, sceneCharMap: sceneCharacters(lines, scenesList), actStructure: actStructure(counts),
    timing, characterTiming: timeCharacters(lines),
    wordCount: counts.reduce((a, b) => a + b, 0), pageEst: Math.max(1, Math.round(timing.pages)),
    dialogueRatio: 50,
  };
}

const analytics = (over: Partial<React.ComponentProps<typeof ScriptAnalytics>> = {}) => {
  const b = build();
  return (
    <ScriptAnalytics
      currentScriptTitle="Pilot" uniqueLocations={[['KITCHEN', 1], ['RIDGE', 1]]} currentSceneIdx={0} lintIssues={[]}
      onJumpToScene={() => {}} onReadFromScene={() => {}}
      {...b} {...over}
    />
  );
};

describe('ScriptAnalytics (the old centre Stats view, in the Script section)', () => {
  it('keeps the numbers the Stats view showed', () => {
    render(analytics());
    const root = screen.getByTestId('script-analytics');
    for (const label of ['Words', 'Runtime', 'Scenes', 'Cast', 'Balance']) expect(within(root).getAllByText(label).length).toBeGreaterThan(0);
    expect(within(root).getByText('2 locations')).toBeTruthy();
    expect(within(root).getByText('50%')).toBeTruthy();
    expect(within(root).getByText('Pilot')).toBeTruthy();
  });

  it('keeps the runtime region, timeline, presence, dialogue against action, the scene table and the health counts', () => {
    render(analytics({ lintIssues: [{ type: 'error', message: 'x', line: 1 }, { type: 'warning', message: 'y', line: 2 }] as never }));
    expect(screen.getByRole('region', { name: 'Runtime' })).toBeTruthy();
    expect(screen.getByText('Scene Timeline')).toBeTruthy();
    expect(screen.getByText('Character Presence')).toBeTruthy();
    expect(screen.getByText('Dialogue vs Action')).toBeTruthy();
    expect(screen.getByText('Scene Breakdown')).toBeTruthy();
    expect(screen.getByTitle('MAYA in Scene 1')).toBeTruthy();
    const health = screen.getByText('Script Health').parentElement as HTMLElement;
    expect(within(health).getByText('Errors').previousSibling?.textContent).toBe('1');
    expect(within(health).getByText('Warnings').previousSibling?.textContent).toBe('1');
  });

  it('jumps to a scene from the runtime table', () => {
    const onJumpToScene = vi.fn();
    render(analytics({ onJumpToScene }));
    const table = screen.getByRole('table', { name: 'Runtime by scene' });
    fireEvent.click(within(table).getByRole('button', { name: /^2\. EXT\. RIDGE/ }));
    expect(onJumpToScene).toHaveBeenCalledWith(1);
  });

  it('renders for an empty script without breaking', () => {
    const b = build('');
    render(<ScriptAnalytics {...b} currentScriptTitle="Empty" uniqueLocations={[]} currentSceneIdx={-1} lintIssues={[]} onJumpToScene={() => {}} onReadFromScene={() => {}} />);
    expect(screen.getByText('Dialogue vs Action')).toBeTruthy();
    expect(screen.queryByText('Scene Breakdown')).toBeNull();
  });
});

describe('the rail’s Script section', () => {
  const props = (over: Partial<EditorRightPanelsProps> = {}): EditorRightPanelsProps => {
    const b = build();
    return {
      rightPanel: 'script', setRightPanel: () => {}, activeView: 'write', currentSceneIdx: 0, scenesList: b.scenesList,
      getSceneType, sceneTypeColor, sceneWordCounts: b.sceneWordCounts, sceneCharMap: b.sceneCharMap as never, insertElement: () => {},
      writingPanel: null, wordCount: b.wordCount, pageEst: b.pageEst, dialogueRatio: 50, typewriterMode: false, setTypewriterMode: () => {},
      nightModePreview: false, setNightModePreview: () => {}, chars: b.chars, charStats: b.charStats, handleLockRevision: () => {},
      revisions: [], onViewRevision: () => {}, setContent: () => {}, toast: () => {}, showSceneNumbers: false, setShowSceneNumbers: () => {},
      showWatermark: false, setShowWatermark: () => {}, lintIssues: [], stash: { rows: [], status: 'ready' } as never,
      textareaRef: { current: null }, currentScript: { title: 'Pilot', id: 's' },
      ...over,
    };
  };

  it('shows the analytics as a collapsible section of Script', () => {
    render(<EditorRightPanels {...props({ analyticsPanel: <div data-testid="a">numbers</div> })} />);
    expect(screen.getByRole('button', { name: 'Script', pressed: true })).toBeTruthy();
    expect(screen.getByTestId('a')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Analytics' }));
    expect(screen.queryByTestId('a')).toBeNull();
  });

  it('does not render the analytics on the other sections', () => {
    render(<EditorRightPanels {...props({ rightPanel: 'scene', analyticsPanel: <div data-testid="a" /> })} />);
    expect(screen.queryByTestId('a')).toBeNull();
  });
});
