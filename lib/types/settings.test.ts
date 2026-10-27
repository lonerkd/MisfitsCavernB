import { describe, it, expect } from 'vitest';
import {
  getProjectModules,
  DEFAULT_ECOSYSTEM_MODULES,
  DEFAULT_PROJECT_SETTINGS,
  type ProjectSettings,
  type EcosystemModules,
} from './settings';

describe('getProjectModules', () => {
  it('returns default modules when no settings provided', () => {
    const result = getProjectModules();
    expect(result).toEqual(DEFAULT_ECOSYSTEM_MODULES);
  });

  it('returns default modules when settings is null', () => {
    const result = getProjectModules(null);
    expect(result).toEqual(DEFAULT_ECOSYSTEM_MODULES);
  });

  it('merges provided modules with defaults', () => {
    const settings: ProjectSettings = {
      modules: { scriptos: false } as EcosystemModules,
    };
    const result = getProjectModules(settings);
    expect(result.scriptos).toBe(false);
    expect(result.studio).toBe(true);
    expect(result.lounge).toBe(true);
    expect(result.portfolio).toBe(true);
    expect(result.distribution).toBe(true);
  });

  it('handles undefined modules in settings by using defaults', () => {
    const settings: ProjectSettings = {
      modules: undefined as unknown as EcosystemModules,
    };
    const result = getProjectModules(settings);
    expect(result).toEqual(DEFAULT_ECOSYSTEM_MODULES);
  });

  it('DEFAULT_PROJECT_SETTINGS has correct default modules', () => {
    expect(DEFAULT_PROJECT_SETTINGS.modules).toEqual(DEFAULT_ECOSYSTEM_MODULES);
  });

  it('handles partial module overrides correctly', () => {
    const settings: ProjectSettings = {
      modules: { studio: false, lounge: false } as EcosystemModules,
    };
    const result = getProjectModules(settings);
    expect(result.scriptos).toBe(true);
    expect(result.studio).toBe(false);
    expect(result.lounge).toBe(false);
    expect(result.portfolio).toBe(true);
    expect(result.distribution).toBe(true);
  });

  it('all default modules are enabled by default', () => {
    expect(DEFAULT_ECOSYSTEM_MODULES.scriptos).toBe(true);
    expect(DEFAULT_ECOSYSTEM_MODULES.studio).toBe(true);
    expect(DEFAULT_ECOSYSTEM_MODULES.lounge).toBe(true);
    expect(DEFAULT_ECOSYSTEM_MODULES.portfolio).toBe(true);
    expect(DEFAULT_ECOSYSTEM_MODULES.distribution).toBe(true);
  });

  it('toggles module state correctly when set to true', () => {
    const settings: ProjectSettings = {
      modules: { studio: false } as EcosystemModules,
    };
    const result = getProjectModules(settings);
    expect(result.studio).toBe(false);
    expect(result.scriptos).toBe(true);
  });

  it('disables a module when explicitly set to false', () => {
    const settings: ProjectSettings = {
      modules: { scriptos: false } as EcosystemModules,
    };
    const result = getProjectModules(settings);
    expect(result.scriptos).toBe(false);
    expect(result.studio).toBe(true);
  });

  it('handles undefined modules by falling back to defaults', () => {
    const settings: ProjectSettings = {
      modules: undefined as unknown as EcosystemModules,
    };
    const result = getProjectModules(settings);
    expect(result.scriptos).toBe(true);
    expect(result.studio).toBe(true);
    expect(result.lounge).toBe(true);
    expect(result.portfolio).toBe(true);
    expect(result.distribution).toBe(true);
  });

  it('verifies DEFAULT_ECOSYSTEM_MODULES exports all expected modules', () => {
    expect(DEFAULT_ECOSYSTEM_MODULES).toHaveProperty('scriptos');
    expect(DEFAULT_ECOSYSTEM_MODULES).toHaveProperty('studio');
    expect(DEFAULT_ECOSYSTEM_MODULES).toHaveProperty('lounge');
    expect(DEFAULT_ECOSYSTEM_MODULES).toHaveProperty('portfolio');
    expect(DEFAULT_ECOSYSTEM_MODULES).toHaveProperty('distribution');
  });

  it('returns a new object without mutating the input', () => {
    const settings: ProjectSettings = {
      modules: { scriptos: true, studio: true } as EcosystemModules,
    };
    const result = getProjectModules(settings);
    expect(result).not.toBe(settings.modules);
    expect(result.scriptos).toBe(true);
    expect(result.studio).toBe(true);
  });
});
