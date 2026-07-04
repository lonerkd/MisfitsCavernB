// Guards a Supabase call (or any promise) against hanging forever — a stalled
// connection, a platform-side incident, or a stuck internal lock should never
// leave the UI spinning with no way out. Races the real promise against a
// timeout that rejects with a clear message instead.
export function withTimeout<T>(promise: Promise<T>, ms = 12000, message = 'Request timed out. Please try again.'): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
  ]);
}
