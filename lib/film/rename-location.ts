// The graph half of renaming a place from the script (the text half is lib/scriptos/rename.ts): the `project_locations` record takes the
// new name, so every scene linked to it, the stripboard, the call sheet and the Locations list follow. A sentence when it cannot.
import { studio } from '@/lib/studio';
import { locationKey } from '@/lib/studio/locations';

export async function renameLocationRecord(projectId: string, from: string, to: string): Promise<string | null> {
  try {
    const places = await studio.listLocations(projectId);
    const row = places.find((p) => locationKey(p.name) === locationKey(from));
    // No record yet (nothing scheduled or pinned there): the text rewrite alone is the rename.
    if (!row) return null;
    await studio.renameLocation(row.id, to);
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : 'Could not rename the location';
  }
}
