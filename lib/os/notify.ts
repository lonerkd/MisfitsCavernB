type NotifyFn = (message: string, type?: 'success' | 'error' | 'info') => void;

let sink: NotifyFn | null = null;

export function registerOSNotifier(fn: NotifyFn) {
  sink = fn;
}

export function osNotify(message: string, type: 'success' | 'error' | 'info' = 'info') {
  if (sink) sink(message, type);
  else if (type === 'error') console.error(message);
}
