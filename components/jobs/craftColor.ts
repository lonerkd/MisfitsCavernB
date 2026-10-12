import { type Craft } from '@/lib/crafts/crafts';

// Crafts (and their colours) come from public.crafts — see lib/crafts.
export const craftColor = (byName: Map<string, Craft>, role: string) => byName.get(role)?.color ?? '#737373';
