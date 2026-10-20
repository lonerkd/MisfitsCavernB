// Rejects with `message` if `promise` hasn't settled within `ms`. The timer is
// started before the race and cleared as soon as either side settles, so a
// fast request leaves no timer running behind it.
export function withTimeout<T>(promise: Promise<T>, ms = 12000, message = 'Request timed out. Please try again.'): Promise<T> {
  let reject!: (e: Error) => void;
  const timedOut = new Promise<never>((_, r) => { reject = r; });
  const timer = setTimeout(() => reject(new Error(message)), ms);
  return Promise.race([promise, timedOut]).finally(() => clearTimeout(timer));
}
