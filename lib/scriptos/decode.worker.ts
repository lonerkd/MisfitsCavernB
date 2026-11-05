// Worker for the deep brain decoder (L4).
// Runs the Viterbi decode off the main thread. Observations carry pre-computed
// evidence (the _is* fields), so the worker only needs to call decodeLabels
// with a dummy evidence object.

import { decodeLabels, type Observation, type Decoded, type Params } from './decode';

type DecodeJob = {
  id: number;
  obs: Observation[];
  params: Params;
};

type DecodeResult = {
  id: number;
  decoded: Decoded;
  error?: string;
};

const dummyEvidence = {
  isCaps: () => false,
  isHeading: () => false,
  isTransition: () => false,
  looksUncasedName: () => false,
  isKnownName: () => false,
  hasExtension: () => false,
  opensWithKnownName: () => false,
  isRejectedName: () => false,
};

self.onmessage = (e: MessageEvent<DecodeJob>) => {
  const job = e.data;
  try {
    const decoded = decodeLabels(job.obs, dummyEvidence, job.params);
    self.postMessage({ id: job.id, decoded } as DecodeResult);
  } catch (err) {
    self.postMessage({ id: job.id, decoded: { states: [], confidence: [], alternatives: [] }, error: String(err) } as DecodeResult);
  }
};

export type { DecodeJob, DecodeResult };