import { ImageResponse } from 'next/og';

// The share card — what a link to The Cavern looks like in a message or a feed.
// The R13 mark (.cavern-intelligence/brand/mark) on night ink, in the house colours.
export const alt = 'The Cavern — by Misfits Cavern';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const POLYS: Array<[string, string]> = [
  ['2,94 9,86 13,87 18,76 21,77 26,62 29,62 32,48 34,49 36,30 37.6,40 38,44 37,56 40,68 37,82 39,94', '#e8431a'],
  ['2,94 9,86 13,87 18,76 21,77 26,62 29,62 30,74 26,86 24,94', '#b8320f'],
  ['36,30 40,40 42,39 46,50 49,49 53,58 56,62 55,74 57,86 56,94 39,94 37,82 40,68 37,56 38,44 37.6,40', '#e0ddae'],
  ['40,68 45,74 55,74 57,86 56,94 39,94 37,82', '#c4c093'],
  ['56,62 60,56 63,57 68,47 71,47 76,38 79,38 84,28 86,28 90,20 89,34 92,48 88,62 91,76 88,94 56,94 57,86 55,74', '#e8431a'],
  ['57,86 70,80 91,76 88,94 56,94', '#b8320f'],
  ['90,20 93,30 95,29 98,44 101,46 104,60 108,62 112,78 118,94 88,94 91,76 88,62 92,48 89,34', '#e0ddae'],
  ['92,48 104,60 108,62 112,78 118,94 88,94 91,76 88,62', '#c4c093'],
  ['36,30 40,40 42,39 43.2,42.4 42,44 41,41.5 39.6,44.5 38.5,42.5 37.6,40', '#fbf8e8'],
  ['90,20 93,30 95,29 96.2,34 94.4,33 92.6,35.6 91.2,33 89.7,34.8 89,34', '#fbf8e8'],
];

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#040710', color: '#e0ddae', gap: 56 }}>
        <svg width="340" height="340" viewBox="0 -7 120 120">
          <circle cx="107" cy="18" r="6" fill="#fbf8e8" />
          <circle cx="109.7" cy="16.08" r="5.04" fill="#040710" />
          {POLYS.map(([points, fill]) => <polygon key={points} points={points} fill={fill} />)}
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 112, fontWeight: 700, letterSpacing: -2, lineHeight: 1 }}>The Cavern</div>
          <div style={{ fontSize: 34, color: '#e8431a', marginTop: 14 }}>by Misfits Cavern</div>
          <div style={{ fontSize: 32, color: '#a8a68a', marginTop: 36, maxWidth: 560, lineHeight: 1.3 }}>
            Script to screen for independent filmmakers, in one connected system.
          </div>
        </div>
      </div>
    ),
    size,
  );
}
