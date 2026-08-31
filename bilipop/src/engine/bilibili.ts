import { md5 } from './md5';

const MIXIN_TAB = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49, 33,
  9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40, 61, 26,
  17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36, 20, 34,
  44, 52,
];

const USER_AGENT =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';

export type HarvestedVideo = {
  title: string;
  tags: string[];
  plays: number;
  bvid: string;
};

export type HarvestResult = {
  videos: HarvestedVideo[];
  suggestions: string[];
};

type NavResponse = {
  data?: {
    wbi_img?: {
      img_url?: string;
      sub_url?: string;
    };
  };
};

type SearchResponse = {
  code?: number;
  data?: {
    result?: SearchItem[];
  };
};

type SearchItem = {
  type?: string;
  bvid?: string;
  title?: string;
  tag?: string;
  play?: number;
};

type SuggestTag = {
  value?: string;
  term?: string;
};

type SuggestResponse = {
  result?: {
    tag?: SuggestTag[];
  };
};

let cachedMixin: { key: string; until: number } | null = null;

function mixinKey(orig: string): string {
  return MIXIN_TAB.map((index) => orig[index] ?? '')
    .join('')
    .slice(0, 32);
}

function keyFromUrl(url: string): string {
  const file = url.split('/').pop() ?? '';
  return file.split('.')[0] ?? '';
}

function signQuery(params: Record<string, string>, mixin: string): string {
  const withTime: Record<string, string> = {
    ...params,
    wts: String(Math.floor(Date.now() / 1000)),
  };
  const cleaned: Record<string, string> = {};
  for (const [key, value] of Object.entries(withTime)) {
    cleaned[key] = value.replace(/[!'()*]/g, '');
  }
  const query = Object.keys(cleaned)
    .sort()
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(cleaned[key] ?? '')}`)
    .join('&');
  const wrid = md5(query + mixin);
  return `${query}&w_rid=${wrid}`;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Referer: 'https://search.bilibili.com',
      Origin: 'https://search.bilibili.com',
    },
  });
  if (!response.ok) {
    throw new Error(`Bilibili request failed (${response.status})`);
  }
  return (await response.json()) as T;
}

async function getMixin(): Promise<string> {
  const now = Date.now();
  if (cachedMixin && cachedMixin.until > now) return cachedMixin.key;
  const nav = await fetchJson<NavResponse>('https://api.bilibili.com/x/web-interface/nav');
  const img = keyFromUrl(nav.data?.wbi_img?.img_url ?? '');
  const sub = keyFromUrl(nav.data?.wbi_img?.sub_url ?? '');
  if (!img || !sub) throw new Error('Bilibili WBI keys missing');
  const key = mixinKey(img + sub);
  cachedMixin = { key, until: now + 10 * 60 * 1000 };
  return key;
}

function parseTags(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/[,，]/)
    .map((tag) => tag.replace(/<[^>]+>/g, '').trim())
    .filter((tag) => tag.length > 0);
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, '').trim();
}

export async function searchVideos(keyword: string): Promise<HarvestedVideo[]> {
  const mixin = await getMixin();
  const query = signQuery(
    {
      keyword,
      search_type: 'video',
      page: '1',
      page_size: '20',
      order: 'click',
    },
    mixin,
  );
  const payload = await fetchJson<SearchResponse>(
    `https://api.bilibili.com/x/web-interface/wbi/search/type?${query}`,
  );
  const items = payload.data?.result ?? [];
  const videos: HarvestedVideo[] = [];
  for (const item of items) {
    if (!item.bvid || (item.type && item.type !== 'video')) continue;
    const tags = parseTags(item.tag);
    if (tags.length === 0) continue;
    videos.push({
      bvid: item.bvid,
      title: stripHtml(item.title ?? ''),
      tags,
      plays: typeof item.play === 'number' ? item.play : 0,
    });
  }
  return videos.slice(0, 12);
}

export async function suggestTerms(keyword: string): Promise<string[]> {
  const payload = await fetchJson<SuggestResponse>(
    `https://s.search.bilibili.com/main/suggest?term=${encodeURIComponent(keyword)}`,
  );
  return (payload.result?.tag ?? [])
    .map((row) => row.value ?? row.term ?? '')
    .map((term) => term.trim())
    .filter((term) => term.length > 0 && term.length <= 12)
    .slice(0, 6);
}

export async function harvestPopular(seeds: string[]): Promise<HarvestResult> {
  const videos: HarvestedVideo[] = [];
  const suggestions: string[] = [];
  const seenVideos = new Set<string>();
  const seenSuggest = new Set<string>();

  for (const seed of seeds) {
    const [found, extra] = await Promise.all([searchVideos(seed), suggestTerms(seed)]);
    for (const video of found) {
      if (seenVideos.has(video.bvid)) continue;
      seenVideos.add(video.bvid);
      videos.push(video);
    }
    for (const term of extra) {
      if (seenSuggest.has(term)) continue;
      seenSuggest.add(term);
      suggestions.push(term);
    }
  }

  return { videos, suggestions };
}
