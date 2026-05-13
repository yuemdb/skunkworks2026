import { fetchPacks } from '@/lib/packs';
import ReviewShell from '@/components/ReviewShell';

export default async function Home() {
  const packs = await fetchPacks();
  return <ReviewShell packs={packs} />;
}
