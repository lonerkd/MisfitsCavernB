// The server's clock, in milliseconds. A voice room orders its seats by when
// each person joined; every client corrects its own clock with this so the
// order is the same for everyone (lib/webrtc/serverClock.ts). Nothing private.

export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json({ now: Date.now() }, { headers: { 'Cache-Control': 'no-store' } });
}
