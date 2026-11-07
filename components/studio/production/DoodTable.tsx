'use client';

import React from 'react';
import type { BoardDay, dayOutOfDays } from '@/lib/studio/stripboard';
import b from './stripboard.module.css';

/** The day-out-of-days table: one row per cast member, one column per shoot day. Shared by the Stripboard and the Production tab's view. */
export function DoodTable({ board, dood }: { board: BoardDay[]; dood: ReturnType<typeof dayOutOfDays> }) {
  if (dood.length === 0) {
    return <p className={b.hint}>No cast yet — speaking parts come from the script’s dialogue; they appear here once scenes are scheduled.</p>;
  }
  return (
    <div className={b.dood}>
      <table className={b.doodTable}>
        <caption className="sr-only">Day out of days: S start, W work, H hold, F finish, SF start and finish</caption>
        <thead>
          <tr><th scope="col">Cast</th>{board.map((d) => <th key={d.day} scope="col">{d.day}</th>)}<th scope="col">Days</th></tr>
        </thead>
        <tbody>
          {dood.map((r) => (
            <tr key={r.name}>
              <th scope="row" style={{ fontWeight: 400 }}>{r.name}</th>
              {r.cells.map((c, i) => <td key={i} className={c ? b[`code_${c}`] : undefined}>{c || '·'}</td>)}
              <td>{r.worked}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className={b.legend}>
        <span>S start</span><span>W work</span><span>H hold (paid, not shooting)</span><span>F finish</span><span>SF start & finish</span>
      </div>
    </div>
  );
}
