import { fetchPacks } from '../packs';
import localPacks from '../../public/heuristic-packs-v2.json';

const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockClear();
  delete process.env.HEURISTIC_PACKS_URL;
});

test('returns local packs when HEURISTIC_PACKS_URL is not set', async () => {
  const data = await fetchPacks();
  expect(data.packs).toHaveLength(localPacks.packs.length);
  expect(mockFetch).not.toHaveBeenCalled();
});

test('fetches from primary URL when env var is set and fetch succeeds', async () => {
  process.env.HEURISTIC_PACKS_URL = 'https://raw.example.com/packs.json';
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      schema_version: '2.0',
      packs: [{ pack_id: 'test', pack_name: 'Test', description: '', rules: [] }],
    }),
  });

  const data = await fetchPacks();
  expect(data.packs[0].pack_id).toBe('test');
  expect(mockFetch).toHaveBeenCalledWith(
    'https://raw.example.com/packs.json',
    expect.objectContaining({ next: { revalidate: 3600 } })
  );
});

test('falls back to local packs when fetch fails', async () => {
  process.env.HEURISTIC_PACKS_URL = 'https://raw.example.com/packs.json';
  mockFetch.mockRejectedValueOnce(new Error('Network error'));

  const data = await fetchPacks();
  expect(data.packs).toHaveLength(localPacks.packs.length);
});

test('falls back to local packs when fetch returns non-ok status', async () => {
  process.env.HEURISTIC_PACKS_URL = 'https://raw.example.com/packs.json';
  mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

  const data = await fetchPacks();
  expect(data.packs).toHaveLength(localPacks.packs.length);
});
