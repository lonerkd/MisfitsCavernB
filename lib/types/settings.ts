import { SCRIPT_FORMAT_REGISTRY, SCRIPT_FORMATS, type ScriptFormat } from '@/lib/formats/script-formats';

export interface EcosystemModules {
  scriptos: boolean;
  studio: boolean;
  lounge: boolean;
  portfolio: boolean;
  distribution: boolean;
}

export const DEFAULT_ECOSYSTEM_MODULES: EcosystemModules = {
  scriptos: true,
  studio: true,
  lounge: true,
  portfolio: true,
  distribution: true,
};

export interface ProjectSettings {

  defaultScriptFormat?: ScriptFormat;
  modules: EcosystemModules;
  /** Open every tool now instead of phase by phase (lib/os/progress). */
  unlockAllTools?: boolean;
  /** How many pages the crew shoots in a day, in eighths (stripboard, auto-schedule). */
  dayLengthEighths?: number;
}

export const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  modules: DEFAULT_ECOSYSTEM_MODULES,
};

export function getProjectModules(settings?: ProjectSettings | null): EcosystemModules {
  return { ...DEFAULT_ECOSYSTEM_MODULES, ...(settings?.modules || {}) };
}

export const SCRIPT_FORMAT_LABELS = Object.fromEntries(
  SCRIPT_FORMATS.map((f) => [f, SCRIPT_FORMAT_REGISTRY[f].label]),
) as Record<ScriptFormat, string>;
