import type { HeuristicPacksData } from './types';
import localPacks from '../public/heuristic-packs-v2.json';

export async function fetchPacks(): Promise<HeuristicPacksData> {
  const url = process.env.HEURISTIC_PACKS_URL;

  if (url) {
    try {
      const res = await fetch(url, { next: { revalidate: 3600 } });
      if (res.ok) return res.json() as Promise<HeuristicPacksData>;
    } catch {
      // fall through to local
    }
  }

  return localPacks as HeuristicPacksData;
}
