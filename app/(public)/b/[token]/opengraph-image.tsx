import { ImageResponse } from 'next/og';
import { publicClient } from '@/lib/supabase/public';
import { createStudioApi } from '@/lib/studio/api';
import { SHARE_CARD_COLORS as C } from '@/lib/portfolio/share-card';
import { boardCardLine, previewTiles } from '@/lib/studio/board-preview';

// The picture a link to a shared board shows in a chat or a feed: the board's name, its project, how much is on it,
// and up to four of its images. It reads through the same public function as the page, so a closed, expired or
// wrong link gets the plain suite card and reveals nothing about the board.
export const alt = 'A mood board on The Cavern';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const dynamic = 'force-dynamic';

export default async function Image({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = publicClient();
  const board = db && token ? await createStudioApi(db).getSharedBoard(token).catch(() => null) : null;
  let tiles: string[] = [];
  if (db && board) {
    const paths = previewTiles(board, 4);
    if (paths.length) {
      const { data } = await db.storage.from('project-media').createSignedUrls(paths, 600);
      tiles = (data ?? []).filter((r) => r.signedUrl && !r.error).map((r) => r.signedUrl as string);
    }
  }
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: C.ink, color: C.cream, padding: 64 }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 28, color: C.ember, letterSpacing: 4 }}>THE CAVERN · MOOD BOARD</div>
          <div style={{ fontSize: board && board.name.length > 28 ? 64 : 92, fontWeight: 700, letterSpacing: -2, lineHeight: 1.05, marginTop: 20 }}>{board ? board.name : 'The Cavern'}</div>
          <div style={{ fontSize: 34, color: C.ember, marginTop: 16 }}>{board ? boardCardLine(board) : 'by Misfits Cavern'}</div>
        </div>
        {tiles.length > 0 && (
          <div style={{ display: 'flex', gap: 16 }}>
            {tiles.map((src) => (
              <img key={src} src={src} alt="" width={256} height={192} style={{ width: 256, height: 192, objectFit: 'cover', borderRadius: 14 }} />
            ))}
          </div>
        )}
      </div>
    ),
    size,
  );
}
