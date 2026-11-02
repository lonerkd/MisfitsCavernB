import type { ScriptFormat } from '@/lib/formats/script-formats';

/**
 * Which reading rules a script is read with. The one place that decides it, so the editor and the Studio, the two
 * surfaces that write the scene index, always agree. Copy, podcast and documentary-outline scripts have rules of
 * their own in the parser; every other format (screenplay, teleplay, stage play, treatment, or a script with no
 * format yet) is read as a screenplay.
 */
export function readingFormat(format: string | null | undefined): ScriptFormat {
  return format === 'copy' || format === 'podcast' || format === 'doc-outline' ? format : 'screenplay';
}
