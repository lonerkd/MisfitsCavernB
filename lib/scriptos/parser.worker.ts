import { parseScript, ScriptFormat } from './parser';

self.onmessage = (event: MessageEvent) => {
  const { text, format, learnedNamesArray } = event.data;
  
  const learnedNames = new Set<string>(learnedNamesArray || []);
  
  try {
    const result = parseScript(text, format as ScriptFormat, learnedNames);
    self.postMessage({ success: true, result });
  } catch (error: any) {
    self.postMessage({ success: false, error: error.message });
  }
};
