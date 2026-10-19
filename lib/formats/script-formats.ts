// The one list of script formats. Pure data, no imports, so the parser, the
// settings labels and the format validation all read the same place.
// Adding a format (say 'audio-play') is one entry here: the ScriptFormat type,
// the labels, the picker and `toProjectFormat`'s validation follow from it.

export const SCRIPT_FORMAT_REGISTRY = {
  screenplay: { label: 'Screenplay' },
  teleplay: { label: 'Teleplay' },
  'stage-play': { label: 'Stage Play' },
  treatment: { label: 'Treatment' },
  podcast: { label: 'Podcast Script' },
  'doc-outline': { label: 'Documentary Outline' },
} as const satisfies Record<string, { label: string }>;

export type ScriptFormat = keyof typeof SCRIPT_FORMAT_REGISTRY;

export const DEFAULT_SCRIPT_FORMAT: ScriptFormat = 'screenplay';

/** Every script format, in registry order. */
export const SCRIPT_FORMATS = Object.keys(SCRIPT_FORMAT_REGISTRY) as ScriptFormat[];

export function isScriptFormat(value: unknown): value is ScriptFormat {
  return typeof value === 'string' && Object.hasOwn(SCRIPT_FORMAT_REGISTRY, value);
}
