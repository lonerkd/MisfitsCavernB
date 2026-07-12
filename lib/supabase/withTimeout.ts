

export function withTimeout<T>(promise: Promise<T>, ms = 12000, message = 'Request timed out. Please try again.'): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
  ]);
}
