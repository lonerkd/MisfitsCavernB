import type { ScriptFormat } from '@/lib/scriptos/parser';

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
}

export const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  modules: DEFAULT_ECOSYSTEM_MODULES,
};

export function getProjectModules(settings?: ProjectSettings | null): EcosystemModules {
  return { ...DEFAULT_ECOSYSTEM_MODULES, ...(settings?.modules || {}) };
}

export const SCRIPT_FORMAT_LABELS: Record<ScriptFormat, string> = {
  screenplay: 'Screenplay',
  teleplay: 'Teleplay',
  'stage-play': 'Stage Play',
  treatment: 'Treatment',
  podcast: 'Podcast Script',
  'doc-outline': 'Documentary Outline',
};
