'use client';
import { useMediaQuery } from '@/lib/hooks/useMediaQuery';
import { useFlag } from '@/components/Flag';
import { FINE_POINTER_QUERY, NARROW_QUERY, islandSurface, type IslandSurface } from './compact';

/** Which presentation of the island this window gets, kept current. */
export function useIslandSurface(): IslandSurface {
  const v2 = useFlag('island_v2');
  const narrow = useMediaQuery(NARROW_QUERY);
  const finePointer = useMediaQuery(FINE_POINTER_QUERY);
  return islandSurface({ v2, narrow, finePointer });
}
