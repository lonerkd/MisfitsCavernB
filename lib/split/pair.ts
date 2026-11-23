// The tool a person keeps beside a project, remembered per project on this device (a device preference, like the offer).
import { projectOf, safePanePath } from './core';

const key = (projectId: string) => `mc_pair_partner_${projectId}`;
const PROJECT_PAGE = /^\/projects\/([^/?#]+)\/?(?:[?#]|$)/;

/** If one pane is a project's own page, the project and the tool in the other pane; otherwise null. */
export function pairOf(a: string, b: string): { projectId: string; partner: string } | null {
  const ma = PROJECT_PAGE.exec(a);
  const mb = PROJECT_PAGE.exec(b);
  if (ma && !mb) return { projectId: decodeURIComponent(ma[1]), partner: b };
  if (mb && !ma) return { projectId: decodeURIComponent(mb[1]), partner: a };
  return null;
}

/** The partner, only when it is a page of that project's own suite (not the project page, not another project's). */
export function validPartner(projectId: string, partner: string | null | undefined): string | null {
  const p = safePanePath(partner, '');
  if (!p || PROJECT_PAGE.test(p)) return null;
  const other = projectOf(p);
  return other && other !== projectId ? null : p;
}

export function readPartner(projectId: string): string | null {
  try { return validPartner(projectId, localStorage.getItem(key(projectId))); } catch { return null; }
}
export function writePartner(projectId: string, partner: string): void {
  const v = validPartner(projectId, partner);
  if (!v) return;
  try { localStorage.setItem(key(projectId), v); } catch { /* blocked: the phase's tool is offered again, which is harmless */ }
}
